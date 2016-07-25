'use strict';

const expect = require("chai").expect;

const PhrameSplitter = require("../src/request/PhrameSplitter");
const FrameHeader = require("../src/utils/FrameHeader");
const buffersJoin = require("../src/utils/bufferhelpers").buffersJoin;
const findPossible = require("../src/utils/bufferhelpers").findPossible;
const findSequences = require("../src/utils/bufferhelpers").findSequences;

const FRAMESEQUENCE = require("../src/config/configuration").SEQUENCES.frame;
const HEADERSEQUENCE = require("../src/config/configuration").SEQUENCES.header;

describe('PhrameSplitter', function() {

    describe("getFrames", function() {
        it("should get all frames from a chunk", function() {

            const str = "The black prince rides the waves like a blue cat drives around the wastes. ";

            // split string on space and re-add space + create buffer
            const buffers = str.trim().split(" ").map(s => s + " ").map(s => Buffer.from(s));

            // add sequence to middle buffer
            buffers[ Math.floor(buffers.length / 2) ] = Buffer.concat([ buffers[ Math.floor(buffers.length / 2) ], Buffer.from(HEADERSEQUENCE) ]);

            let index = 0;

            // add a frame header to all buffers to get a valid frame
            buffers.map((buffer) => {
                return Buffer.concat([
                    (new FrameHeader({ id: 35325, index: index++, end: false })).toBuffer(),
                    buffer
                ]);
            });

            // add frame sequences between frames
            const buffer = Buffer.concat([
                buffersJoin(buffers, Buffer.from(FRAMESEQUENCE)),
                Buffer.from(FRAMESEQUENCE) // add a framesequence on the end
            ]);

            // begin test
            const possible = findPossible(buffer);

            const frameSplitter = new PhrameSplitter();

            const frames = frameSplitter.getFrames(buffer, possible);

            expect(frames.length).to.equal(14);

            const sequence = frames.filter(f => f.sequences && f.sequences.length).map(f => f.sequences)[0][0];

            expect(sequence.begin.index).to.equal(2);
            expect(sequence.end.index).to.equal(14);
        });
    });

    describe("rewriteSequenceIndexes", function() {
        it("should find a sequence in a buffer object", function() {

        });
    });

    describe("parseFrames", function() {
        it("should find a sequence overlapping 2 buffers", function() {

        });
    });

    describe("findHeader", function() {
        it("should find a sequence overlapping 2 buffers", function() {

        });
    });

    describe("buildHeaders", function() {
        it("should find a sequence overlapping 2 buffers", function() {

        });
    });

    describe("makeRequest", function() {
        it("should return a Request object", function() {

        });
    });

    describe("isHeaderInSlice", function() {
        it("should find a sequence overlapping 2 buffers", function() {

        });
    });

});
