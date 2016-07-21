'use strict';

const expect = require("chai").expect;
const isEqual = require('lodash.isequal');

const findSequence = require("../src/utils/bufferhelpers").findSequence;
const findSequenceOverlapping = require("../src/utils/bufferhelpers").findSequenceOverlapping;
const findPossible = require("../src/utils/bufferhelpers").findPossible;
const buffersJoin = require("../src/utils/bufferhelpers").buffersJoin;
const uniqueSequences = require("../src/utils/bufferhelpers").uniqueSequences;
const findSequences = require("../src/utils/bufferhelpers").findSequences;
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

            const possible = findPossible(buffer);

            expect(possible).to.eql([ 10, 30, 50, 60, 70, 80, 100, 110, 120, 130, 140, 160, 170, 180, 190, 210, 230 ]);

            // console.log("possible", possible);

            // possible  === [ 10,    30,    50,    60,    70,   80,    100,   110,  120,  130,   140,   160,   170,   180,  190,   210,   230 ]
            // sequences === [ false, false, false, false, true, false, false, false, true, false, false, false, false, true, false, false, false ]

            const sequences = possible.map(p => findSequence(buffer, p));

            // console.log("sequences", sequences.map(p => p === null));

            expect( sequences.filter(s => s !== null).length ).to.equal(numberOfSequences);

            expect( sequences.filter(s => s && s.sequence === HEADERSEQUENCE).length ).to.equal(numberOfHeader);
            expect( sequences.filter(s => s && s.sequence === FRAMESEQUENCE).length ).to.equal(numberOfFrame);

            // console.log(110, findSequence(buffer, 110)); // 101 - 121
            // console.log(120, findSequence(buffer, 120)); // 111 - 131
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

        it("should work for all indexes", function() {
            const buffer = Buffer.from([ 6, ...FRAMESEQUENCE, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ]);
            let tests = [ { buffer, index: 0 } ];

            for (let i = 0; i < 27; i++) {
                tests.push({
                    buffer: Buffer.concat([
                        tests[i].buffer.slice( tests[i].buffer.length - 1 ),
                        tests[i].buffer.slice( 0, tests[i].buffer.length - 1 )
                    ]),
                    index: i + 1
                });
            }

            tests.forEach(t => {
                t.possible = findPossible(t.buffer);
            });

            tests.forEach(t => {
                t.sequences = t.possible.map(p => findSequence(t.buffer, p));
            });

            tests.forEach(t => {
                // test if each test has found precisely 1 sequence
                expect(t.sequences.filter(s => s !== null).length).to.equal(1);

                // test if each sequence is a FRAMESEQUENCE
                expect(t.sequences[0].sequence).to.equal(FRAMESEQUENCE);
            });
        });

        it("should find all adjacent sequences", function() {

            const frameBuffer = Buffer.from(FRAMESEQUENCE);
            const headerBuffer = Buffer.from(HEADERSEQUENCE);

            const buffers = [ Buffer.from([6]) ];

            for( let i = 0; i < 10; i++ ) {
                buffers.push(frameBuffer, headerBuffer);
            }

            const buffer = Buffer.concat(buffers);

            const possible = findPossible(buffer);

            // use findSequences instead of mapping through possible to avoid duplicates
            const sequences = findSequences(buffer, possible);

            expect(sequences.length).to.equal(20);
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

        it("should not find indexes that findSequence finds", function() {
            const buffer = Buffer.from([ 6, ...FRAMESEQUENCE, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6 ]);
            let tests = [ { buffers: buffer, index: 0 } ];

            for (let i = 0; i < 27; i++) {
                tests.push({
                    buffers: Buffer.concat([
                        tests[i].buffers.slice( tests[i].buffers.length - 1 ),
                        tests[i].buffers.slice( 0, tests[i].buffers.length - 1 )
                    ]),
                    index: i + 1
                });
            }

            const half = Math.floor(tests[0].buffers.length / 2);

            // split buffers in two
            tests.forEach(t => t.buffers = [ t.buffers.slice(0, half), t.buffers.slice(half) ]);

            tests.forEach(t => {
                t.sequence = findSequenceOverlapping(t.buffers[1], t.buffers[0]);
                t.possibles = t.buffers.map(b => findPossible(b));
                t.sequences = t.possibles.map((possible, i) => possible.map(p => findSequence(t.buffers[i], p)).filter(s => s !== null));
                t.sequences = t.sequences.reduce((arr, sb) => {
                    for (let i = 0; i < sb.length; i++) {
                        if( sb[i] !== null ) {
                            arr.push(sb[i]);
                        }
                    }

                    return arr;
                });
            });

            // expect sequences found with findSequence to not been found with findSequenceOverlapping
            tests.forEach(t => {
                if( t.sequence === null ) return;

                t.sequences.forEach(sb => {
                    // if( isEqual(s, sb) ) console.log("deep equal", t.sequence, sb);
                    expect(t.sequence).to.not.deep.eql(sb);
                });
            });

            // console.log(tests.map(t => {
            //     return [
            //         t.sequence !== null,
            //         t.sequence ? [ t.sequence.begin.index, t.sequence.end.index ] : [],
            //         t.sequence ? [ t.sequence.begin.chunk === t.buffers[0], t.sequence.end.chunk === t.buffers[0] ] : [],
            //         'possible: ' + t.possibles.map(p => p.join(",")).join("|")
            //         // t.sequences ? t.sequences.map(s => 's: ' + s.filter(seq => seq !== null).map(seq => [ seq.begin.index, seq.end.index ].join(",")).join("|") ) : []
            //     ];
            // }));
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
