var ElasticSearch = (function() {
    function generic() {
        var worker = new window.Worker("worker-generic.js");

        attachInteractionHook(function(interaction) {
            worker.postMessage([interaction]);
        });
    }

    function atIntervals() {
        var worker = new window.Worker("worker-atintervals.js");

        attachInteractionHook(function(interaction) {
            worker.postMessage([interaction]);
        });
    }

    function tillLimit() {
        var worker = new window.Worker("worker-tilllimit.js");

        attachInteractionHook(function(interaction) {
            worker.postMessage([interaction]);
        });
    }

    return {
        generic: generic,
        atIntervals: atIntervals,
        tillLimit: tillLimit
    };
})();
