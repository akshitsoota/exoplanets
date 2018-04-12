importScripts("/socket.io/socket.io.js");

var socket = io();

var collectionBin = [];
var limit = 20;
var isCollectionInProcess = false;

var sessionID = function() {
    return socket.io.engine.id;
};

onmessage = function(data) {
    data = data.data;

    var interaction = data[0];
    interaction["sessionID"] = sessionID();
    collectionBin.push(interaction);

    if (collectionBin.length >= limit) {
        if (isCollectionInProcess) {
            return;
        }

        isCollectionInProcess = true;

        var captureLength = collectionBin.length;

        console.log("Emitting now with Session ID", sessionID());

        socket.emit("ElasticSearchUserEvent", {
            "sessionID": sessionID(),
            "events": collectionBin
        }, function(_) {
            console.log("Received ACK from WebSocket with Session ID", sessionID());

            collectionBin = collectionBin.splice(captureLength);
            isCollectionInProcess = false;
        });
    }
};
