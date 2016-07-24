'use strict';

const net = require("net");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const util = require("util");
const expect = require("chai").expect;

const heapdump = require('heapdump');

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

    after(function() {
        close();
    });

    describe("send basic message", function() {
        it("should be able to send basic messages", function(done) {

            clientLLProtocol.once("someevent", function(reader) {
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

            let response = new LLProtocol.Response("someevent", "This is the content");
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
            let filesDone = 0;

            function checkDone() {
                // console.log("files done", filesDone);
                if( filesDone === 3 ) {

                    // make sure last IO calls are processed
                    setImmediate(function() {

                        ['aaa', 'bbb', 'ccc'].forEach((filename) => {
                            let file = tmp + "/" + filename;
                            let file2 = `${tmp}/${filename}2`;
                            let stats = fs.statSync(file);
                            let stats2  = fs.statSync(file2);

                            expect(stats.size).to.equal(stats2.size);

                            expect( createMD5(fs.readFileSync(file)) ).to.equal( createMD5(fs.readFileSync(file2)) );
                        });

                        done();
                    });

                }
            }

            // HANDLE REQUEST
            clientLLProtocol.on("someFile", function(request) {
                // console.log("someFile request");
                const filename = request.headers.filename;
                const writer = fs.createWriteStream(tmp + "/" + filename + "2");

                request.pipe(writer);

                writer.once('finish', () => {
                    filesDone += 1;
                    checkDone();
                });
            });


            // SEND REQUEST
            ['aaa', 'bbb', 'ccc'].forEach((filename) => {
                const reader = fs.createReadStream(tmp + "/" + filename);
                const response = serverLLProtocol.makeResponse({ event: "someFile", filename: filename });

                reader.pipe(response);
                // serverLLProtocol.send(response);
            });

        });
    });

    describe("multiple messages", function() {
        it("send multiple messages and streams at the same time", function(done) {
            this.timeout(0);

            let someMessageCount = 0;
            let hasFile = false;

            function isDone() {
                if( someMessageCount >= 2 && hasFile ) {
                    done();
                }
            }

            // client.on("data", (chunk, encoding) => {
            //     console.log("data", chunk.toString());
            // });

            // CLIENT - Attach listeners

            const StringRequest = LLProtocol.request.StringRequest;
            // accept a basic string message
            clientLLProtocol.setReader('someMessage', StringRequest);

            let onSomeMessage = function(content) {
                console.log("--someMessage")
                const strings = [
                    "This is the content bla bla bla bla Lorem Ipsum is slechts een proeftekst uit het drukkerij- en zetterijwezen. Lorem Ipsum is de standaard proeftekst in deze bedrijfstak sinds de 16e eeuw, toen een onbekende drukker een zethaak met letters nam en ze door elkaar husselde om een font-catalogus te maken. Het heeft niet alleen vijf eeuwen overleefd maar is ook, vrijwel onveranderd, overgenomen in elektronische letterzetting. Het is in de jaren '60 populair geworden met de introductie van Letraset vellen met Lorem Ipsum passages en meer recentelijk door desktop publishing software zoals Aldus PageMaker die versies van Lorem Ipsum bevatten. Waarom gebruiken we het? Het is al geruime tijd een bekend gegeven dat een lezer, tijdens het bekijken van de layout van een pagina, afgeleid wordt door de tekstuele inhoud. Het belangrijke punt van het gebruik van Lorem Ipsum is dat het uit een min of meer normale verdeling van letters bestaat, in tegenstelling tot Hier uw tekst, hier uw tekst wat het tot min of meer leesbaar nederlands maakt. Veel desktop publishing pakketten en web pagina editors gebruiken tegenwoordig Lorem Ipsum als hun standaard model tekst, en een zoekopdracht naar lorem ipsum ontsluit veel websites die nog in aanbouw zijn. Verscheidene versies hebben zich ontwikkeld in de loop van de jaren, soms per ongeluk soms expres (ingevoegde humor en dergelijke). Waar komt het vandaan? In tegenstelling tot wat algemeen aangenomen wordt is Lorem Ipsum niet zomaar willekeurige tekst. het heeft zijn wortels in een stuk klassieke latijnse literatuur uit 45 v.Chr. en is dus meer dan 2000 jaar oud. Richard McClintock, een professor latijn aan de Hampden-Sydney College in Virginia, heeft één van de meer obscure latijnse woorden, consectetur, uit een Lorem Ipsum passage opgezocht, en heeft tijdens het zoeken naar het woord in de klassieke literatuur de onverdachte bron ontdekt. Lorem Ipsum komt uit de secties 1.10.32 en 1.10.33 van de Finibus Bonorum et Malorum (De uitersten van goed en kwaad) door Cicero, geschreven in 45 v.Chr. Dit boek is een verhandeling over de theorie der ethiek, erg populair tijdens de renaissance. De eerste regel van Lorem Ipsum, Lorem ipsum dolor sit amet.., komt uit een zin in sectie 1.10.32. Het standaard stuk van Lorum Ipsum wat sinds de 16e eeuw wordt gebruikt is hieronder, voor wie er interesse in heeft, weergegeven. Secties 1.10.32 en 1.10.33 van de Finibus Bonorum et Malorum door Cicero zijn ook weergegeven in hun exacte originele vorm, vergezeld van engelse versies van de 1914 vertaling door H. Rackham. Waar kan ik het vinden? Er zijn vele variaties van passages van Lorem Ipsum beschikbaar maar het merendeel heeft te lijden gehad van wijzigingen in een of andere vorm, door ingevoegde humor of willekeurig gekozen woorden die nog niet half geloofwaardig ogen. Als u een passage uit Lorum Ipsum gaat gebruiken dient u zich ervan te verzekeren dat er niets beschamends midden in de tekst verborgen zit. Alle Lorum Ipsum generators op Internet hebben de eigenschap voorgedefinieerde stukken te herhalen waar nodig zodat dit de eerste echte generator is op internet. Het gebruikt een woordenlijst van 200 latijnse woorden gecombineerd met een handvol zinsstructuur modellen om een Lorum Ipsum te genereren die redelijk overkomt. De gegenereerde Lorum Ipsum is daardoor altijd vrij van herhaling, ingevoegde humor of ongebruikelijke woorden etc.",
                    '"Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..." "Không có ai muốn khổ đau cho chính mình, muốn tìm kiếm về nó và muốn có nó, bởi vì nó là sự đau khổ..." Lorem Ipsum là gì? Lorem Ipsum chỉ đơn giản là một đoạn văn bản giả, được dùng vào việc trình bày và dàn trang phục vụ cho in ấn. Lorem Ipsum đã được sử dụng như một văn bản chuẩn cho ngành công nghiệp in ấn từ những năm 1500, khi một họa sĩ vô danh ghép nhiều đoạn văn bản với nhau để tạo thành một bản mẫu văn bản. Đoạn văn bản này không những đã tồn tại năm thế kỉ, mà khi được áp dụng vào tin học văn phòng, nội dung của nó vẫn không hề bị thay đổi. Nó đã được phổ biến trong những năm 1960 nhờ việc bán những bản giấy Letraset in những đoạn Lorem Ipsum, và gần đây hơn, được sử dụng trong các ứng dụng dàn trang, như Aldus PageMaker. Tại sao lại sử dụng nó? Chúng ta vẫn biết rằng, làm việc với một đoạn văn bản dễ đọc và rõ nghĩa dễ gây rối trí và cản trở việc tập trung vào yếu tố trình bày văn bản. Lorem Ipsum có ưu điểm hơn so với đoạn văn bản chỉ gồm nội dung kiểu "Nội dung, nội dung, nội dung" là nó khiến văn bản giống thật hơn, bình thường hơn. Nhiều phần mềm thiết kế giao diện web và dàn trang ngày nay đã sử dụng Lorem Ipsum làm đoạn văn bản giả, và nếu bạn thử tìm các đoạn "Lorem ipsum" trên mạng thì sẽ khám phá ra nhiều trang web hiện vẫn đang trong quá trình xây dựng. Có nhiều phiên bản khác nhau đã xuất hiện, đôi khi do vô tình, nhiều khi do cố ý (xen thêm vào những câu hài hước hay thông tục). Nó đến từ đâu? Trái với quan điểm chung của số đông, Lorem Ipsum không phải chỉ là một đoạn văn bản ngẫu nhiên. Người ta tìm thấy nguồn gốc của nó từ những tác phẩm văn học la-tinh cổ điển xuất hiện từ năm 45 trước Công Nguyên, nghĩa là nó đã có khoảng hơn 2000 tuổi. Một giáo sư của trường Hampden-Sydney College (bang Virginia - Mỹ) quan tâm tới một trong những từ la-tinh khó hiểu nhất, "consectetur", trích từ một đoạn của Lorem Ipsum, và đã nghiên cứu tất cả các ứng dụng của từ này trong văn học cổ điển, để từ đó tìm ra nguồn gốc không thể chối cãi của Lorem Ipsum. Thật ra, nó được tìm thấy trong các đoạn 1.10.32 và 1.10.33 của "De Finibus Bonorum et Malorum" (Đỉnh tối thượng của Cái Tốt và Cái Xấu) viết bởi Cicero vào năm 45 trước Công Nguyên. Cuốn sách này là một luận thuyết đạo lí rất phổ biến trong thời kì Phục Hưng. Dòng đầu tiên của Lorem Ipsum, "Lorem ipsum dolor sit amet..." được trích từ một câu trong đoạn thứ 1.10.32. Trích đoạn chuẩn của Lorem Ipsum được sử dụng từ thế kỉ thứ 16 và được tái bản sau đó cho những người quan tâm đến nó. Đoạn 1.10.32 và 1.10.33 trong cuốn "De Finibus Bonorum et Malorum" của Cicero cũng được tái bản lại theo đúng cấu trúc gốc, kèm theo phiên bản tiếng Anh được dịch bởi H. Rackham vào năm 1914. Làm thế nào để có nó? Có rất nhiều biến thể của Lorem Ipsum mà bạn có thể tìm thấy, nhưng đa số được biến đổi bằng cách thêm các yếu tố hài hước, các từ ngẫu nhiên có khi không có vẻ gì là có ý nghĩa. Nếu bạn định sử dụng một đoạn Lorem Ipsum, bạn nên kiểm tra kĩ để chắn chắn là không có gì nhạy cảm được giấu ở giữa đoạn văn bản. Tất cả các công cụ sản xuất văn bản mẫu Lorem Ipsum đều được làm theo cách lặp đi lặp lại các đoạn chữ cho tới đủ thì thôi, khiến cho lipsum.com trở thành công cụ sản xuất Lorem Ipsum đáng giá nhất trên mạng. Trang web này sử dụng hơn 200 từ la-tinh, kết hợp thuần thục nhiều cấu trúc câu để tạo ra văn bản Lorem Ipsum trông có vẻ thật sự hợp lí. Nhờ thế, văn bản Lorem Ipsum được tạo ra mà không cần một sự lặp lại nào, cũng không cần chèn thêm các từ ngữ hóm hỉnh hay thiếu trật tự.'
                ];

                expect(strings.indexOf(content)).to.be.within(0, 1);
                someMessageCount += 1;

                if( someMessageCount >= 2 ) {
                    clientLLProtocol.removeListener('someMessage', onSomeMessage);
                    isDone();
                }
            };

            clientLLProtocol.on("someMessage", onSomeMessage);


            // SERVER - Attach listeners

            // accept a file
            serverLLProtocol.once("someFile", (request) => {
                console.log("--someFile")
                const filePath = request.headers.path;

                expect(filePath).to.eql(tmp + "/aaa");

                const writer = fs.createWriteStream(filePath + "3");

                request.pipe(writer);

                writer.once("finish", () => {
                    hasFile = true;

                    setImmediate(function() {
                        let file = tmp + "/aaa";
                        let file3 = tmp + "/aaa3";
                        let stats = fs.statSync(file);
                        let stats3  = fs.statSync(file3);

                        expect(stats.size).to.equal(stats3.size);

                        expect( createMD5(fs.readFileSync(file)) ).to.equal( createMD5(fs.readFileSync(file3)) );

                        fs.unlinkSync(file3);

                        isDone();
                    });
                });
            });


            // CLIENT - send messages

            // Send a file
            const reader = fs.createReadStream(tmp + "/aaa");

            const clientResponse1 = new LLProtocol.Response({ event: 'someFile', path: tmp + "/aaa" });

            reader.pipe(clientResponse1);

            clientLLProtocol.send(clientResponse1);

            console.log("tmp aaa fstat size", fs.statSync(tmp + "/aaa").size);

            // SERVER - send messages

            // send a message
            const string1 = "This is the content bla bla bla bla Lorem Ipsum is slechts een proeftekst uit het drukkerij- en zetterijwezen. Lorem Ipsum is de standaard proeftekst in deze bedrijfstak sinds de 16e eeuw, toen een onbekende drukker een zethaak met letters nam en ze door elkaar husselde om een font-catalogus te maken. Het heeft niet alleen vijf eeuwen overleefd maar is ook, vrijwel onveranderd, overgenomen in elektronische letterzetting. Het is in de jaren '60 populair geworden met de introductie van Letraset vellen met Lorem Ipsum passages en meer recentelijk door desktop publishing software zoals Aldus PageMaker die versies van Lorem Ipsum bevatten. Waarom gebruiken we het? Het is al geruime tijd een bekend gegeven dat een lezer, tijdens het bekijken van de layout van een pagina, afgeleid wordt door de tekstuele inhoud. Het belangrijke punt van het gebruik van Lorem Ipsum is dat het uit een min of meer normale verdeling van letters bestaat, in tegenstelling tot Hier uw tekst, hier uw tekst wat het tot min of meer leesbaar nederlands maakt. Veel desktop publishing pakketten en web pagina editors gebruiken tegenwoordig Lorem Ipsum als hun standaard model tekst, en een zoekopdracht naar lorem ipsum ontsluit veel websites die nog in aanbouw zijn. Verscheidene versies hebben zich ontwikkeld in de loop van de jaren, soms per ongeluk soms expres (ingevoegde humor en dergelijke). Waar komt het vandaan? In tegenstelling tot wat algemeen aangenomen wordt is Lorem Ipsum niet zomaar willekeurige tekst. het heeft zijn wortels in een stuk klassieke latijnse literatuur uit 45 v.Chr. en is dus meer dan 2000 jaar oud. Richard McClintock, een professor latijn aan de Hampden-Sydney College in Virginia, heeft één van de meer obscure latijnse woorden, consectetur, uit een Lorem Ipsum passage opgezocht, en heeft tijdens het zoeken naar het woord in de klassieke literatuur de onverdachte bron ontdekt. Lorem Ipsum komt uit de secties 1.10.32 en 1.10.33 van de Finibus Bonorum et Malorum (De uitersten van goed en kwaad) door Cicero, geschreven in 45 v.Chr. Dit boek is een verhandeling over de theorie der ethiek, erg populair tijdens de renaissance. De eerste regel van Lorem Ipsum, Lorem ipsum dolor sit amet.., komt uit een zin in sectie 1.10.32. Het standaard stuk van Lorum Ipsum wat sinds de 16e eeuw wordt gebruikt is hieronder, voor wie er interesse in heeft, weergegeven. Secties 1.10.32 en 1.10.33 van de Finibus Bonorum et Malorum door Cicero zijn ook weergegeven in hun exacte originele vorm, vergezeld van engelse versies van de 1914 vertaling door H. Rackham. Waar kan ik het vinden? Er zijn vele variaties van passages van Lorem Ipsum beschikbaar maar het merendeel heeft te lijden gehad van wijzigingen in een of andere vorm, door ingevoegde humor of willekeurig gekozen woorden die nog niet half geloofwaardig ogen. Als u een passage uit Lorum Ipsum gaat gebruiken dient u zich ervan te verzekeren dat er niets beschamends midden in de tekst verborgen zit. Alle Lorum Ipsum generators op Internet hebben de eigenschap voorgedefinieerde stukken te herhalen waar nodig zodat dit de eerste echte generator is op internet. Het gebruikt een woordenlijst van 200 latijnse woorden gecombineerd met een handvol zinsstructuur modellen om een Lorum Ipsum te genereren die redelijk overkomt. De gegenereerde Lorum Ipsum is daardoor altijd vrij van herhaling, ingevoegde humor of ongebruikelijke woorden etc.";
            let serverResponse1 = new LLProtocol.Response("someMessage", string1);
            serverLLProtocol.send(serverResponse1);

            console.log("string1.length", string1.length);

            setTimeout(function() {
                // send a basic string message ('makeResponse' already calls 'send' for response)
                const string2 = '"Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit..." "Không có ai muốn khổ đau cho chính mình, muốn tìm kiếm về nó và muốn có nó, bởi vì nó là sự đau khổ..." Lorem Ipsum là gì? Lorem Ipsum chỉ đơn giản là một đoạn văn bản giả, được dùng vào việc trình bày và dàn trang phục vụ cho in ấn. Lorem Ipsum đã được sử dụng như một văn bản chuẩn cho ngành công nghiệp in ấn từ những năm 1500, khi một họa sĩ vô danh ghép nhiều đoạn văn bản với nhau để tạo thành một bản mẫu văn bản. Đoạn văn bản này không những đã tồn tại năm thế kỉ, mà khi được áp dụng vào tin học văn phòng, nội dung của nó vẫn không hề bị thay đổi. Nó đã được phổ biến trong những năm 1960 nhờ việc bán những bản giấy Letraset in những đoạn Lorem Ipsum, và gần đây hơn, được sử dụng trong các ứng dụng dàn trang, như Aldus PageMaker. Tại sao lại sử dụng nó? Chúng ta vẫn biết rằng, làm việc với một đoạn văn bản dễ đọc và rõ nghĩa dễ gây rối trí và cản trở việc tập trung vào yếu tố trình bày văn bản. Lorem Ipsum có ưu điểm hơn so với đoạn văn bản chỉ gồm nội dung kiểu "Nội dung, nội dung, nội dung" là nó khiến văn bản giống thật hơn, bình thường hơn. Nhiều phần mềm thiết kế giao diện web và dàn trang ngày nay đã sử dụng Lorem Ipsum làm đoạn văn bản giả, và nếu bạn thử tìm các đoạn "Lorem ipsum" trên mạng thì sẽ khám phá ra nhiều trang web hiện vẫn đang trong quá trình xây dựng. Có nhiều phiên bản khác nhau đã xuất hiện, đôi khi do vô tình, nhiều khi do cố ý (xen thêm vào những câu hài hước hay thông tục). Nó đến từ đâu? Trái với quan điểm chung của số đông, Lorem Ipsum không phải chỉ là một đoạn văn bản ngẫu nhiên. Người ta tìm thấy nguồn gốc của nó từ những tác phẩm văn học la-tinh cổ điển xuất hiện từ năm 45 trước Công Nguyên, nghĩa là nó đã có khoảng hơn 2000 tuổi. Một giáo sư của trường Hampden-Sydney College (bang Virginia - Mỹ) quan tâm tới một trong những từ la-tinh khó hiểu nhất, "consectetur", trích từ một đoạn của Lorem Ipsum, và đã nghiên cứu tất cả các ứng dụng của từ này trong văn học cổ điển, để từ đó tìm ra nguồn gốc không thể chối cãi của Lorem Ipsum. Thật ra, nó được tìm thấy trong các đoạn 1.10.32 và 1.10.33 của "De Finibus Bonorum et Malorum" (Đỉnh tối thượng của Cái Tốt và Cái Xấu) viết bởi Cicero vào năm 45 trước Công Nguyên. Cuốn sách này là một luận thuyết đạo lí rất phổ biến trong thời kì Phục Hưng. Dòng đầu tiên của Lorem Ipsum, "Lorem ipsum dolor sit amet..." được trích từ một câu trong đoạn thứ 1.10.32. Trích đoạn chuẩn của Lorem Ipsum được sử dụng từ thế kỉ thứ 16 và được tái bản sau đó cho những người quan tâm đến nó. Đoạn 1.10.32 và 1.10.33 trong cuốn "De Finibus Bonorum et Malorum" của Cicero cũng được tái bản lại theo đúng cấu trúc gốc, kèm theo phiên bản tiếng Anh được dịch bởi H. Rackham vào năm 1914. Làm thế nào để có nó? Có rất nhiều biến thể của Lorem Ipsum mà bạn có thể tìm thấy, nhưng đa số được biến đổi bằng cách thêm các yếu tố hài hước, các từ ngẫu nhiên có khi không có vẻ gì là có ý nghĩa. Nếu bạn định sử dụng một đoạn Lorem Ipsum, bạn nên kiểm tra kĩ để chắn chắn là không có gì nhạy cảm được giấu ở giữa đoạn văn bản. Tất cả các công cụ sản xuất văn bản mẫu Lorem Ipsum đều được làm theo cách lặp đi lặp lại các đoạn chữ cho tới đủ thì thôi, khiến cho lipsum.com trở thành công cụ sản xuất Lorem Ipsum đáng giá nhất trên mạng. Trang web này sử dụng hơn 200 từ la-tinh, kết hợp thuần thục nhiều cấu trúc câu để tạo ra văn bản Lorem Ipsum trông có vẻ thật sự hợp lí. Nhờ thế, văn bản Lorem Ipsum được tạo ra mà không cần một sự lặp lại nào, cũng không cần chèn thêm các từ ngữ hóm hỉnh hay thiếu trật tự.';
                serverLLProtocol.makeResponse('someMessage', string2);

                console.log("string2.length", string2.length)
            }, 100);
        });

    });

    describe("send large file", function() {
        it("should be able to send large files", function(done) {
            this.timeout(0);

            // let interval = setInterval(function() {
            //     console.log(util.inspect(process.memoryUsage()));
            // }, 1000);

            // let heapdumpInterval = setInterval(function() {
            //     let memory = process.memoryUsage().rss;

            //     if( memory > 1024 * 1024 * 90 ) {
            //         heapdump.writeSnapshot(Date.now() + '.heapsnapshot');
            //     }
            // }, 60000);

            // accept a file
            serverLLProtocol.once("someFile", (request) => {
                const filePath = request.headers.path;

                expect(filePath).to.eql(tmp + "/2015-04-06-ubuntu-trusty.zip");

                const writer = fs.createWriteStream(tmp + "/2015-04-06-ubuntu-trusty-2.zip");

                request.pipe(writer);

                writer.once("finish", () => {
                    setImmediate(function() {
                        let file = tmp + "/2015-04-06-ubuntu-trusty.zip";
                        let file3 = tmp + "/2015-04-06-ubuntu-trusty-2.zip";
                        let stats = fs.statSync(file);
                        let stats3  = fs.statSync(file3);

                        expect(stats.size).to.equal(stats3.size);

                        expect( createMD5(fs.readFileSync(file)) ).to.equal( createMD5(fs.readFileSync(file3)) );

                        fs.unlinkSync(file3);
                        // clearInterval(interval);
                        // clearInterval(heapdumpInterval);

                        done();
                    });
                });
            });

            // Send a file
            const reader = fs.createReadStream(tmp + "/2015-04-06-ubuntu-trusty.zip");
            const clientResponse1 = new LLProtocol.Response({ event: 'someFile', path: tmp + "/2015-04-06-ubuntu-trusty.zip" });
            reader.pipe(clientResponse1);
            clientLLProtocol.send(clientResponse1);
        });

    });
});

