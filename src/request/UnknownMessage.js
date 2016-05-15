'use strict';

const Transform = require('stream').Transform;

const BufferContainer = require('../utils/BufferContainer');

const SEQUENCE = require("../config/configuration").SEQUENCES.header;

class UnknownMessage extends Transform {
    constructor(header) {
        super({ writableObjectMode: true });
        this.header = header;

        this._count = 0;

        this.container = new BufferContainer([]);
        
        // this._missingIndexes = {};
        // this._lastIndex = -1;
        // this._buffers = [];
        
        // cleanup attributes on end
        const onEnd = function() {
            this.removeListener('end', onEnd);

            // do cleanup
            this.header = null;
            this._count = null;
            this.container = null;

            // for (var i = 0; i < this._events.length; i++) {
            //     this.removeAllListeners(Object.keys(this._events[i]));
            // }
        }.bind(this);

        this.on('end', onEnd);


        // cleanup header after it has been emitted
        const onHeader = function() {
            this.removeListener('header', onHeader);

            this.header = null;
        }.bind(this);

        this.on("header", onHeader);
    }

    _transform(packetInfo, encoding, next) {
        this._count += 1;

        // write total packet length
        if( packetInfo.end ) {
            this.header.packetLength = packetInfo.index + 1;
        }

        if( this.container ) {
            this.container.push(packetInfo.packet);

            if( !this.header.type ) {
                let containers = this.container.splitOnSequence(SEQUENCE);

                if( containers.length > 1 ) {
                    if( containers.length > 2 ) throw new Error("Only one header seperator should be present in packet");

                    // remove container to store packets
                    this.container = null;

                    // parse header
                    Object.assign( this.header, JSON.parse(containers.shift().toString()) );

                    // emit header event
                    this.emit("header", this.header);

                    // push remaining packets
                    let buffers = containers.pop().slice().buffers;

                    for( let i = 0; i < buffers.length; i++ ) {
                        this.push(buffers[i]);
                    }
                }
            }
        } else {
            this.push(packetInfo.packet);
        }       

        // check stream is done
        if( this.hasAllPackets() ) {
            this.end();
        }

        next();
    }

    hasAllPackets() {
        return (this.header.packetLength && this.header.packetLength >= this._count );
    }

    // emulate static class variable
    // static get sequence() { return SEQUENCE; }
    // static set sequence(sequence) { SEQUENCE = sequence; }
}

module.exports = UnknownMessage;