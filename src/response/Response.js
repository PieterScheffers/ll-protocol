'use strict';

const Transform = require("stream").Transform;
const HEADERSEQUENCE = require("../config/configuration").SEQUENCES.header;

class Response extends Transform {
    constructor(header, contents) {
        super();
        this._headersSent = false;

        this.header = (typeof header === 'string') ? { type: header } : header;
        if( !this.header.type ) throw new Error("Type must be set on a new Response");

        if( contents ) {
            this.sendHeaders();
            this.push(contents);
            this.end();
        }
    }

    _transform(chunk, encoding, next) {
        this.sendHeaders();

        this.push(chunk);

        next();
    }

    sendHeaders() {
        // headers should always be sent first, and only one time
        if( !this._headersSent ) {
            let json = JSON.stringify(this.header);
            let buffer = Buffer.from( json );
            this.push(buffer);
            this.push( Buffer.from(HEADERSEQUENCE) );
            this._headersSent = true;
        }
    }

}

module.exports = Response;
