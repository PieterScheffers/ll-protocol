'use strict';

const Transform = require("stream").Transform;
const FRAMESEQUENCE = require("../config/configuration").SEQUENCES.frame;
const FrameHeader = require("../utils/FrameHeader");

const FRAMESEQUENCEBUFFER = Buffer.from(FRAMESEQUENCE);

const IDS = new Set();

class MessageSplitter extends Transform {
    constructor() {
        super();

        this._index = 0;    // current frame index
        this._id = MessageSplitter.randomId(); // random id, identifying message
    }

    _transform(chunk, encoding, next) {

        this._index += 1;

        const labeledChunk = this.labelChunk(chunk);
        this.push(labeledChunk);

        next();
    }

    _flush(next) {
        this._index += 1;

        // add a zero length buffer to end
        const labeledChunk = this.labelChunk( Buffer.from(''), true );
        this.push(labeledChunk);

        // remove id from Set when done
        IDS.delete(this._id);

        next();
    }

    labelChunk(buffer, isEnd = false) {
        let header = (new FrameHeader({ id: this._id, index: this._index, end: isEnd })).toBuffer();
        return Buffer.concat([ header, buffer, FRAMESEQUENCEBUFFER ]);
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
