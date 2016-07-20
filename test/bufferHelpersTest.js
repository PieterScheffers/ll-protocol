'use strict';

const expect = require("chai").expect;

const findSequence = require("../src/utils/bufferhelpers").findSequence;
const findSequenceOverlapping = require("../src/utils/bufferhelpers").findSequenceOverlapping;
const findPossible = require("../src/utils/bufferhelpers").findPossible;
const buffersJoin = require("../src/utils/bufferhelpers").buffersJoin;
const FRAMESEQUENCE = require("../src/config/configuration").SEQUENCES.frame;
const HEADERSEQUENCE = require("../src/config/configuration").SEQUENCES.header;

describe('bufferHelpers', function() {
    // beforeEach(function(done) {
    //     refresh(done);
    // });

    // afterEach(function () {
    //     close();
    // });

    describe("findPossible", function() {
        it("should find all possible sequences", function() {

            const buffer = Buffer.concat([
                Buffer.from("A chicken is not a cow"),
                Buffer.from(HEADERSEQUENCE),
                Buffer.from([ 0, 0, 0, 0, 1, 1, 0 ]),
                Buffer.from("In the end they are both animals")
            ]);

            const possible = findPossible(buffer);

            expect(possible.length).to.equal(2);
            expect(possible).to.eql([ 30, 40 ]);
        });

        it("should find all possiblilities of a sequence", function() {
            const buffer = Buffer.from([
                84, 104, 101, 32,                   //  4   0 -   3
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12   4 -  15 - 10
                98, 108, 97, 99, 107, 32,           //  6  16 -  21
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12  22 -  33 - 30
                112, 114, 105, 110, 99, 101, 32,    //  7  34 -  40
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12  41 -  52 - 50
                114, 105, 100, 101, 115, 32,        //  6  53 -  58
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12  59 -  70 - 60, 70
                116, 104, 101, 32,                  //  4  71 -  74
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12  75 -  86 - 80
                119, 97, 118, 101, 115, 32,         //  6  87 -  92
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12  93 - 104 - 100
                108, 105, 107, 101, 32,             //  5 105 - 109
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12 110 - 121 - 110, 120
                97, 32,                             //  2 122 - 123
                0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, // 12 124 - 135 - 130
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12 136 - 147 - 140
                98, 108, 117, 101, 32,              //  5 148 - 152
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12 153 - 164 - 160
                99, 97, 116, 32,                    //  4 165 - 168
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12 169 - 180 - 170, 180
                100, 114, 105, 118, 101, 115, 32,   //  7 181 - 187
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12 188 - 199 - 190
                97, 114, 111, 117, 110, 100, 32,    //  7 200 - 206
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12 207 - 218 - 210
                116, 104, 101, 32,                  //  4 219 - 222
                1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 12 223 - 234 - 230
                119, 97, 115, 116, 101, 115, 46, 32 //  8 235 - 242
            ]);

            const numberOfSequences = 14;
            const numberOfFrame = 13;
            const numberOfHeader = 1;

            // console.log("buffer length", buffer.length);

            // const possible = findPossible(buffer);

            // console.log("possible", possible);

            // // possible  === [ 10,    30,    50,    60,    70,   80,    100,   110,  120,  130,   140,   160,   170,   180,  190,   210,   230 ]
            // // sequences === [ false, false, false, false, true, false, false, true, true, false, false, false, false, true, false, false, false ]

            // const sequences = possible.map(p => findSequence(buffer, p));

            // console.log("sequences", sequences.map(p => p === null));

            // console.log("sequences", sequences.filter(s => s !== null).length);

            // console.log("headersequences", sequences.filter(s => s && s.sequence === HEADERSEQUENCE).length);
            // console.log("framesequences",  sequences.filter(s => s && s.sequence === FRAMESEQUENCE).length);

            console.log(110, findSequence(buffer, 110)); // 101 - 121
            console.log(120, findSequence(buffer, 120)); // 111 - 131
        });

        it("should work for all indexes", function() {
            const buffer = Buffer.from([ ...FRAMESEQUENCE, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ]);
            const buffers = [ buffer ];

            for (let i = 0; i < 28; i++) {
                buffers.push(Buffer.concat([
                    buffers[i].slice( buffers[i].length - 1 ),
                    buffers[i].slice(0, buffers[i].length - 1)
                ]));
            }

            console.log(buffers);
        });
    });

    describe("findSequence", function() {
        it("should find a sequence in a buffer object", function() {

            const buffer = Buffer.concat([
                Buffer.from("A chicken is not a cow"),
                Buffer.from(HEADERSEQUENCE),
                Buffer.from([ 0, 0, 0, 0, 1, 1, 0 ]),
                Buffer.from("In the end they are both animals")
            ]);

            const possible = findPossible(buffer);

            expect(possible.length).to.equal(2);

            const sequences = possible.map(p => findSequence(buffer, p));

            expect(sequences.length).to.equal(2);
            expect(sequences[1]).to.equal(null);
            expect(sequences[0].begin.index).to.equal(22);
            expect(sequences[0].end.index).to.equal(34);
        });

    });

    describe("findSequenceOverlapping", function() {
        it("should find a sequence overlapping 2 buffers", function() {

            const firstSlice = Buffer.from(HEADERSEQUENCE).slice(0, 6);
            const secondSlice = Buffer.from(HEADERSEQUENCE).slice(6);

            const firstBuffer = Buffer.concat([
                Buffer.from("A chicken is not a cow"),
                firstSlice
            ]);

            const secondBuffer = Buffer.concat([
                secondSlice,
                Buffer.from([ 0, 0, 0, 0, 1, 1, 0 ]),
                Buffer.from("In the end they are both animals")
            ]);

            const sequence = findSequenceOverlapping(secondBuffer, firstBuffer);

            expect(sequence).to.not.equal(null);
            expect(sequence.begin.index).to.equal(22);
            expect(sequence.begin.chunk).to.equal(firstBuffer);
            expect(sequence.end.index).to.equal(6);
            expect(sequence.end.chunk).to.equal(secondBuffer);
        });
    });

    describe("buffersJoin", function() {
        it("should join buffers together", function() {

            const string = "This is an example of a string that could have been inserted into the application";

            const buffers = string.split(" ").map(s => Buffer.from(s));

            const buffer = buffersJoin(buffers, " harry ");

            const expected = "This harry is harry an harry example harry of harry a harry string harry that harry could harry have harry been harry inserted harry into harry the harry application";

            expect(buffer.toString('utf8')).to.eql(expected);
        });
    });

});
