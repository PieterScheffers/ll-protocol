'use strict';

const Writable = require('stream').Writable;
// const _ = require("lodash");

const Request = require('./Request');

// const SYSTEMEVENTS = require("../config/constants").SYTEMEVENTS;

// gets messages from packetsorter
// and listens to the 'header' event on the unknownpacket
// if there are subscribers for the event,
// create a packet handler
// and emit the event with the packet handler as argument

class MessageRecognizer extends Writable {
    constructor(requestTypes = new Map()) {
        super({ objectMode: true });

        this._requestTypes = requestTypes;
    }

    _write(message, encoding, next) {
        const _this = this;

        const onHeader = function(header) {
            message.removeListener('header', onHeader);

            // if( _this.eventHasBeenSubcribedTo(header.type) ) {
                // check there is a a special handler for the stream type
                let requestPacket = _this._requestTypes.has(header.type) ? new _this._requestTypes.get(header.type)(header) : new Request(header);

                this.emit("message", header.type, requestPacket);
                //this.emit(header.type, requestPacket);

                message.pipe(requestPacket);
            // } else {
            //     // put stream in flowing mode, discarding packets
            //     message.resume();
            // }
        };

        message.on("header", onHeader);

        const onEnd = function() {
            message.removeListener('end', onEnd);
            message = null;
        };

        message.on("end", onEnd);

        next();
    }

    // eventHasBeenSubcribedTo(event) {
    //     return ( this.eventNames().indexOf(event) > -1 );
    // }

    // /**
    //  * @return {array} Returns an array of subscribed events
    //  */
    // allEventNames() {
    //     return Object.keys(this._events);
    // }

    // /**
    //  * @return {array} Returns an array of subscribed events, that are not system events
    //  */
    // eventNames() {
    //     return _.remove(this.allEventNames(), (event) => {
    //         return SYTEMEVENTS.indexOf(event) > -1;
    //     });
    // }
}

module.exports = MessageRecognizer;