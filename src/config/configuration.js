'use strict';

// !! all sequences should have an other starting byte

const settings = {
    SEQUENCES: {
        header: [ 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0 ],
        frame: [ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ]
    },
    SEQUENCESARRAY: null,
    FIRSTBYTEMAP: null,
    UNIQUESEQUENCEBYTES: null, // unique bytes in sequences array
    BYTESSTREAK: 10,           // longest number of consecutive bytes for all bytes
    SMALLESTSEQUENCE: null,
    FRAME: {
        length: 256000 // 64000
    }
};

//////// Pre-compute some values /////////

function sequencesArray(sequences) {
    return Object.keys(sequences).map(k => sequences[k]);
}

function firstByteMap(sequences) {
    return new Map(sequencesArray(sequences).map(s => [ s[0], s ]));
}

function smallestSequence(sequences) {
    return sequencesArray(sequences).reduce((n, s) => { return Math.min(n, s.length); }, 9999);
}

function uniqueFrameBytes(sequences) {
    // object to array
    const sequenceValues = Object.keys(sequences).map(k => sequences[k]);

    // get unique values for each sequence
    const sets = sequenceValues.map(s => [...new Set(s)] );

    // concat sets
    const set = sets.reduce((n, s) => {
        s.forEach(n.add.bind(n));
        return n;
    }, new Set());

    // return set as array
    return [ ...set ];
}

settings.UNIQUESEQUENCEBYTES = uniqueFrameBytes(settings.SEQUENCES);
settings.SEQUENCESARRAY = sequencesArray(settings.SEQUENCES);
settings.FIRSTBYTEMAP = firstByteMap(settings.SEQUENCES);
settings.SMALLESTSEQUENCE = smallestSequence(settings.SEQUENCES);

module.exports = settings;
