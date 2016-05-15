'use strict';

const Transform = require("stream").Transform;

const BufferContainer = require("../utils/BufferContainer");
const SEQUENCE = require("../config/configuration").SEQUENCES.frame;

// Reads raw chunks that come from net server socket
// splits the chunks into packets

class FrameSplitter extends Transform {
    constructor() {
        super({});
        //this.sequence = sequence; // [ 0, 1, 1, 1, 2, 3 ]
        this.container = new BufferContainer([]);
    }

    _transform(chunk, encoding, next) {
        this.container.push(chunk);

        let containers = this.container.splitOnSequence(SEQUENCE);
        if( containers.length > 1 ) {

            // set container to last piece
            this.container = containers.pop();

            for( let i = 0; i < containers.length; i++ ) {

                // push concatenated buffers as packets
                this.push( containers[i].concat() );
            }
        }

        next();
    }
}

module.exports = FrameSplitter;