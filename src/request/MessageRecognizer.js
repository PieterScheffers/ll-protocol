'use strict';

const Writable = require('stream').Writable;

const Request = require('../request_types/Request');

// gets messages from packetsorter
// and listens to the 'header' event on the unknownpacket
// if there are subscribers for the event,
// create a packet handler
// and emit the event with the packet handler as argument

// TODO: accept a class which returns a Request according to the type of the message
// In this class you could do things like regexes and stuff

class MessageRecognizer extends Writable {
    constructor(requestTypes) {
        super({ objectMode: true });

        this._requestTypes = requestTypes || new Map();
    }

    _write(message, encoding, next) {
        message.once("header", (header) => {

            // check there is a a special handler for the stream type
            let requestType = this._requestTypes.has(header.type) ? new this._requestTypes.get(header.type)(header) : new Request(header);

            // check if requestType is a streaming type,
            // if not wait for the message to complete
            if( typeof requestType.isStreaming === 'function' && !requestType.isStreaming() ) {

                requestType.once("complete", (content) => {
                    this.emit("message", header.type, content);
                });

            } else {

                this.emit("message", header.type, requestType);
            }

            message.pipe(requestType);
        });

        message.once("end", () => {
            message = null;
        });

        next();
    }
}

module.exports = MessageRecognizer;
