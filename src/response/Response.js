'use strict';

const Transform = require("stream").Transform;
const HEADERSEQUENCE = require("../config/configuration").SEQUENCES.header;

const HEADERSEQUENCEBUFFER = Buffer.from(HEADERSEQUENCE);

class Response extends Transform {
    constructor(headers, contents) {
        super();
        this._headersSent = false;

        this.headers = (typeof headers === 'string') ? { event: headers } : headers;
        if( !this.headers.event ) throw new Error("Event must be set on a new Response");

        if( contents ) {
            this.sendHeaders();
            this.end(contents);
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
            let json = JSON.stringify(this.headers);
            let buffer = Buffer.from( json );
            this.push(buffer);
            this.push( HEADERSEQUENCEBUFFER );
            this._headersSent = true;
        }
    }

}

module.exports = Response;
