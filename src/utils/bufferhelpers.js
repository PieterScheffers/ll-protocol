const FIRSTBYTESEQUENCEMAP = require("../config/configuration").FIRSTBYTEMAP;
const SMALLESTSEQUENCE = require("../config/configuration").SMALLESTSEQUENCE;
const UNIQUESEQUENCEBYTES = require("../config/configuration").UNIQUESEQUENCEBYTES;

/**
 * Find possible sequences in buffer object
 * @param  Buffer  chunk  Buffer object
 * @return Array          Array of possible sequences indexes
 */
exports.findPossible = function(chunk) {
    const possible = [];

    for( let i = 10; i < chunk.length; i += 10 ) {
        if( UNIQUESEQUENCEBYTES.includes(chunk[i]) ) {
            possible.push(i);
        }
    }

    return possible;
};

exports.findSequenceOverlapping = function(chunk, lastChunk) {
    const finds = [];

    if( lastChunk ) {
        const lastChunkLength = lastChunk.length;
        const begin = Math.max(lastChunkLength - 11, 0);

        for( let i = begin; i < lastChunkLength; i++ ) {

            let purgeFinds = [];

            for( let j = 0; j < finds.length; j++ ) {
                const f = finds[j];
                f.index += 1;

                if( f.sequence[f.index] !== lastChunk[i] ) {
                    purgeFinds.push(f);
                } else if( f.index === (f.sequence.length - 1) ) { // is last index
                    f.end = { chunk: lastChunk, index: i + 1 };
                    delete f.index;
                    return f;
                }
            }

            // remove invalid finds
            for (let j = 0; j < purgeFinds.length; j++) {
                let index = finds.indexOf(purgeFinds[j]);
                finds.splice(index, 1);
            }

            // add new possible finds
            if( FIRSTBYTESEQUENCEMAP.has(lastChunk[i]) ) {
                finds.push({
                    sequence: FIRSTBYTESEQUENCEMAP.get(lastChunk[i]),
                    begin: { chunk: lastChunk, index: i },
                    end: null,    // { chunk: null, index: null }
                    index: 0
                });
            }

        }

    }

    const end = Math.min(11, chunk.length - 1);
    for( let i = 0; i <= end; i++ ) {

        // return early when not possible to find sequence
        if( finds.length < 1 && (end - i) < SMALLESTSEQUENCE - 1 ) return null;

        let purgeFinds = [];

        for( let j = 0; j < finds.length; j++ ) {
            const f = finds[j];
            f.index += 1;

            if( f.sequence[f.index] !== chunk[i] ) {
                purgeFinds.push(f);
            } else if( f.index === (f.sequence.length - 1) ) { // is last index
                f.end = { chunk, index: i + 1 };
                delete f.index;
                return f;
            }
        }

        // remove invalid finds
        for (let j = 0; j < purgeFinds.length; j++) {
            let index = finds.indexOf(purgeFinds[j]);
            finds.splice(index, 1);
        }

        // add new possible finds
        if( FIRSTBYTESEQUENCEMAP.has(chunk[i]) ) {
            finds.push({
                sequence: FIRSTBYTESEQUENCEMAP.get(chunk[i]),
                begin: { chunk, index: i },
                end: null,    // { chunk: null, index: null }
                index: 0
            });
        }

    }

    return null;
};

function findSequence(chunk, index) {
    const finds = [];
    const end = Math.min(index + 12, chunk.length - 1);
    const begin = Math.max(index - 9, 0);

    for( let i = begin; i <= end; i++ ) {

        // return early when not possible to find sequence
        if( finds.length < 1 && (end - i) < SMALLESTSEQUENCE - 1 ) return null;

        let purgeFinds = [];

        for( let j = 0; j < finds.length; j++ ) {
            const f = finds[j];
            f.index += 1;

            if( f.sequence[f.index] !== chunk[i] ) {
                purgeFinds.push(f);
            } else if( f.index === (f.sequence.length - 1) ) { // is last index
                f.end = { chunk, index: i + 1 };
                delete f.index;
                return f;
            }
        }

        // remove invalid finds
        for (let j = 0; j < purgeFinds.length; j++) {
            let findIndex = finds.indexOf(purgeFinds[j]);
            finds.splice(findIndex, 1);
        }

        // add new possible finds
        if( FIRSTBYTESEQUENCEMAP.has(chunk[i]) ) {
            finds.push({
                sequence: FIRSTBYTESEQUENCEMAP.get(chunk[i]),
                begin: { chunk, index: i },
                end: null,    // { chunk: null, index: null }
                index: 0
            });
        }
    }

    return null;
}

exports.findSequence = findSequence;

exports.findSequences = function(chunk, possible) {
    const sequencesMap = possible.reduce((map, p) => {
        const s = findSequence(chunk, p);
        if( s !== null ) map.set(s.begin.index + "-" + s.end.index, s);
        return map;
    }, new Map());

    return [ ...sequencesMap ].map(m => m[1]);
};

exports.sortSequences = function(sequences) {
    const endFrames = sequences
        .filter(s => s && s.sequence === SEQUENCES.frame)
        .sort((a, b) => a.begin.index - b.begin.index);
    const endHeaders = sequences.filter(s => s && s.sequences === SEQUENCES.header);

    return [ endFrames, endHeaders ];
};

exports.getFrames = function(chunk, frameSeqs = [], headerSeqs = []) {
    if( frameSeqs.length ) {
        const frames = [];

        frames.push( chunk.slice(0, frameSeqs[0].begin.index) );

        let lastSeq = null;
        for( let i = 0; i < frameSeqs[i].length; i++ ) {
            if( lastSeq !== null ) {
                const frameHeaders = getHeadersBetweenFrames(headerSeqs, lastSeq, frameSeqs[i]);
                frames.push({ frame: chunk.slice(lastSeq.end.index, frameSeqs[i].begin.index), sequences: frameHeaders });
            }

            lastSeq = frameSeqs[i];
        }

        return frames;
    }

    return [ chunk ];
};

function getHeadersBetweenFrames(frame, headerSeqs, lastSeq, currentSeq) {
    return headerSeqs
        .filter( isHeaderInSlice(lastSeq, currentSeq) )
        .map(h => rewriteSequenceIndexes(frame, h, lastSeq, currentSeq));
}

exports.getHeadersBetweenFrames = getHeadersBetweenFrames;

/**
 * When a slice is being taken from a chunk, the indexes of a sequence are wrong
 * This function rewrites them
 * @param  Object  header     Header sequence object
 * @param  Object  frameBegin Frame sequence object before slice
 * @return Object             Header sequence object (indexes rewritten)
 */
function rewriteSequenceIndexes(frame, headerSeq, frameBeginSeq, frameEndSeq) {
    const beginSliceIndex = frameBeginSeq.end.index;

    if( frameBeginSeq.end.chunk === frameEndSeq.begin.chunk ) {

        headerSeq.begin.index -= beginSliceIndex;
        headerSeq.end.index -= beginSliceIndex;

    } else if( headerSeq.begin.chunk === frameEndSeq.begin.chunk ) {

        const lastSliceLength = frameBeginSeq.end.chunk.length - beginSliceIndex;
        headerSeq.begin.index += lastSliceLength;
        headerSeq.end.index += lastSliceLength;

    } else {

        headerSeq.begin.index -= beginSliceIndex;
        headerSeq.end.index -= beginSliceIndex;

    }

    headerSeq.begin.chunk = frame;
    headerSeq.end.chunk = frame;

    return headerSeq;
}

exports.rewriteSequenceIndexes = rewriteSequenceIndexes;

exports.buffersJoin = function(buffers, glue) {
    const first = buffers.shift();

    const withGlue = buffers.map(b => Buffer.concat([ Buffer.from(glue), b ]) );

    withGlue.unshift(first);

    return Buffer.concat(withGlue);
};

exports.uniqueSequences = function(sequences) {
    const object = sequences.reduce((obj, seq) => {
        obj[seq.begin.index + "-" + seq.end.index] = seq;
        return obj;
    }, {});

    return Object.keys(object).map(k => object[k]);
};

// Find if a header sequence is between 2 frame sequences (in slice)
// curry function - use in filter, find or findIndex
function isHeaderInSlice(frameBeginSeq, frameEndSeq) {
    return function(headerSeq) {
        if( frameBeginSeq.end.chunk === frameEndSeq.begin.chunk ) {

            return headerSeq.begin.index >= frameBeginSeq.end.index && headerSeq.end.index <= frameEndSeq.begin.index;

        } else if( headerSeq.begin.chunk === frameEndSeq.begin.chunk ) {

            return headerSeq.begin.index >= 0 && headerSeq.end.index <= frameEndSeq.begin.index;

        }

        return headerSeq.begin.index >= frameBeginSeq.end.index && headerSeq.end.index <= frameBeginSeq.end.chunk.length;
    };
}

exports.isHeaderInSlice = isHeaderInSlice;
