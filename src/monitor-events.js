var socket = io();
var timestamp = null;
var lastMouseX = null;
var lastMouseY = null;

var events = [];

var log = function(e) {
    if (timestamp === null) {
        timestamp = Date.now();
        lastMouseX = e.screenX;
        lastMouseY = e.screenY;
        return;
    }
    
    var now = Date.now(), 
    dt = now - timestamp, 
    dx = e.screenX, 
    dy = e.screenY, 
    speedX = Math.round(dx/dt), 
    speedY = Math.round(dy/dt);
    
    timestamp = now; // update global
    
    console.log(e.target.__data__);
    // construct interaction object
    var interaction = {
            "sessionID": socket.io.engine.id,
            "time": Date.now(),
            "x-position": e.screenX,
            "y-position": e.screenY,
            "x-velocity": speedX || 0,
            "y-velocity": speedY || 0,
            "abs-velocity": Math.sqrt(Math.pow(speedX, 2) + Math.pow(speedY, 2)) || 0,
            "type": e.type,
            "data": CircularJSON.stringify(e.target.__data__),
            "element": event.target.tagName
    };

    socket.emit('userEvent', interaction);
};

for(var i in window) {
    if(i.startsWith("on"))
        events.push(i.substr(2)); 
}

events.forEach(function(eventName) {
    window.addEventListener(eventName, log); 
});