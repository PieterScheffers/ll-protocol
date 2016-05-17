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

// TODO: accept a class which returns a Request according to the type of the message
// In this class you could do things like regexes and stuff

class MessageRecognizer extends Writable {
    constructor(requestTypes) {
        console.log("MessageRecognizer.constructor");
        super({ objectMode: true });

        this._requestTypes = requestTypes || new Map();
    }

    _write(message, encoding, next) {
        message.once("header", (header) => {
            // console.log("MessageRecognizer header type", header.type);
            // if( _this.eventHasBeenSubcribedTo(header.type) ) {
                
                // check there is a a special handler for the stream type
                let requestPacket = this._requestTypes.has(header.type) ? new this._requestTypes.get(header.type)(header) : new Request(header);

                this.emit("message", header.type, requestPacket);
                //this.emit(header.type, requestPacket);

                message.pipe(requestPacket);

                // requestPacket.once("end", () => {
                //     console.log("MessageRecognizer requestPacket end");
                // });
            // } else {
            //     // put stream in flowing mode, discarding packets
            //     message.resume();
            // }
        });

        message.once("end", () => {
            // console.log("MessageRecognizer message end");
            message = null;
        });

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