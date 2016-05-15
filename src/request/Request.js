'use strict';

const Transform = require('stream').Transform;

// PassThrough implementation
class Request extends Transform {
    constructor(header) {
        super({});
        this.header = header;
    }

    _transform(chunk, encoding, next) {
        // just push chunk through
        this.push(chunk);

        next();
    }
}

module.exports = Request;