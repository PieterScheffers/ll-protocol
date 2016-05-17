'use strict';

const net = require("net");
const fs = require("fs");
const path = require("path");
const expect = require("chai").expect;

const LLProtocol = require('../src/LLProtocol');
const StringDecoder = require("string_decoder").StringDecoder;
const ChunkSpacer = require("../src/utils/ChunkSpacer");

let server = null;
let serverLLProtocol = null;

let client = null;
let clientLLProtocol = null;

function close() {
    if( server ) {  
        server.close();
        server = null;
        serverLLProtocol = null;
    }

    if( client ) {
        client.destroy();
        client = null;
        clientLLProtocol = null;
    }
}

function refresh(done) {
    close();

    let hasServerConnection = false;
    let hasClientConnection = false;

    function isDone() {
        if( hasServerConnection && hasClientConnection ) {
            done();
        }
    }

    server = new net.Server();
    server.on("connection", (socket) => {
        serverLLProtocol = new LLProtocol(socket);

        hasServerConnection = true;
        isDone();
    });
    server.listen(8000);

    client = new net.Socket();
    client.connect(8000, () => {
        clientLLProtocol = new LLProtocol(client);

        hasClientConnection = true;
        isDone();
    });
}

describe('LLProtocol', function () {
    beforeEach(function(done) {
        refresh(done);
    });

    afterEach(function () {
        close();
    });

    describe("send basic message", function() {
        it("should be able to send basic messages", function(done) {

            clientLLProtocol.once("someType", function(reader) {
                console.log("someType request");
                let string = "";

                const decoder = new StringDecoder('utf8');

                reader.on('data', (chunk) => {
                    string += decoder.write(chunk);
                    console.log("string: ", string);
                });

                reader.on("end", function() {
                    expect(string).to.eql("This is the content");
                    done();
                });
            });

            let response = new LLProtocol.Response("someType", "This is the content");
            serverLLProtocol.send(response);

        });

    });

    describe("files", function() {
        const tmp = path.join(__dirname, 'tmp');

        before(function() {
            let buffer = "";
            for (let i = 0; i < 100; i++) {
                buffer += "aaaaaaaaaa";
            }

            for (let i = 0; i < 128; i++) {
                fs.appendFileSync(tmp + "/aaa", buffer);
            }


            buffer = buffer.replace(/a/g, 'b');

            for (let i = 0; i < 128; i++) {
                fs.appendFileSync(tmp + "/bbb", buffer);
            }

            buffer = buffer.replace(/b/g, 'c');

            for (let i = 0; i < 128; i++) {
                fs.appendFileSync(tmp + "/ccc", buffer);
            }
            
        });

        after(function(done) {
            fs.unlinkSync(tmp + "/aaa");
            fs.unlinkSync(tmp + "/bbb");
            fs.unlinkSync(tmp + "/ccc");

            fs.unlinkSync(tmp + "/aaa2");
            fs.unlinkSync(tmp + "/bbb2");
            fs.unlinkSync(tmp + "/ccc2");

            done();
        });

        it("should be able to send multiple files at the same time", function(done) {
            this.timeout(0);

            let filesDone = 0;

            function checkDone() {
                console.log("files done", filesDone);
                if( filesDone === 3 ) {
                    done();
                }
            }

            // HANDLE REQUEST
            clientLLProtocol.on("someFile", function(request) {
                console.log("someFile request");
                const filename = request.headers.filename;
                const writer = fs.createWriteStream(tmp + "/" + filename + "2");

                request.pipe(writer);

                request.once('end', () => {
                    filesDone += 1;
                    checkDone();
                });
            });


            // SEND REQUEST
            ['aaa', 'bbb', 'ccc'].forEach((filename) => {
                const reader = fs.createReadStream(tmp + "/" + filename);
                const response = serverLLProtocol.makeResponse({ type: "someFile", filename: filename });

                reader.pipe(response);
                serverLLProtocol.send(response);
            });

        });
    });
});

// function done() {
//     clientLLProtocol.on("someType", function(reader) {
//         let string = "";

//         const decoder = new StringDecoder('utf8');

//         reader.on('data', (chunk) => {
//             string += decoder.write(chunk);
//         });

//         reader.on("end", function() {
//             console.log("reader end");
//             console.log(string);

//             done();
//         });
//     });

//     const str = "This is the content";
//     console.log("String buffer", Buffer.from(str));

//     let response = new LLProtocol.Response("someType", str);
//     serverLLProtocol.send(response);
// }

// refresh(done);

