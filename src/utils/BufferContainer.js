'use strict';

const StringDecoder = require("string_decoder").StringDecoder;

/**
 * Makes an array of buffers appear as one long array of bytes
 */

class BufferContainer {

    constructor(buffers, args = []) {
        this.buffers = [];
        this.start = args.start || 0;
        this.end = args.end || 999999;
        this.pointer = this.start; // current position read
        this.bytesBefore = 0; // number of bytes from buffers that are removed from bufferContainer

        if( buffers instanceof BufferContainer ) {
            buffers = buffers.buffers;
        }

        // make sure buffers is an array
        buffers = [].concat( buffers );

        // add buffers
        buffers.forEach((buffer) => {
            this.push(buffer);
        });
    }

    resetBytesBefore() {
        this.bytesBefore = 0;
    }

    /**
     * @return {int} Total length of all buffers combined
     */
    length() {
        return this.bytesBefore + this.buffers.reduce((total, buffer) => { return total + buffer.length }, 0);
    }

    // add buffer chunk at the end
    push(buffer) {
        if( !Buffer.isBuffer(buffer) ) {
            throw new Error('Buffer should be of type buffer');
        }

        this.buffers.push(buffer);
    }

    // remove first element
    shift() {
        if( this.buffers.length ) {
            this.bytesBefore += this.buffers[0].length;

            // if pointer was on first buffer, set pointer to first byte of next buffer
            if( (this.bytesBefore + this.buffers[0].length) <= this.pointer ) {
                this.pointer = this.bytesBefore;
            }

            return this.buffers.shift();
        }
        return null;
    }

    each(cb, offset = 0) {
        offset += this.bytesBefore;
        let index = this.bytesBefore;

        for( let i = 0; i < this.buffers.length; i++ ) {
            let buffer = this.buffers[i];
            let bufferLength = buffer.length;

            if( offset > (index + bufferLength) ) {

                index += bufferLength;

            } else {

                for( let j = 0; j < bufferLength; j++ ) {
                    let byte = buffer[j];

                    if( cb(byte, index) === false ) {
                        return;
                    }

                    index += 1;
                }

            }
        }

    }

    eachGenerator() {
        let _this = this;

        return function* byteGenerator() {
            for( let i = 0; i < _this.buffers.length; i++ ) {
                let buffer = _this.buffers[i];

                for (var j = 0; j < buffer.length; j++) {
                    yield buffer[j];
                }
            }
        };
    }

    reduce(cb, initial = 0, offset = 0) {
        offset += this.bytesBefore;
        let index = this.bytesBefore;

        for( let i = 0; i < this.buffers.length; i++ ) {
            let buffer = this.buffers[i];
            let bufferLength = buffer.length;

            if( offset > (index + bufferLength) ) {

                index += bufferLength;

            } else {

                for (var j = 0; j < bufferLength; j++) {
                    initial = cb(initial, buffer[j], index);

                    index += 1;
                }

            }
        }

        return initial;
    }



    indexOf(searchByte, offset = 0) {
        let foundIndex = -1;

        this.each((byte, index) => {
            if( searchByte === byte ) {
                foundIndex = index;
                return false;
            }
        }, offset);

        return foundIndex;
    }

    indexOfAll(searchByte, offset = 0) {
        return this.reduce((arr, byte, index) => {
            if( searchByte === byte ) {
                arr.push(index);
            }
            return arr;
        }, [], offset);
    }

    byteAtIndex(searchIndex) {
        let b = null;

        this.each((byte, index) => {
            if( index === searchIndex ) {
                b = byte;
                return false;
            }
        }, searchIndex - 1);

        return b;
    }

    /**
     * Start inclusive
     * End exclusive
     * 
     * @param  {Number} start [description]
     * @param  {Number} end   [description]
     * @return {[type]}       [description]
     */
    createFrom(start = 0, end = 999999) {
        let container = new BufferContainer([]);
        let startIndex = 0;
        let endIndex = 999999;
        let originalStart = null; // index of start of first selected buffer

        for( let i = 0; i < this.buffers.length; i++ ) {

            let buffer = this.buffers[i];
            let bufferLength = buffer.length;

            endIndex = startIndex + bufferLength;
            // console.log("bufferLength", bufferLength, 'startIndex', startIndex, 'endIndex', endIndex);

            if( start < endIndex && end > startIndex) { // check good
                container.push(buffer);

                // set start offset 
                if( originalStart === null ) originalStart = startIndex;

                if( startIndex < start && start < endIndex ) {
                    container.start = start - startIndex;
                }

                if( endIndex > end && end > startIndex ) {
                    // console.log(`endindex(${endIndex}) is greater than end(${end}) and end(${end}) is greater than startIndex(${startIndex})`, ":", end, originalStart, end - originalStart);
                    container.end = end - originalStart;
                }
            }

            startIndex = endIndex;
        }

        // console.log("container offsets", "start", container.start, 'end', container.end);

        return container.slice();
    }

    indexesOfSequence(sequence, offset = 0) {
        if( sequence.length <= 0 ) {
            throw new Error("Sequence should be minimal 1 byte long");
        }

        // get the indexes of all occurrences of the first byte from the sequence
        let firstIndexes = this.indexOfAll(sequence[0], offset);

        if( sequence.length > 1 ) {

            // remove firstIndexes that don't have the correct sequence pattern
            firstIndexes = firstIndexes.filter((index) => {
                for( let i = 1; i < sequence.length; i++ ) {
                    if( this.byteAtIndex(index + i) !== sequence[i] ) {
                        return false;
                    }
                }
 
                return true;
            });

        }

        return firstIndexes;
    }

    splitOnSequence(sequence, offset) {
        // get indexes of sequence
        let indexes = this.indexesOfSequence(sequence, offset);

        // console.log("indexes", sequence, indexes);

        // shortcut, if there are no indexes, return everything
        if( indexes.length <= 0 ) return [ new BufferContainer(this.buffers) ];

        let startIndex = 0;
        let endIndex = null;
        let containers = [];

        for( let i = 0; i < indexes.length; i++ ) {
            endIndex = indexes[i];

            
            let newContainer = this.createFrom(startIndex, endIndex);
            // console.log("startindex", startIndex, 'endindex', endIndex, 'containerlength', newContainer.length());
            containers.push( newContainer );

            startIndex = endIndex + sequence.length;
        }

        // append from last index to end of buffer
        let newContainer = this.createFrom(startIndex, 999999);
        // console.log("startindex", startIndex, 'endindex', 999999, 'containerlength', newContainer.length());
        containers.push( newContainer );

        return containers;
    }

    toString(encoding = 'utf8') {
        // concat rest into one buffer and encode to string with start and end as
        // if( this.end === null || this.end === 999999 ) {
        //     // use buffer length when no end offset is given
        //     return Buffer.concat(this.buffers).toString(encoding, this.start);
        // } else {
        //     return Buffer.concat(this.buffers).toString(encoding, this.start, this.end);
        // }
        
        // make sure there are no offsets
        this.slice();

        const decoder = new StringDecoder(encoding);
        
        return this.buffers.reduce((str, buffer) => {
            str += decoder.write(buffer);
            return str;
        }, '');
    }

    concat() {
        this.slice();
        return Buffer.concat(this.buffers);
    }

    slice() {
        let totalLength = this.length();

        if( this.start > 0 ) {
            let firstBuffer = this.buffers.shift();
            this.buffers.unshift( firstBuffer.slice(this.start) );
            this.start = 0;
        }

        if( this.end < 999999 ) {
            if( this.end < totalLength ) {

                let lastBuffer = this.buffers.pop();
                let bufferEndOffset = lastBuffer.length - ( totalLength - this.end );

                this.buffers.push( lastBuffer.slice(0, bufferEndOffset) );
                
            }
            this.end = 999999;
        }

        return this;
    }

    static firstAndLastBytes(buffer) {
        if( buffer.length > 30 ) {
            return [ buffer.length, buffer.slice(0, 20), buffer.slice(buffer.length - 20) ];
        }
        return [ buffer.length, buffer ];
    }

    static bytesNear(buffer, index) {
        if( index < 10 ) {
            return buffer.slice( 0, Math.min(20, buffer.length) );
        } else if( index > buffer.length - 10 ) {
            return buffer.slice( buffer.length - Math.min(20, buffer.length) );
        }

        return buffer.slice(index - 10, index + 10);
    }
}

module.exports = BufferContainer;
