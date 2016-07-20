const FIRSTBYTESEQUENCEMAP = require("../config/configuration").FIRSTBYTEMAP;
const SMALLESTSEQUENCE = require("../config/configuration").SMALLESTSEQUENCE;

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
        if( finds.length < 1 && (end - i) < SMALLESTSEQUENCE ) return null;

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

exports.findSequence = function(chunk, index) {
    const finds = [];
    const end = Math.min(index + 11, chunk.length - 1);
    const begin = Math.max(index - 9, 0);

    for( let i = begin; i <= end; i++ ) {

        // return early when not possible to find sequence
        if( finds.length < 1 && (end - i) < SMALLESTSEQUENCE ) return null;

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
};

