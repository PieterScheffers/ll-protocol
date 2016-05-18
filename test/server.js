'use strict';

const net = require("net");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const expect = require("chai").expect;

const LLProtocol = require('../src/LLProtocol');
const StringDecoder = require("string_decoder").StringDecoder;

let server = null;
let serverLLProtocol = null;

let client = null;
let clientLLProtocol = null;

const tmp = path.join(__dirname, 'tmp');

function createMD5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function createTmpFile(name, char = 'a', size = 128) {
    const file = tmp + "/" + name;

    try {

        fs.accessSync(file);

    } catch(err) {

        let buffer = "";
        for (let i = 0; i < 1024; i++) {
            buffer += char;
        }

        for (let i = 0; i < size; i++) {
            fs.appendFileSync(file, buffer);
        }
    }

    return file;
}

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

        // socket.once("close", () => {
        //     console.log("Server closed");
        // });

        // socket.once('error', (err) => {
        //     console.error("Server error: ", err);
        // });

        // socket.once("end", () => {
        //     console.log("server end");
        // });

        // socket.once("finish", () => {
        //     console.log("server finish");
        // });
    });

    server.listen(8000);

    client = new net.Socket({ allowHalfOpen: true });
    client.connect(8000, () => {
        clientLLProtocol = new LLProtocol(client);

        hasClientConnection = true;
        isDone();
    });

    // client.once("close", () => {
    //     console.log("Client closed");
    // });

    // client.once('error', (err) => {
    //     console.error("client error: ", err);
    // });

    // client.once("end", () => {
    //     console.log("client end");
    // });

    // client.once("finish", () => {
    //     console.log("client finish");
    // });
}

describe('LLProtocol', function() {
    before(function(done) {
        refresh(done);
    });

    // after(function() {
    //     close();
    // });

    describe("send basic message", function() {
        it("should be able to send basic messages", function(done) {

            clientLLProtocol.once("someType", function(reader) {
                let string = "";

                const decoder = new StringDecoder('utf8');

                reader.on('data', (chunk) => {
                    string += decoder.write(chunk);
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
        before(function() {
            createTmpFile('aaa', 'a');
            createTmpFile('bbb', 'b');
            createTmpFile('ccc', 'c');
        });

        after(function(done) {
            // fs.unlinkSync(tmp + "/aaa");
            // fs.unlinkSync(tmp + "/bbb");
            // fs.unlinkSync(tmp + "/ccc");

            fs.unlinkSync(tmp + "/aaa2");
            fs.unlinkSync(tmp + "/bbb2");
            fs.unlinkSync(tmp + "/ccc2");

            done();
        });

        it("should be able to send multiple files at the same time", function(done) {
            this.timeout(0);

            let filesDone = 0;

            function checkDone() {
                // console.log("files done", filesDone);
                if( filesDone === 3 ) {

                    ['aaa', 'bbb', 'ccc'].forEach((filename) => {
                        let file = tmp + "/" + filename;
                        let file2 = `${tmp}/${filename}2`;
                        let stats = fs.statSync(file);
                        let stats2  = fs.statSync(file2);

                        expect(stats.size).to.equal(stats2.size);

                        expect( createMD5(fs.readFileSync(file)) ).to.equal( createMD5(fs.readFileSync(file)) );
                    });

                    done();
                }
            }

            // HANDLE REQUEST
            clientLLProtocol.on("someFile", function(request) {
                // console.log("someFile request");
                const filename = request.headers.filename;
                const writer = fs.createWriteStream(tmp + "/" + filename + "2");

                request.pipe(writer);

                request.once('finish', () => {
                    filesDone += 1;
                    checkDone();
                });
            });


            // SEND REQUEST
            ['aaa', 'bbb', 'ccc'].forEach((filename) => {
                const reader = fs.createReadStream(tmp + "/" + filename);
                const response = serverLLProtocol.makeResponse({ type: "someFile", filename: filename });

                reader.pipe(response);
                // serverLLProtocol.send(response);
            });

        });
    });
});
