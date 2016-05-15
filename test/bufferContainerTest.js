'use strict';

const expect = require("chai").expect;

const BufferContainer = require("../src/utils/BufferContainer");

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

    describe("shift", function() {
        it("should return the first buffer and remove it from the buffers array", function() {

            const buffers = "this is some string you want to know".split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            expect(b.length()).to.equal(37);
            expect(b.buffers.length).to.equal(8);

            let buffer = b.shift();

            // bytes before are remembered
            expect(b.length()).to.equal(37);
            expect(b.buffers.length).to.equal(7);

            expect(buffer.length).to.equal(5);
            
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

            let charCodes = string.split('').map((char) => { return char.charCodeAt(0); });

            const buffers = string.split(" ").map((word) => { return Buffer.from(`${word} `) });

            let b = new BufferContainer(buffers);

            // for (let i = 0; i < 255; i++) {
            //     if( charCodes.indexOf(i) !== -1 ) {

            //         expect(b.indexOf(i)).to.equal(string.indexOf(string[i]));

            //     }
            // }
            
            // expect(b.indexOf(116)).to.equal(0);  // t
            // expect(b.indexOf(111)).to.equal(-1); // o       
        });
    });
});