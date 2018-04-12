var express = require('express'),
    bodyParser = require('body-parser'),
    http = require('http'),
    port = process.argv[2] || 8000,
    io = require('socket.io'),
    jsonfile = require('jsonfile'),
    request = require("request-promise");

var app = express();
var server = http.createServer(app);

app.use(express.static(__dirname));
app.use('/scripts', express.static(__dirname + '/node_modules'));

app.use(bodyParser.json({limit: "100mb"}));

app.post("/log-event", function(request, response) {
    // Request Body Format
    // {
    //      "time-of-submission": <<epoch>>,
    //      "sessionID": <<session-ID>>,
    //      "events": [...]
    // }

    var jsonBody = request.body;
    var time_of_submission = jsonBody["time-of-submission"];
    var sessionID = jsonBody["sessionID"];
    var events = jsonBody["events"];

    jsonfile.writeFile("events/events-" + sessionID + "-" + time_of_submission + ".json", {
        "count": events.length,
        "events": events
    });

    response.send({
        "success": true
    });
});

app.post("/log-es-event", function(req, response) {
    var jsonBody = req.body;
    var sessionID = jsonBody["sessionID"];
    var events = jsonBody["events"];

    function generateNextPromise(nextIndex, offset) {
        if (nextIndex === events.length) {
            return new Promise(function(resolve) {
                response.send({
                    "success": true
                });
                resolve();
            });
        }

        offset = offset || 0;

        var options = {
            "method": "PUT",
            "url": "http://localhost:9200/events/" + sessionID + "/" + (offset + nextIndex),
            "body": events[nextIndex],
            "json": true
        };

        return request(options)
            .then(function(body) {
                return generateNextPromise(nextIndex + 1, offset);
            })
            .catch(function(error) {
                response.status(500).send({
                    "success": false,
                    "error": error.toString()
                });
            });
    }

    request("http://localhost:9200/events/_search?q=" + sessionID)
        .then(function(resp) {
            return generateNextPromise(0, JSON.parse(resp)["hits"]["total"]);
        })
        .catch(function(error) {
            response.status(500).send({
                "success": false,
                "error": error.toString()
            });
        });
});

function bulkSendElasticInteractions(data, callback) {
    var events = "";
    for (var idx = 0; idx < data["events"].length; idx++) {
        events += '{ "index" : { "_type" : "_doc" } }\n';
        events += JSON.stringify(data["events"][idx]) + "\n";
    }

    var options = {
        "method": "POST",
        "url": "http://localhost:9200/events/" + data["sessionID"] + "/_bulk",
        "body": events,
        "headers": {
            "Content-Type": "application/json"
        }
    };

    request(options)
        .then(function() {
            callback("Done!");
        })
        .catch(function(error) {
            console.log(error);
        })
}

server.listen(port, function (err) {
    if(!err) console.log('Listening on: ' + port);
});

var socket = io.listen(server);

var sessions = 0;
socket.on('connection', function(socket) {
    // console.log("Starting data collection: ");
    var all_data = [];

    socket.on('userEvent', function(data) {
        // console.log(data);
        all_data.push(data);
    });

    socket.on("ElasticSearchUserEvent", function(data, callback) {
        bulkSendElasticInteractions(data, callback);
    });

    socket.on('disconnect', function(socket) {
        // console.log("Interaction session ended. Attempting to push to database.");
        sessions++;
        // console.log(all_data);
        
        jsonfile.writeFile('interaction-data.json', all_data, function(err) {
            // console.error(err);
        });
    });
});
