'use strict';

const Writable = require('stream').Writable;
const StringDecoder = require("string_decoder").StringDecoder;

class JsonRequest extends Writable {
    constructor(headers) {
        super();
        this.headers = headers;

        this._string = "";
        this._decoder = new StringDecoder();

        this.once('finish', () => {
            this.emit( 'complete', JSON.parse( this.getString() ) );
        });
    }

    _write(chunk, encoding, next) {
        // decode chunk and append to string
        this._string += this._decoder(chunk);

        next();
    }

    getString() {
        return this._string;
    }

    isStreaming() {
        return false;
    }
}

module.exports = JsonRequest;
