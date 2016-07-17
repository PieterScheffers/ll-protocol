'use strict';

const Transform = require("stream").Transform;

const BufferContainer = require("../utils/BufferContainer");
const FRAMESEQUENCE = require("../config/configuration").SEQUENCES.frame;

// Reads raw chunks that come from net server socket
// splits the chunks into packets

class FrameSplitter extends Transform {
    constructor() {
        super({});
        this._offset = 0;
        this.container = new BufferContainer([]);
    }

    _transform(chunk, encoding, next) {
        this.container.push(chunk);

        let containers = this.container.splitOnSequence(FRAMESEQUENCE, this._offset);
        if( containers.length > 1 ) {

            // set container to last piece
            this.container = containers.pop();
            this._offset = 0;

            for( let i = 0; i < containers.length; i++ ) {
                let buffer = containers[i].concat();

                // push concatenated buffers as packets
                this.push( buffer );
            }
        } else {
            this._offset = this.container.length() - FRAMESEQUENCE.length;
        }

        next();
    }
}

module.exports = FrameSplitter;
