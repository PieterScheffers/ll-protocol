'use strict';

const Transform = require('stream').Transform;

// PassThrough implementation
class Request extends Transform {
    constructor(headers) {
        console.log("Request.constructor");
        super({});
        this.headers = headers;
    }

    _transform(chunk, encoding, next) {
        // console.log("Request chunk", chunk);
        // just push chunk through
        this.push(chunk);

        next();
    }
}

module.exports = Request;