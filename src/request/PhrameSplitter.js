'use strict';

const Writable = require("stream").Writable;
const Request = require("../request_types/Request");
const BufferedRequest = require("../request_types/BufferedRequest");
const StringDecoder = require('string_decoder').StringDecoder;

const BYTESSTREAK = require("../config/configuration").BYTESSTREAK;
const UNIQUESEQUENCEBYTES = require("../config/configuration").UNIQUESEQUENCEBYTES;
const FIRSTBYTESEQUENCEMAP = require("../config/configuration").FIRSTBYTEMAP;
const SEQUENCES = require("../config/configuration").SEQUENCES;

const findSequences = require("../utils/bufferhelpers").findSequences;
const findSequenceOverlapping = require("../utils/bufferhelpers").findSequenceOverlapping;
const findPossible = require("../utils/bufferhelpers").findPossible;
const getHeadersBetweenFrames = require("../utils/bufferhelpers").getHeadersBetweenFrames;
const FrameHeader = require("../utils/FrameHeader");

// Reads raw chunks that come from net server socket
// split the chunks into chunks into packets
// and also find header ends that don't are on multiple packets

// - Only Loop through the buffer 1 time
// - Dont loop through all bytes, just once every 10 bytes
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

        const frames = this.getFrames(chunk, possible);

        this.getMessages(frames);

        next();
    }

    /**
     * Get frames in a chunk
     * @param  Buffer  chunk     Buffer object
     * @param  Array   possible  Array of possible sequence indexes
     * @return Array             Array of wrapped frames
     */
    getFrames(chunk, possible) {
        const sequences = findSequences(chunk, possible);
        const endFrames = sequences
            .filter(s => s && s.sequence === SEQUENCES.frame)
            .sort((a, b) => a.begin.index - b.begin.index);
        const endHeaders = sequences.filter(s => s && s.sequence === SEQUENCES.header);

        const frames = [];

        if( endFrames.length ) {

            const firstSequence = endFrames[0];
            let firstSlice = chunk.slice(0, firstSequence.begin.index);

            // if there is a lastSlice, it is possible a sequence is overlapping multiple chunks
            if( this.lastSlice ) {

                // find if there is a sequence on the overlap
                const seqOverlap = findSequenceOverlapping(firstSlice, this.lastSlice);
                // if the overlap is a frame sequence
                if( seqOverlap !== null && seqOverlap.sequence === SEQUENCES.frame ) {

                    // if begin of sequence is on the lastSlice
                    if( seqOverlap.begin.chunk === this.lastSlice ) {
                        this.pushFrames(
                            frames,
                            this.lastSlice.slice(0, seqOverlap.begin.index),
                            { end: { index: 0, chunk: this.lastSlice } },
                            seqOverlap
                        );
                    } else {
                        this.pushFrames(
                            frames,
                            Buffer.concat([this.lastSlice, firstSlice.slice(0, seqOverlap.begin.index) ]),
                            { end: { index: 0, chunk: this.lastSlice } },
                            seqOverlap
                        );
                    }

                    // push the rest of the firstSlice
                    this.pushFrames(
                        frames,
                        firstSlice.slice(seqOverlap.end.index),
                        seqOverlap,
                        { begin: { index: this.firstSlice.length, chunk: this.firstSlice } }
                    );

                } else {
                    const frame = { frame: Buffer.concat([ this.lastSlice.frame, firstSlice ]), sequences: [] };
                    frames.push(frame);

                    if( seqOverlap !== null && seqOverlap.sequence === SEQUENCES.header ) {
                        // rewrite sequence indexes
                        seqOverlap.end.index += this.lastSlice.length;
                        seqOverlap.end.chunk = frame;
                        seqOverlap.begin.chunk = frame;

                        frame.sequences.push( seqOverlap );
                    }
                }

            } else {
                frames.push({ frame: firstSlice, sequences: getHeadersBetweenFrames(firstSlice, endHeaders, { end: { index: 0 } }, firstSequence) });
            }

            if( endFrames.length > 1 ) {

                let lastEndFrame = null;

                for( let i = 0; i < endFrames.length; i++ ) {
                    if( lastEndFrame !== null ) {
                        const frame = chunk.slice(lastEndFrame.end.index, endFrames[i].begin.index);
                        frames.push({
                            frame,
                            sequences: getHeadersBetweenFrames(frame, endHeaders, lastEndFrame, endFrames[i])
                        });
                    }

                    lastEndFrame = endFrames[i];
                }

            }

            const lastEndFrame = endFrames[ endFrames.length - 1 ];

            this.lastSlice = {
                frame: chunk.slice(lastEndFrame.end.index),
                sequences: endHeaders.filter( this.isHeaderInSlice(lastEndFrame, { begin: { index: chunk.length } }) )
            };

        } else {
            const seqOverlap = findSequenceOverlapping(chunk, this.lastSlice);

            if( seqOverlap === null ) {
                this.lastSlice = { frame: this.lastSlice ? Buffer.concat([ this.lastSlice.frame, chunk ]) : chunk };
            } else {
                console.error("UNHANDLED: Found overlap sequence between this.lastSlice and the whole chunk");
            }
        }

        return frames;
    }

    pushFrame(frames, frame, frameBeginSeq, frameEndSeq) {
        frames.push({
            frame,
            sequences: getHeadersBetweenFrames(frame, frameBeginSeq, frameEndSeq)
        });

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
     * Parse a frame header
     * @param  {[type]} frames [description]
     * @return {[type]}        [description]
     */
    parseFrames(frames) {
        return frames.map(f => {
            // rewrite sequence indexes
            const sequences = f.sequences;
            const buffer = FrameHeader.removeHeader(f.frame);

            sequences.forEach(s => {
                s.begin.index -= FrameHeader.headerLength();
                s.begin.chunk = buffer;
                s.end.index -= FrameHeader.headerLength();
                s.end.chunk = buffer;
            });

            return { info: FrameHeader.parseBuffer(f.frame).toObject(), buffer, sequences: f.sequences };
        });
    }

    /**
     * Parse a frame header and pass frame to a request
     * @param  Array  frames  Array of wrapped frames
     * @return {[type]}        [description]
     */
    getMessages(frames) {
        // parse frames and select messsage for each frame
        const parsedFrames = this.parseFrames(frames);

        parsedFrames.forEach((f) => {

            const hasMessage = this.messages.has(f.info.id);
            let message = null;

            // get message
            if( !hasMessage ) {
                message = { buffers: [] };
                this.messages.set(f.info.id, message);
            } else {
                message = this.messages.get(f.info.id);
            }

            if( (message instanceof Request) || (message instanceof BufferedRequest) ) {
                if( message.write(f.buffer) === false ) {
                    // console.error("UNHANDLED: Message highwatermark reached, must stop writing to it");
                }

                // if last frame of message, end the message
                if( f.info.end ) message.end();
            } else {
                message = this.findHeader(message, f);

                if( (message instanceof Request) || (message instanceof BufferedRequest) ) {
                    // replace message in messages Map
                    this.messages.set(f.info.id, message);

                    // check if message is a streaming type,
                    // if not wait for the message to complete
                    if( typeof message.isStreaming === 'function' && !message.isStreaming() ) {

                        message.once("complete", (content) => {
                            this.emit("message", message.headers.event, content);
                        });

                    } else {

                        this.emit("message", message.headers.event, message);
                    }
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
            const sequence = f.sequences.shift();
            const headerSlice = f.buffer.slice(0, sequence.begin.index);
            const bodySlice = f.buffer.slice(sequence.end.index);

            // build headers
            buffers.push(headerSlice);
            const headers = this.buildHeaders(buffers);

            const request = this.makeRequest(headers);

            // put first piece of body into the stream internal buffer
            if( request.write(bodySlice) === false ) {
                // console.error("UNHANDLED: Message highwatermark reached, must stop writing to it");
            }

            return request;
        }

        // if sequence is on the overlap between 2 frames
        const lastFrame = buffers.length ? buffers[ buffers.length - 1 ] : null;
        const sequence = findSequenceOverlapping(f.buffer, lastFrame);

        if( sequence !== null ) {
            // if begin of sequence is on the lastSlice
            if( sequence.begin.chunk === lastFrame ) {
                buffers.push( lastFrame.slice(0, sequence.begin.index) );
            } else {
                buffers.push( lastFrame );
                buffers.push( f.buffer.slice(0, sequence.begin.index) );
            }

            const headers = this.buildHeaders(buffers);
            const request = this.makeRequest(headers);

            // put first piece of body into the stream internal buffer
            if( request.write( f.buffer.slice(sequence.end.index) ) === false ) {
                // console.error("UNHANDLED: Message highwatermark reached, must stop writing to it");
            }

            return request;
        }

        // else just push the frame onto the buffers array
        message.buffers.push(f.buffer);

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
        return this._requestTypes.has(headers.event) ? new (this._requestTypes.get(headers.event))(headers) : new Request(headers);
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
