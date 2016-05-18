'use strict';

const Transform = require('stream').Transform;

// PassThrough implementation
class ChunkSpacer extends Transform {
    constructor() {
        console.log("ChunkSpacer.constructor");
        super({});
    }

    _transform(chunk, encoding, next) {
        // console.log("ChunkSpacer chunk", chunk);

        let spaceBuffer = Buffer.from(" ");

        this.push( Buffer.concat([chunk, spaceBuffer]) );

        next();
    }
}

module.exports = ChunkSpacer;