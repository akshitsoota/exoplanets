var express = require('express'),
    bodyParser = require('body-parser'),
    http = require('http'),
    port = process.argv[2] || 8000,
    io = require('socket.io'),
    jsonfile = require('jsonfile');

var app = express();
var server = http.createServer(app);

app.use(express.static(__dirname));
app.use('/scripts', express.static(__dirname + '/node_modules'));

app.use(bodyParser.json({limit: '50mb'}));
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

server.listen(port, function (err) {
    if(!err) console.log('Listening on: ' + port);
});

var socket = io.listen(server);

var sessions = 0;
socket.on('connection', function(socket) {
    console.log("Starting data collection: ");
    var all_data = [];

    socket.on('userEvent', function(data) {
        console.log(data);
        all_data.push(data);
    });

    socket.on('disconnect', function(socket) {
        console.log("Interaction session ended. Attempting to push to database.");
        sessions++;
        console.log(all_data);
        
        jsonfile.writeFile('interaction-data.json', all_data, function(err) {
            console.error(err);
        });
    });
});
