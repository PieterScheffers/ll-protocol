'use strict';

const Transform = require('stream').Transform;

const BufferContainer = require('../utils/BufferContainer');

const HEADERSEQUENCE = require("../config/configuration").SEQUENCES.header;

// TODO: Handle missing chunks?

class UnknownMessage extends Transform {
    constructor(header) {
        super({ writableObjectMode: true });
        this.header = header;

        this._count = 0;
        this._offset = 0;

        this.container = new BufferContainer([]);

        // cleanup attributes on end
        this.once('end', () => {

            // do cleanup
            this.header = null;
            this._count = null;
            this.container = null;

        });

        // cleanup header after it has been emitted
        // this.once("header", () => {
        //     // this.header = null;
        // });
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
                let containers = this.container.splitOnSequence(HEADERSEQUENCE);

                if( containers.length > 1 ) {
                    if( containers.length > 2 ) throw new Error("Only one header seperator should be present in packet");

                    // remove container to store packets
                    this.container = null;
                    this._offset = null;

                    // parse header
                    Object.assign( this.header, JSON.parse(containers.shift().toString()) );

                    // emit header event
                    this.emit("header", this.header);

                    // push remaining packets
                    let buffers = containers.pop().slice().buffers;

                    for( let i = 0; i < buffers.length; i++ ) {
                        this.push(buffers[i]);
                    }
                } else {
                    this._offset = this.container.length() - HEADERSEQUENCE.length;
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

    _flush(next) {
        next();
    }

    hasAllPackets() {
        return (this.header && typeof this.header.packetLength !== 'undefined' && this.header.packetLength >= this._count );
    }
}

module.exports = UnknownMessage;
