'use strict';

const EventEmitter = require('events');
const Duplex = require("stream").Duplex;

const _ = { remove: require("lodash.remove") };

// config
const config = require("./config/configuration");
const CONSTANTS = require("./config/constants");

// request
const FrameSplitter = require("./request/FrameSplitter");
const PacketSorter = require("./request/PacketSorter");
const MessageRecognizer = require("./request/MessageRecognizer");

// response
const MessageSplitter = require("./response/MessageSplitter");
const Response = require("./response/Response");

class LLProtocol extends EventEmitter {
    constructor(socket) {
        super();

        if( !(socket instanceof Duplex) ) throw new Error("Socket should be an instance of a Duplex stream");

        this._socket = socket;               // the server or client socket instance
        this._readers = new Map();           // requestTypes mapped to an event
        this._messageRecognizer = null;      // messageRecognizer instance
        this._currentResponses = new Set();  // responses that are being piped to the socket

        // start listening for messages
        this._setupListening();
        this._setupCleanup();
    }

    set socket(socket) { throw new Error("Socket can't be changed!"); }
    get socket() { return this._socket; }

    /**
     * Set special readers for some message types
     * @param {string}             key     Message type
     * @param {Transform/Writable} reader  Class which is an instanceof Transform stream
     */
    setReader(key, reader) {
        if( key instanceof Map ) {
            key.forEach((reader, key) => {
                this.setReader(key, reader);
            });
            return;
        }

        this._readers.set(key, reader);
    }

    makeResponse(header, content) {
        const response = new Response(header, content);

        this.send(response);

        return response;
    }

    send(response) {
        if( !(response instanceof Response) ) throw new Error("response should be an instanceof LLProtocol.Response");

        // check response has already been send
        if( !this._currentResponses.has(response) ) {

            this._currentResponses.add(response);

            // add finish handler to remove response from currentResponses Set
            response.once("finish", () => {
                this._currentResponses.delete(response);
            });

            // pipe response to socket
            response
                .pipe(new MessageSplitter())
                .pipe(this._socket, { end: false }); // end: false, otherwise the socket is closed when done writing
        }
    }

    _setupListening() {
        this._messageRecognizer = new MessageRecognizer(this._readers);

        this._messageRecognizer.on("message", (type, reader) => {

            const subscribed = [ type, 'catchAll' ]
                .map((event) => { return this.eventHasBeenSubcribedTo(event); })
                .reduce((result, bool) => { return result || bool; }, false);

            if( subscribed ) {

                this.emit(type, reader);
                this.emit('catchAll', reader, type);

            } else {
                // let reader discard chunks
                reader.resume();
            }

        });

        this._socket
            .pipe(new FrameSplitter())      // split frames into packets
            .pipe(new PacketSorter())       // sort packets into messages
            .pipe(this._messageRecognizer); // check type of message
    }

    _setupCleanup() {
        const _this = this;

        let cleanup = function() {
            _this._messageRecognizer.removeAllListeners('message');
            // _this._messageRecognizer.resume();
        };

        this._socket.once("error", cleanup);
        this._socket.once("close", cleanup);
    }

    /**
     * Returns if the non-system event has been subscribed to
     * @param  {string} event Message type
     * @return {bool}         Check there is something subscribed to it
     */
    eventHasBeenSubcribedTo(event) {
        return ( this.eventNames().indexOf(event) > -1 );
    }

    /**
     * @return {array} Returns an array of subscribed events
     */
    allEventNames() {
        return Object.keys(this._events);
    }

    /**
     * @return {array} Returns an array of subscribed events, that are not system events
     */
    eventNames() {
        return _.remove(this.allEventNames(), (event) => {
            return CONSTANTS.SYTEMEVENTS.indexOf(event) === -1;
        });
    }
}

LLProtocol.Response = Response;
LLProtocol.config = config;
LLProtocol.request = {
    Request: require("./request_types/Request"),
    StringRequest: require("./request_types/StringRequest"),
    JsonRequest: require("./request_types/JsonRequest")
};

module.exports = LLProtocol;
