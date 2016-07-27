'use strict';

const BufferedRequest = require('./BufferedRequest');
const StringDecoder = require("string_decoder").StringDecoder;

class StringRequest extends BufferedRequest {
    constructor(headers) {
        super(headers);

        this._buffer = "";
        this._decoder = new StringDecoder();
    }

    buffer(chunk, encoding, next) {
        // decode chunk and append to string
        this._buffer += this._decoder.write(chunk);

        next();
    }
}

module.exports = StringRequest;
