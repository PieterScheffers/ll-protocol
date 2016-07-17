'use strict';

const Transform = require('stream').Transform;

let size = 0;
// PassThrough implementation
class Request extends Transform {
    constructor(headers) {
        super({});
        this.headers = headers;
    }

    _transform(chunk, encoding, next) {
        // just push chunk through
        this.push(chunk);

        // size += chunk.length;
        // console.log("Request size", size);

        next();
    }

    _flush(next) {
        next();
    }

    isStreaming() {
        return true;
    }
}

module.exports = Request;
