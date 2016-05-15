'use strict';

const Transform = require("stream").Transform;
const SEQUENCE = require("../config/configuration").SEQUENCES.frame;
const FRAMELENGTH = require("../config/configuration").FRAME.length;
const FrameHeader = require("../utils/FrameHeader");

const IDS = new Set();

class MessageSplitter extends Transform {
    constructor() {
        super();

        this._buffers = [];
        this._immediate = null;
        this._index = 0;
        this._id = MessageSplitter.randomId();
        this._ended = false;
        this._endSend = false;

        
        let onEnd = function() {
            this.removeListener('end', onEnd);

            this._ended = true;           
        };

        this.on("end", onEnd);
    }

    _transform(chunk, encoding, next) {
        if( encoding !== 'buffer' ) {
            this.sliceBuffer(Buffer.from(chunk, encoding));
        } else {
            this.sliceBuffer(chunk);
        }

        // start sending chunks
        this.sentChunk();

        next();
    }

    _flush(next) {
        // add a zero length buffer to end
        if( this._buffers.length <= 0 && !this._endSend ) this._buffers.push(Buffer.from(''));
        this._ended = true;

        this.sentChunks();

        next();
    }

    sentChunks() {
        if( this._buffers.length ) {
            this._index += 1;

            let buffer = this._buffers.shift();
            let isEnd = ( this._ended && this._buffers.length <= 0 );
            this.push( this.labelChunk(buffer, isEnd) );

            if( isEnd ) this.endSend = true;
        }

        if( this._buffers.length && this._immediate === null ) {
            this._immediate = setImmediate(() => {
                this.sentChunk();
                this._immediate = null;
            });
        }

        if( this._ended && this._endSend && this._buffers.length <= 0 ) {
            // remove id from Set when done        
            IDS.delete(this._id);
        }
    }

    labelChunk(buffer, isEnd = false) {
        let header = new FrameHeader({ id: this._id, index: this._index, end: isEnd }).toBuffer();
        let ending = Buffer.from(SEQUENCE);

        return Buffer.concat([ header, buffer, ending ]);
    }

    sliceBuffer(buffer) {

        for( let offset = 0; offset < buffer.length; offset += FRAMELENGTH ) {
            let slice = (offset + FRAMELENGTH > buffer.length) ? buffer.slice(offset) : buffer.slice(offset, offset + FRAMELENGTH);
            this._buffers.push(slice);
        }

    }

    static randomId() {
        let size = IDS.size;

        let id = MessageSplitter.generateId();
        IDS.add(id);

        // if size off Set is the same, the Id was already present
        if( size === IDS.size ) {
            return MessageSplitter.randomId();
        }

        return id;
    }

    static generateId() {
        // 4 bytes (unsigned INT)
        return Math.floor( (Math.random() * 4294967295) );
    }
}

module.exports = MessageSplitter;