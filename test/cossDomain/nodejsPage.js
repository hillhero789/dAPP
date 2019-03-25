var http = require("http");
var fs = require("fs");
var demo = http.createServer(function(request, response) {
    var path = request.url;
    if (path == "/main") {
        fs.readFile("main.html", function(err, data) {
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.write(data);
            response.end();
        });
    } else {
        fs.readFile("main-ifr.html", function(err, data) {
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.write(data);
            response.end();
        });
    }

}).listen("80");
console.log("server start");