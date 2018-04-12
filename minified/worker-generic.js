importScripts("/socket.io/socket.io.js");

var socket = io();

var sessionID = function() {
    return socket.io.engine.id;
};

onmessage = function(data) {
    data = data.data;

    var interaction = data[0];
    interaction["sessionID"] = sessionID();

    self.socket.emit("ElasticSearchUserEvent", {
        "sessionID": sessionID(),
        "events": [ interaction ]
    });
};
