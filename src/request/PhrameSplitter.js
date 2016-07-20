'use strict';

const Writable = require("stream").Writable;

const BYTESSTREAK = require("../config/configuration").BYTESSTREAK;
const UNIQUESEQUENCEBYTES = require("../config/configuration").UNIQUESEQUENCEBYTES;
const FIRSTBYTESEQUENCEMAP = require("../config/configuration").FIRSTBYTEMAP;
const SEQUENCES = require("../config/configuration").SEQUENCES;

const findSequence = require("../utils/bufferhelpers").findSequence;
const findSequenceOverlapping = require("../utils/bufferhelpers").findSequenceOverlapping;

const FrameHeader = require("../utils/FrameHeader");

// Reads raw chunks that come from net server socket
// split the chunks into chunks into packets
// and also find header ends that don't are on multiple packets

// - Only Loop throught the buffer 1 time
// - Dont loop throught all bytes, just once every 10 bytes
// - Find both frame and header sequences, then keep header sequences in memory till needed
// - Loop through buffer, then find sequence overlapping 2 buffers

class PhrameSplitter extends Writable {
    constructor(requestTypes = new Map()) {
        super();

        this.lastSlice = null;
        this.messages = new Map();

        this._requestTypes = requestTypes;
    }

    _write(chunk, encoding, next) {
        const possible = findPossible(chunk);
        console.log("possible", possible);

        const frames = this.getFrames(chunk, possible);
        console.log("frames", frames.length, frames);

        // this.parseFrames(frames);

        next();
    }

    /**
     * Get frames in a chunk
     * @param  Buffer  chunk     Buffer object
     * @param  Array   possible  Array of possible sequence indexes
     * @return Array             Array of wrapped frames
     */
    getFrames(chunk, possible) {
        const sequences = possible.map(p => findSequence(chunk, p));
        const endFrames = sequences
            .filter(s => s && s.sequence === SEQUENCES.frame)
            .sort((a, b) => a.begin.index - b.begin.index);
        const endHeaders = sequences.filter(s => s && s.sequences === SEQUENCES.header);

        console.log("sequences", sequences.length);

        const frames = [];

        if( endFrames.length ) {
            console.log("endHeaderslength", endHeaders.length);
            console.log("endFrameslength", endFrames.length);

            const firstSequence = endFrames[0];
            let firstSlice = chunk.slice(0, firstSequence.end.index);

            // if there is a lastSlice, it is possible a sequence is overlapping multiple chunks
            if( this.lastSlice ) {

                // find if there is a sequence on the overlap
                const seqOverlap = findSequenceOverlapping(firstSlice, this.lastSlice);
                // if the overlap is a frame sequence
                if( seqOverlap !== null && seqOverlap.sequence === SEQUENCES.frame ) {

                    // if begin of sequence is on the lastSlice
                    if( seqOverlap.begin.chunk === this.lastSlice ) {
                        frames.push({ frame: this.lastSlice.slice(0, seqOverlap.begin.index) });
                    } else {
                        frames.push({ frame: Buffer.concat([this.lastSlice, firstSlice.slice(0, seqOverlap.begin.index) ]) });
                    }

                    // push the rest of the firstSlice
                    frames.push({ frame: firstSlice.slice(seqOverlap.end.index) });

                } else {
                    const frame = { frame: Buffer.concat([ this.lastSlice, firstSlice ]), sequences: [] };
                    frames.push(frame);

                    if( seqOverlap.sequence === SEQUENCES.header ) {
                        // rewrite sequence indexes
                        seqOverlap.end.index += this.lastSlice.length;

                        frame.sequences.push(seqOverlap);
                    }
                }

            } else {
                frames.push({ frame: firstSlice });
            }

            if( endFrames.length > 1 ) {

                let lastEndFrame = null;

                for( let i = 0; i < endFrames.length; i++ ) {
                    if( lastEndFrame !== null ) {
                        const frameHeaders = endHeaders
                            .filter( this.isHeaderInSlice(lastEndFrame, endFrames[i]) )
                            .map(h => this.rewriteSequenceIndexes(h, lastEndFrame, endFrames[i]));

                        frames.push({ frame: chunk.slice(lastEndFrame.end.index, endFrames[i].begin.index), sequences: frameHeaders });
                        lastEndFrame = endFrame[i];
                    }
                }

            }

            this.lastSlice = {
                frame: chunk.slice(endFrames[ endFrames.length - 1 ].end.index),
                sequences: endHeaders.filter( this.isHeaderInSlice(endFrames, { begin: { index: chunk.length } }) )
            };

        } else {
            const seqOverlap = findSequenceOverlapping(chunk, this.lastSlice);

            if( seqOverlap === null ) {
                this.lastSlice = { frame: this.lastSlice ? Buffer.concat([ this.lastSlice, chunk ]) : chunk };
            } else {
                console.error("UNHANDLED: Found overlap sequence between this.lastSlice and the whole chunk");
            }
        }

        return frames;
    }

    /**
     * When a slice is being taken from a chunk, the indexes of a sequence are wrong
     * This function rewrites them
     * @param  Object  header     Header sequence object
     * @param  Object  frameBegin Frame sequence object before slice
     * @return Object             Header sequence object (indexes rewritten)
     */
    rewriteSequenceIndexes(header, frameBegin) {
        const beginSliceIndex = frameBegin.end.index;

        header.begin.index -= beginSliceIndex;
        header.end.index -= beginSliceIndex;

        return header;
    }

    /**
     * Parse a frame header and pass frame to a request
     * @param  Array  frames  Array of wrapped frames
     * @return {[type]}        [description]
     */
    parseFrames(frames) {
        frames.forEach((f) => {
            const frame = f.frame;
            const frameInfo = FrameHeader.parseBuffer(frame).toObject();
            const buffer = FrameHeader.removeHeader(frame);

            console.log("frameInfo", frameInfo);
            console.log("buffer tostring", buffer.toString())
            console.log("sequences length", f.sequences.length)

            const hasMessage = this.messages.has(frameInfo.id);
            let message = null;

            // get message
            if( !hasMessage ) {
                message = { buffers: [] };
                this.messages.set(frameInfo.id, message);
            } else {
                message = this.messages.get(frameInfo.id);
            }

            console.log("message", message);
            if( message instanceof Request ) {
                if( message.write(buffer) === false ) {
                    console.error("UNHANDLED: Message highwatermark reached, must stop writing to it");
                }
            } else {
                message = this.findHeader(message, f);

                if( message instanceof Request ) {
                    // replace message in messages Map
                    this.messages.set(frameInfo.id, message);

                    console.log("message");
                    this.emit("message", message.headers.event, message);
                }
            }
        });
    }

    /**
     * Find if the end of the header has been reached
     * If so, build the header and return a new Request
     * @param  Object          message  Temporary object to hold the buffers
     * @param  Object          f        Frame wrapper object
     * @return Object/Request           Temporary object to hold the buffers or a new Request when header found
     */
    findHeader(message, f) {
        const buffers = message.buffers;

        // if sequence was already found when finding frames
        if( f.sequences.length ) {
            const sequence = sequences.shift();
            const headerSlice = f.frame.slice(0, sequence.begin.index);
            const bodySlice = f.frame.slice(sequence.end.index);

            // build headers
            buffers.push(headerSlice);
            const headers = this.buildHeaders(buffers);

            const request = this.makeRequest(headers);

            // put first piece of body into the stream internal buffer
            if( request.write(bodySlice) === false ) {
                console.error("UNHANDLED: Message highwatermark reached, must stop writing to it");
            }

            return request;
        }

        // if sequence is on the overlap between 2 frames
        const lastFrame = buffers.length ? buffers[ buffers.length - 1 ] : null;
        const sequence = findSequenceOverlapping(f.frame, lastFrame);

        if( sequence !== null ) {
            // if begin of sequence is on the lastSlice
            if( sequence.begin.chunk === lastFrame ) {
                buffers.push( lastFrame.slice(0, sequence.begin.index) );
            } else {
                buffers.push( lastFrame );
                buffers.push( f.frame.slice(0, sequence.begin.index) );
            }

            const headers = this.buildHeaders(buffers);
            const request = this.makeRequest(headers);

            // put first piece of body into the stream internal buffer
            if( request.write( f.frame.slice(sequence.end.index) ) === false ) {
                console.error("UNHANDLED: Message highwatermark reached, must stop writing to it");
            }

            return request;
        }

        // else just push the frame onto the buffers array
        message.buffers.push(f.frame);

        return message;
    }

    // Build headers from buffers
    buildHeaders(buffers) {
        const decoder = new StringDecoder('utf8');
        const string = buffers.reduce((str, b) => { return str + decoder.write(b); }, "");
        return JSON.parse(string);
    }

    // Create a new Request
    makeRequest(headers) {
        return this._requestTypes.has(headers.event) ? new (this._requestTypes.get(headers.event))(header) : new Request(header);
    }

    // Find if a header sequence is between 2 frame sequences (in slice)
    // curry function - use in filter, find or findIndex
    isHeaderInSlice(endSeq, beginSeq) {
        return function(header) {
            return header.begin.index >= endSeq.end.index && header.end.index <= beginSeq.begin.index;
        };
    }
}

module.exports = PhrameSplitter;
