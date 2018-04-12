importScripts("/socket.io/socket.io.js");

var socket = io();

var collectionBin = [];
var duration = 1000; // in ms
var isCollectionInProcess = false;

var sessionID = function() {
    return socket.io.engine.id;
};

setInterval(function() {
    var captureLength = collectionBin.length;
    if (captureLength === 0 || !self.socket || isCollectionInProcess) {
        return;
    }

    isCollectionInProcess = true;

    console.log("Emitting now with Session ID", sessionID(), "with Capture Length", captureLength);

    self.socket.emit("ElasticSearchUserEvent", {
        "sessionID": sessionID(),
        "events": collectionBin
    }, function() {
        console.log("Received ACK from WebSocket with Session ID", sessionID());

        collectionBin = collectionBin.splice(captureLength);
        isCollectionInProcess = false;
    });
}, duration);

onmessage = function(data) {
    data = data.data;

    var interaction = data[0];
    interaction["sessionID"] = sessionID();
    collectionBin.push(interaction);
};
