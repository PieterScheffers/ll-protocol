'use strict';

const net = require("net");
const fs = require("fs");

const LLProtocol = require('../src/LLProtocol');

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

    server = net.server();
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
    beforeEach(function () {
        refresh();
    });

    afterEach(function () {
        close();
    });

    describe("send basic message", function() {
        it("should be able to send basic messages", function(done) {
            clientLLProtocol.once("someType", function(reader) {
                let string = "";

                const decoder = new StringDecoder('utf8');

                reader.on('data', (chunk) => {
                    string += decoder.write(chunk);
                });

                reader.on("end", function() {
                    string.should.be("This is the content");
                    done();
                });
            });

            let response = new LLProtocol.Response("someType", "This is the content");
            serverLLProtocol.send(response);
        });
    });
});