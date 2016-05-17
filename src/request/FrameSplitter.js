'use strict';

const Transform = require("stream").Transform;

const BufferContainer = require("../utils/BufferContainer");
const FRAMESEQUENCE = require("../config/configuration").SEQUENCES.frame;

// Reads raw chunks that come from net server socket
// splits the chunks into packets

class FrameSplitter extends Transform {
    constructor() {
        console.log("FrameSplitter.constructor");
        super({});
        this.container = new BufferContainer([]);
    }

    _transform(chunk, encoding, next) {
        // console.log("FrameSplitter chunk", chunk);
        this.container.push(chunk);

        let containers = this.container.splitOnSequence(FRAMESEQUENCE);
        if( containers.length > 1 ) {
            // console.log("FrameSplitter SEQUENCE found!", containers.length, containers.map(c => c.length()), this.container.length());

            // set container to last piece
            this.container = containers.pop();

            for( let i = 0; i < containers.length; i++ ) {
                let buffer = containers[i].concat();

                // console.log("first and last of buffer", BufferContainer.firstAndLastBytes(buffer));

                // const b = new BufferContainer([ buffer ]);
                // const indexes = b.indexesOfSequence(FRAMESEQUENCE);
                // if( indexes.length > 0 ) {

                //     console.log("Split length", indexes.length);
                //     indexes.forEach((index) => {
                //         console.log("Bytes near", index, BufferContainer.bytesNear(buffer, index));
                //     });
                //     throw new Error("packet contains endframe sequence");
                // }


                // push concatenated buffers as packets
                this.push( buffer );
            }
        }

        next();
    }
}

module.exports = FrameSplitter;