'use strict';

const expect = require("chai").expect;

const BufferContainer = require("../src/utils/BufferContainer");
const StringDecoder = require('string_decoder').StringDecoder;

describe('BufferContainer', function () {
    // beforeEach(function(done) {
    //     refresh(done);
    // });

    // afterEach(function () {
    //     close();
    // });

    describe("constructor", function() {
        it("should initialize some variables", function() {

            const buffers = "this is some string you want to know".split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            expect(b.start).to.equal(0);
            expect(b.end).to.equal(999999);
            expect(b.buffers.length).to.equal(8);
        });
    });

    describe("length", function() {
        it("should return the total length of all buffers", function() {

            const buffers = "this is some string you want to know".split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            expect(b.length()).to.equal(37);
        });
    });

    describe("push", function() {
        it("should push a new buffer onto the buffers array", function() {

            const buffers = "this is some string you want to know".split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            expect(b.length()).to.equal(37);
            expect(b.buffers.length).to.equal(8);

            b.push(Buffer.from('形声字 '));

            expect(b.length()).to.equal(47);
            expect(b.buffers.length).to.equal(9);
        });
    });

    describe("each", function() {
        it("should have an index starting at zero and incremented by one each byte", function() {

            const buffers = "this is some string you want to know".split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            let i = -1;

            b.each((byte, index) => {
                i++;
                expect(index).to.eql(i);
            });
        });

        it("should stop when returning false", function() {

            const buffers = "this is some string you want to know".split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            let chosenByte = null;
            let i = -1;

            b.each((byte, index) => {
                chosenByte = byte;
                i = index;
                if( index === 9 ) return false;
            });

            expect(chosenByte).to.equal(111);
            expect(i).to.equal(9);

        });
    });

    describe("reduce", function() {
        it("should have an index starting at zero and incremented by one each byte", function() {

            const buffers = "this is some string you want to know".split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            let i = -1;

            b.reduce((total, byte, index) => {
                i++;
                expect(index).to.eql(i);
            });
        });
    });

    describe("indexOf", function() {
        // http://www.asciitable.com/

        it("should return -1 if the byte has not been found", function() {

            const string = "this is some string you want to know";

            let charCodes = string.split('').map((char) => { return char.charCodeAt(0); });

            const buffers = string.split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            for (let i = 0; i < 255; i++) {
                if( charCodes.indexOf(i) === -1 ) {
                    expect(b.indexOf(i)).to.equal(-1);
                }
            }
            
            expect(b.indexOf(31)).to.equal(-1);
            expect(b.indexOf(123)).to.equal(-1);           
        });

        it("should return the first index if the byte has been found", function() {

            const string = "this is some string you want to know";

            // let charCodes = string.split('').map((char) => { return char.charCodeAt(0); });

            const buffers = string.split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            // for (let i = 0; i < 255; i++) {
            //     if( charCodes.indexOf(i) !== -1 ) {

            //         expect(b.indexOf(i)).to.equal(string.indexOf(string[i]));

            //     }
            // }
            
            expect(b.indexOf(116)).to.equal(0); // t
            expect(b.indexOf(111)).to.equal(9); // o       
        });
    });

    describe("indexOfAll", function() {
        it("should return the first index if the byte has been found", function() {

            const string = "this is some string you want to know";

            const buffers = string.split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            expect(b.indexOfAll(111)).to.deep.equal([ 9, 21, 30, 34 ]); // o
            expect(b.indexOfAll(116)).to.deep.equal([ 0, 14, 27, 29 ]); // t
        });
    });

    describe("byteAtIndex", function() {

    });

    describe("byteAtIndex", function() {
        it("should return the byte value at the index", function() {
            const string = "this is some string you want to know";

            const buffers = string.split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            for( let i = 0; i < b.length(); i++ ) {
                expect(b.byteAtIndex(i)).to.eql(b.byteAtIndexed(i));
            }
        });
    });

    describe("createFrom", function() {
        it("should return a buffercontainer with the buffers from to", function() {
            const string = "this is some string you want to know";

            const buffers = string.split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            let c = b.createFrom(10, 16); // 10, 11, 12, 13, 14, 15

            expect(c.toString()).to.equal('me str');
            expect(c.start).to.equal(0);
            expect(c.end).to.equal(999999);


            let d = b.createFrom(16, 26);

            expect(d.toString()).to.equal('ing you wa');
            expect(d.start).to.equal(0);
            expect(d.end).to.equal(999999);
        });
    });

    describe("indexesOfSequence", function() {
        it("should find all indexes of a sequence in an array of buffers", function() {
            const sequence = [ 1, 0, 1, 0 ];

            const string = "this is some string you want to know";

            // split string on space and append a space to each word and turn into buffers
            let buffers = string.split(" ").map((word) => { return Buffer.from(`${word} `) });

            // push the sequence between each word buffer and concatenate it
            let buffer = Buffer.concat(buffers.reduce((arr, buffer) => {
                arr.push(buffer);
                arr.push(Buffer.from(sequence))
                return arr;
            }, []));

            buffers = [];
            let b;

            // turn buffer in multiple buffers of max length 5
            for( let i = 0; i < buffer.length; i++ ) {
                if( (i % 5) === 0) {
                    // allocate 5 bytes for buffer
                    b = ( (buffer.length) - i < 5) ? Buffer.alloc((buffer.length) - i) : Buffer.alloc(5);
                    buffers.push(b);
                }

                b[(i % 5)] = buffer[i];
            }

            let c = new BufferContainer(buffers);

            // "this 1010is 1010some 1010string 1010you 1010want 1010to 1010know 1010"
            
            expect( c.indexesOfSequence(sequence) ).to.deep.equal([ 5, 12, 21, 32, 40, 49, 56, 65 ]);
        });
    });

    describe("splitOnSequence", function() {
        it("should split an array of buffers on a sequence", function() {
            const sequence = [ 2, 3, 0, 1 ];

            const string = "this is some string you want to know";

            // split string on space and append a space to each word and turn into buffers
            let buffers = string.split(" ").map((word) => { return Buffer.from(`${word} `) });

            expect(buffers[3].toString()).to.equal("string ");

            // push the sequence between each word buffer and concatenate it
            let buffer = Buffer.concat(buffers.reduce((arr, buffer) => {
                arr.push(buffer);
                arr.push(Buffer.from(sequence))
                return arr;
            }, []));

            buffers = [];
            let b;

            // turn buffer in multiple buffers of max length 5
            for( let i = 0; i < buffer.length; i++ ) {
                if( (i % 5) === 0) {
                    // allocate 5 bytes for buffer
                    b = ( (buffer.length) - i < 5) ? Buffer.alloc((buffer.length) - i) : Buffer.alloc(5);
                    buffers.push(b);
                }

                b[(i % 5)] = buffer[i];
            }

            let c = new BufferContainer(buffers);

            // "this 2301is 2301some 2301string 2301you 2301want 2301to 2301know 2301"

            expect( c.indexesOfSequence(sequence) ).to.deep.equal([ 5, 12, 21, 32, 40, 49, 56, 65 ]);

            let containers = c.splitOnSequence(sequence);

            expect(containers.length).to.equal(9);
            expect(containers[3].toString()).to.equal('string ');

            // build string again
            let s = "";
            let d = new StringDecoder('utf8');

            for (let i = 0; i < containers.length; i++) {
                for (let j = 0; j < containers[i].buffers.length; j++) {
                    s += d.write(containers[i].buffers[j]);
                }
            }

            expect(s).to.equal("this is some string you want to know ");
        });
    });

    describe("toString", function() {
        it("should return the string representation of all buffers combined", function() {
            const string = "this is some string you want to know";

            // split string on space and append a space to each word and turn into buffers
            let buffers = string.split(" ").map((word) => { return Buffer.from(`${word} `) });

            let c = new BufferContainer(buffers);

            expect(c.toString()).to.equal(`${string} `);
        });
    });

    describe("concat", function() {

    });

    describe("slice", function() {

    });
});