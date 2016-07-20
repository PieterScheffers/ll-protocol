'use strict';

const expect = require("chai").expect;

const FrameHeader = require("../src/utils/FrameHeader");

const FRAMESEQUENCE = require("../src/config/configuration").SEQUENCES.frame;
const HEADERSEQUENCE = require("../src/config/configuration").SEQUENCES.header;

describe('FrameHeader', function() {

    describe("constructor", function() {
        it("should initialize fields", function() {
            const header = new FrameHeader({ id: 22, index: 4, end: false });

            expect(header._fields.id).to.equal(22);
            expect(header._fields.index).to.equal(4);
            expect(header._fields.end).to.equal(false);
        });
    });

    describe("toBuffer", function() {
        it("should find all possible sequences", function() {
            const header = new FrameHeader({ id: 22, index: 4, end: false });

            const buffer = Buffer.from([ 0x16, 0, 0, 0, 0x4, 0, 0, 0, 0x1 ]);

            expect(header.toBuffer()).to.eql(buffer);
        });
    });

    describe("toObject", function() {
        it("should find all possible sequences", function() {
            const obj = { id: 22, index: 4, end: false };
            const header = new FrameHeader(obj);
            const object = header.toObject();

            expect(object).to.eql(obj);
        });
    });

    describe("removeHeader", function() {
        it("should find all possible sequences", function() {
            const string = "The big brown cat is jumping over the mouse";
            const header = new FrameHeader({ id: 325235, index: 47, end: true });

            const buffer = Buffer.concat([
                header.toBuffer(),
                Buffer.from(string)
            ]);

            expect(FrameHeader.removeHeader(buffer).toString()).to.equal(string);
        });
    });

    describe("parseBuffer", function() {
        it("should return an instance of FrameHeader", function() {
            const object = { id: 22, index: 4, end: false };
            const buffer = (new FrameHeader(object)).toBuffer();
            const frameHeader = FrameHeader.parseBuffer(buffer);

            expect(frameHeader).to.be.an.instanceof(FrameHeader);

            expect(frameHeader.toObject()).to.eql(object);
        });
    });
});
