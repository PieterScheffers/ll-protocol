'use strict';

const Transform = require('stream').Transform;

// PassThrough implementation
class Request extends Transform {
    constructor(headers) {
        super({});
        this.headers = headers;
    }

    _transform(chunk, encoding, next) {
        // just push chunk through
        this.push(chunk);

        next();
    }

    _flush(next) {
        next();
    }

    getData() {
        throw new Error("Request is streaming, so you can only access the data by streaming.");
    }

    isStreaming() {
        return true;
    }
}

module.exports = Request;
