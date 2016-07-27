'use strict';

const Writable = require('stream').Writable;

class BufferedRequest extends Writable {
    constructor(headers) {
        super();
        this.headers = headers;

        this._buffer = Buffer.from([]);

        this.once('finish', () => {
            this.emit( 'complete', this.getData() );
        });
    }

    _write(chunk, encoding, next) {
        this.buffer(chunk, encoding, next);
    }

    buffer(chunk, encoding, next) {
        this._buffer = Buffer.concat([ this._buffer, chunk ]);
        next();
    }

    getData() {
        return this._buffer;
    }

    isStreaming() {
        return false;
    }
}

module.exports = BufferedRequest;
