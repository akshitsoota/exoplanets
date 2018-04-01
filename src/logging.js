(function() {
    var THIS_FILE_NAME = "logging.js";

    var THIS_SOURCE_ELEMENT = document.getElementById("logging");
    if (THIS_SOURCE_ELEMENT == null) {
        THIS_SOURCE_ELEMENT = huntSourceElement();
    }

    var REQUIRED_KEYS = ["apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId"];
    var SRC_URL = THIS_SOURCE_ELEMENT.src;
    var HAS_ALL_KEYS = true;

    var firebaseConfig= {};
    for (var idx = 0; idx < REQUIRED_KEYS.length; idx++) {
        var key = REQUIRED_KEYS[idx];
        var value = getParameterByName(key, SRC_URL);
        if (value != null) {
            firebaseConfig[key] = value;
            continue;
        }

        key = key.toLowerCase();
        value = getParameterByName(key, SRC_URL);
        if (value == null) {
            HAS_ALL_KEYS = false;
        }

        firebaseConfig[key] = value;
    }

    var database = null;

    // Initialize Firebase if we got all the necessary Firebase Config parameters
    if (HAS_ALL_KEYS) {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
    }

    ////////////////////////////
    // Hook Code
    ////////////////////////////

    var HookStrategies = (function() {
        ////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////

        var HookInteractionPreconditions = (function() {
            function _wrapInteraction(interaction) {
                return _(interaction);
            }

            function _filterUndefinedValues(wrappedInteraction) {
                return wrappedInteraction.omitBy(_.isUndefined);
            }

            function _mapInfinityOut(wrappedInteraction) {
                return wrappedInteraction.mapValues(function (value) {
                    if (value !== Infinity) {
                        return value;
                    }

                    return "Infinity";
                });
            }

            function _stringifyValues(wrapperInteraction) {
                return wrapperInteraction.mapValues(function (value) {
                    return value.toString();
                });
            }

            function _unwrapInteraction(wrappedInteraction) {
                return wrappedInteraction.value();
            }

            function _cleanInteraction(interaction) {
                interaction = _wrapInteraction(interaction);
                interaction = _filterUndefinedValues(interaction);
                interaction = _mapInfinityOut(interaction);
                interaction = _unwrapInteraction(interaction);

                return interaction;
            }

            function _cleanInteractionForAJAX(interaction) {
                interaction = _cleanInteraction(interaction);
                interaction = _wrapInteraction(interaction);
                interaction = _stringifyValues(interaction);
                interaction = _unwrapInteraction(interaction);

                return interaction;
            }

            function _isValidInteraction(interaction) {
                if (!interaction) {
                    return false;
                }

                if (interaction.sessionID == null) {
                    return false;
                }

                return true;
            }

            function _throwIfInteractionNotValid(interaction) {
                if (!_isValidInteraction(interaction)) {
                    throw "Interaction is invalid; interaction = " + interaction;
                }
            }

            function _throwIfFirebaseAppNotInitialized() {
                if (!firebase) {
                    throw "The Firebase Library/Framework was not included"
                }

                try {
                    if (firebase) {
                        firebase.app();
                    }
                } catch (exception) {
                    if (exception && exception.code && exception.code === "app/no-app") {
                        throw "The Firebase Library/Framework was not initialized with a configuration";
                    }
                }
            }

            return {
                ci: _cleanInteraction,
                cifa: _cleanInteractionForAJAX,
                ivi: _isValidInteraction,
                tiinv: _throwIfInteractionNotValid,
                tifani: _throwIfFirebaseAppNotInitialized
            };
        })();

        var HookLogger = (function() {
            function _formattedDate() {
                return new Date().toLocaleString();
            }

            function _log(interaction, hookname, message) {
                HookInteractionPreconditions.tiinv(interaction);
                console.log("[TIME: " + _formattedDate() + "; Session-ID: " + interaction.sessionID + "]\n" + hookname + "- " + message);
            }

            ////////////////////////////
            // Multiple Interactions
            ////////////////////////////

            function _multipleInteractionLog(interactions, hookname, message) {
                console.log("[TIME: " + _formattedDate() + "]\n" + hookname + "- " + message);
            }

            ////////////////////////////
            // Function Wrap Up
            ////////////////////////////
            return {
                l: _log,
                mi: {
                    l: _multipleInteractionLog
                }
            }
        })();

        var HookFactory = (function() {
            function _generateBaseDBReference() {
                return database.ref();
            }

            function _generateChildPathForInteraction(interaction) {
                HookInteractionPreconditions.tiinv(interaction);

                return "sessions/" + interaction.sessionID + "/interactions/" + interaction.time;
            }

            function _generateInteractionUpdateValue(interaction) {
                HookInteractionPreconditions.tiinv(interaction);

                var value = {};
                value[interaction.time] = HookInteractionPreconditions.ci(interaction);

                return value;
            }

            function _generateFirebaseDBReference(interaction) {
                HookInteractionPreconditions.tiinv(interaction);

                return _generateBaseDBReference()
                    .child(_generateChildPathForInteraction(interaction));
            }

            function _generateInteractionForSingleInteractionAJAXCall(interaction) {
                HookInteractionPreconditions.tiinv(interaction);

                return {
                    "time-of-submission": new Date().getTime(),
                    "sessionID": interaction.sessionID,
                    "events": [
                        HookInteractionPreconditions.cifa(interaction)
                    ]
                };
            }

            ////////////////////////////
            // Multiple Interactions
            ////////////////////////////

            function _generateFirebaseDBReferenceForMultipleInteractions(interactions) {
                return _generateBaseDBReference();
            }

            function _generateUpdateObjectForMultipleInteractions(interactions) {
                var updates = {};
                for (var idx = 0; idx < interactions.length; idx++) {
                    var interaction = interactions[idx];
                    updates["/" + _generateChildPathForInteraction(interaction)] = _generateInteractionUpdateValue(interaction);
                }

                return updates;
            }

            function _generateInteractionForMultipleInteractionsAJAXCall(interactions) {
                var mappedInteractions = _(interactions).map(function(interaction) {
                    return HookInteractionPreconditions.cifa(interaction);
                }).value();

                return {
                    "time-of-submission": new Date().getTime(),
                    "sessionID": window.getSessionID(),
                    "events": mappedInteractions
                };
            }

            ////////////////////////////
            // Function Wrap Up
            ////////////////////////////
            return {
                giuv: _generateInteractionUpdateValue,
                gfdbr: _generateFirebaseDBReference,
                gifajax: _generateInteractionForSingleInteractionAJAXCall,
                mi: {
                    gfdbr: _generateFirebaseDBReferenceForMultipleInteractions,
                    guo: _generateUpdateObjectForMultipleInteractions,
                    gifajax: _generateInteractionForMultipleInteractionsAJAXCall,
                }
            }
        })();

        ////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////

        var hooks = {};

        ////////////////////////////////////////////////////////
        // Firebase: Generic Hook Code
        // (FirebaseGenericHook)
        ////////////////////////////////////////////////////////
        var FirebaseGenericHook = function(shouldLog) {
            var HOOK_NAME = "GenericFirebaseHook";

            if (!shouldLog) shouldLog = false;
            HookInteractionPreconditions.tifani();

            return function(interaction) {
                if (!HookInteractionPreconditions.ivi(interaction)) {
                    return;
                }

                if (shouldLog) HookLogger.l(interaction, HOOK_NAME, "Submitting an interaction");

                return HookFactory
                    .gfdbr(interaction)
                    .update(HookFactory.giuv(interaction))
                    .then(function() {
                        if (shouldLog) HookLogger.l(interaction, HOOK_NAME, "Submitted interaction to Firebase");
                    });
            };
        };

        hooks["FirebaseGenericHook"] = FirebaseGenericHook;

        ////////////////////////////////////////////////////////
        // Firebase: Batch Collect At Interval
        // (FirebaseBatchCollectAtInterval)
        ////////////////////////////////////////////////////////
        var FirebaseBatchCollectAtInterval = function(duration, shouldLog) {
            var HOOK_NAME = "BatchCollectAtInterval";

            var DEFAULT_DURATION = 1000; // ms
            if (!duration) duration = DEFAULT_DURATION;
            if (!shouldLog) shouldLog = false;
            HookInteractionPreconditions.tifani();

            var COLLECTION_BIN = [];

            var strategy = function(interaction) {
                if (!HookInteractionPreconditions.ivi(interaction)) {
                    return;
                }

                // Stash into the collection bin for future collection
                COLLECTION_BIN.push(interaction);

                if (shouldLog)
                    HookLogger.mi.l(COLLECTION_BIN, HOOK_NAME, "Added one interaction to the collection bin; " + COLLECTION_BIN.length + " remain to be submitted");
            };

            window.setInterval(function () {
                // Keeping a capture for race condition? I know JS is Single Threaded on browser side but this is all async :/
                var collectionBinCapture = COLLECTION_BIN;

                if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "Batch submitting " + collectionBinCapture.length + " interaction(s)");

                if (collectionBinCapture.length === 0) {
                    if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "No intentions to submit zero logs!");
                    return;
                }

                HookFactory.mi.gfdbr(collectionBinCapture)
                    .update(HookFactory.mi.guo(collectionBinCapture))
                    .then(function() {
                        if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "Submitted " + collectionBinCapture.length + " interaction(s) to Firebase");

                        COLLECTION_BIN = COLLECTION_BIN.splice(collectionBinCapture.length);

                        if (shouldLog) HookLogger.mi.l(null, HOOK_NAME, COLLECTION_BIN.length + " logs exist to be picked up in the next batch");
                    });
            }, duration);

            return strategy;
        };

        hooks["FirebaseBatchCollectAtInterval"] = FirebaseBatchCollectAtInterval;

        ////////////////////////////////////////////////////////
        // Firebase: Collect Up Till A Limit
        // (FirebaseCollectToLimit)
        ////////////////////////////////////////////////////////
        var FirebaseCollectToLimitTransformations = (function() {
            function _attemptProduction(collectionLimit, shouldLog) {
                if (collectionLimit == 1) {
                    return GenericFirebaseHook(shouldLog);
                }

                return undefined;
            }

            return {
                ap: _attemptProduction
            };
        })();

        var FirebaseCollectToLimit = function(collectionLimit, shouldLog) {
            var HOOK_NAME = "CollectToLimit";

            var DEFAULT_COLLECTION_LIMIT = 100;
            if (!collectionLimit) collectionLimit = DEFAULT_COLLECTION_LIMIT;
            if (!shouldLog) shouldLog = false;
            HookInteractionPreconditions.tifani();

            var TRANSFORMATION = FirebaseCollectToLimitTransformations.ap(collectionLimit, shouldLog);
            if (TRANSFORMATION != null) {
                return TRANSFORMATION;
            }

            var COLLECTION_BIN = [];

            var strategy = function(interaction) {
                if (!HookInteractionPreconditions.ivi(interaction)) {
                    return;
                }

                // Stash into the collection bin for future collection
                COLLECTION_BIN.push(interaction);

                if (shouldLog)
                    HookLogger.mi.l(COLLECTION_BIN, HOOK_NAME, "Added one interaction to the collection bin; " + COLLECTION_BIN.length + " are stored to be submitted; Threshold = " + collectionLimit);

                // Determine if the logs should be submitted for Firebase
                if (_readyForFirebaseSubmission()) {
                    _submitToFirebase();
                }
            };

            function _readyForFirebaseSubmission() {
                return COLLECTION_BIN.length >= collectionLimit;
            }

            var IS_FIREBASE_SUBMISSION_IN_PROGRESS = false;

            function _submitToFirebase() {
                if (IS_FIREBASE_SUBMISSION_IN_PROGRESS) {
                    if (shouldLog)
                        HookLogger.mi.l(COLLECTION_BIN, HOOK_NAME, "Attempted to submit " + COLLECTION_BIN.length + " are stored to be submitted but a submission is taking place in the background");

                    // Don't want to unnecessarily send Firebase duplicated information
                    return;
                }

                // Keeping a capture for race condition? I know JS is Single Threaded on browser side but this is all async :/
                // In case of an error, because we haven't cleared out, we still have old logs to submit
                var collectionBinCapture = COLLECTION_BIN;

                if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "Batch submitting " + collectionBinCapture.length + " interaction(s) because limit was hit");

                IS_FIREBASE_SUBMISSION_IN_PROGRESS = true;

                HookFactory.mi.gfdbr(collectionBinCapture)
                    .update(HookFactory.mi.guo(collectionBinCapture))
                    .then(function onResolve() {
                        if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "Submitted " + collectionBinCapture.length + " interaction(s) to Firebase");

                        COLLECTION_BIN = COLLECTION_BIN.splice(collectionBinCapture.length);

                        if (shouldLog) HookLogger.mi.l(null, HOOK_NAME, COLLECTION_BIN.length + " logs exist to be picked up in the next batch");

                        IS_FIREBASE_SUBMISSION_IN_PROGRESS = false;
                    }, function onReject() {
                        IS_FIREBASE_SUBMISSION_IN_PROGRESS = false;
                    });
            }

            return strategy;
        };

        hooks["FirebaseCollectToLimit"] = FirebaseCollectToLimit;

        ////////////////////////////////////////////////////////
        // AJAX Submission: Generic Hook Code
        // (GenericAJAXSubmissionHook)
        ////////////////////////////////////////////////////////
        var GenericAJAXSubmissionHook = function(shouldLog) {
            var HOOK_NAME = "GenericAJAXSubmissionHook";

            if (!shouldLog) shouldLog = false;

            return function(interaction) {
                if (!HookInteractionPreconditions.ivi(interaction)) {
                    return;
                }

                if (shouldLog) HookLogger.l(interaction, HOOK_NAME, "Submitting an interaction");

                return $.ajax({
                    url: "/log-event",
                    type: "POST",
                    data: JSON.stringify(HookFactory.gifajax(interaction)),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json"
                }).done(function() {
                    if (shouldLog) HookLogger.l(interaction, HOOK_NAME, "Submitted interaction via AJAX");
                }).fail(function(err) {
                    if (shouldLog) HookLogger.l(interaction, HOOK_NAME, "AJAX Submission of the interaction failed");
                });
            };
        };

        hooks["GenericAJAXSubmissionHook"] = GenericAJAXSubmissionHook;

        ////////////////////////////////////////////////////////
        // AJAX Submission: Batch Collect At Interval
        // (AJAXBatchCollectAtInterval)
        ////////////////////////////////////////////////////////
        var AJAXBatchCollectAtInterval = function(duration, shouldLog) {
            var HOOK_NAME = "AJAXBatchCollectAtInterval";

            var DEFAULT_DURATION = 1000; // ms
            if (!duration) duration = DEFAULT_DURATION;
            if (!shouldLog) shouldLog = false;

            var COLLECTION_BIN = [];

            var strategy = function(interaction) {
                if (!HookInteractionPreconditions.ivi(interaction)) {
                    return;
                }

                // Stash into the collection bin for future collection
                COLLECTION_BIN.push(interaction);

                if (shouldLog)
                    HookLogger.mi.l(COLLECTION_BIN, HOOK_NAME, "Added one interaction to the collection bin; " + COLLECTION_BIN.length + " remain to be submitted");
            };

            window.setInterval(function () {
                // Keeping a capture for race condition? I know JS is Single Threaded on browser side but this is all async :/
                var collectionBinCapture = COLLECTION_BIN;

                if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "Batch submitting " + collectionBinCapture.length + " interaction(s)");

                if (collectionBinCapture.length === 0) {
                    if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "No intentions to submit zero logs!");
                    return;
                }

                $.ajax({
                    url: "/log-event",
                    type: "POST",
                    data: JSON.stringify(HookFactory.mi.gifajax(collectionBinCapture)),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json"
                }).done(function() {
                    if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "Submitted " + collectionBinCapture.length + " interaction(s) via AJAX");

                    COLLECTION_BIN = COLLECTION_BIN.splice(collectionBinCapture.length);

                    if (shouldLog) HookLogger.mi.l(null, HOOK_NAME, COLLECTION_BIN.length + " logs exist to be picked up in the next batch");
                }).fail(function(err) {
                    if (shouldLog) HookLogger.l(interaction, HOOK_NAME, "AJAX Submission of the interactions failed");
                    if (shouldLog) HookLogger.mi.l(null, HOOK_NAME, COLLECTION_BIN.length + " logs are yet to be picked up");
                });
            }, duration);

            return strategy;
        };

        hooks["AJAXBatchCollectAtInterval"] = AJAXBatchCollectAtInterval;

        ////////////////////////////////////////////////////////
        // AJAX Submission: Collect Up Till A Limit
        // (AJAXCollectToLimit)
        ////////////////////////////////////////////////////////
        var AJAXCollectToLimitTransformations = (function() {
            function _attemptProduction(collectionLimit, shouldLog) {
                if (collectionLimit == 1) {
                    return GenericFirebaseHook(shouldLog);
                }

                return undefined;
            }

            return {
                ap: _attemptProduction
            };
        })();

        var AJAXCollectToLimit = function(collectionLimit, shouldLog) {
            var HOOK_NAME = "CollectToLimit";

            var DEFAULT_COLLECTION_LIMIT = 100;
            if (!collectionLimit) collectionLimit = DEFAULT_COLLECTION_LIMIT;
            if (!shouldLog) shouldLog = false;

            var TRANSFORMATION = AJAXCollectToLimitTransformations.ap(collectionLimit, shouldLog);
            if (TRANSFORMATION != null) {
                return TRANSFORMATION;
            }

            var COLLECTION_BIN = [];

            var strategy = function(interaction) {
                if (!HookInteractionPreconditions.ivi(interaction)) {
                    return;
                }

                // Stash into the collection bin for future collection
                COLLECTION_BIN.push(interaction);

                if (shouldLog)
                    HookLogger.mi.l(COLLECTION_BIN, HOOK_NAME, "Added one interaction to the collection bin; " + COLLECTION_BIN.length + " are stored to be submitted; Threshold = " + collectionLimit);

                // Determine if the logs should be submitted for Firebase
                if (_readyForFirebaseSubmission()) {
                    _submitToFirebase();
                }
            };

            function _readyForFirebaseSubmission() {
                return COLLECTION_BIN.length >= collectionLimit;
            }

            var IS_FIREBASE_SUBMISSION_IN_PROGRESS = false;

            function _submitToFirebase() {
                if (IS_FIREBASE_SUBMISSION_IN_PROGRESS) {
                    if (shouldLog)
                        HookLogger.mi.l(COLLECTION_BIN, HOOK_NAME, "Attempted to submit " + COLLECTION_BIN.length + " are stored to be submitted but a submission is taking place in the background");

                    // Don't want to unnecessarily send Firebase duplicated information
                    return;
                }

                // Keeping a capture for race condition? I know JS is Single Threaded on browser side but this is all async :/
                // In case of an error, because we haven't cleared out, we still have old logs to submit
                var collectionBinCapture = COLLECTION_BIN;

                if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "Batch submitting " + collectionBinCapture.length + " interaction(s) because limit was hit");

                IS_FIREBASE_SUBMISSION_IN_PROGRESS = true;

                $.ajax({
                    url: "/log-event",
                    type: "POST",
                    data: JSON.stringify(HookFactory.mi.gifajax(collectionBinCapture)),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json"
                }).done(function() {
                    if (shouldLog) HookLogger.mi.l(collectionBinCapture, HOOK_NAME, "Submitted " + collectionBinCapture.length + " interaction(s) via AJAX");

                    COLLECTION_BIN = COLLECTION_BIN.splice(collectionBinCapture.length);

                    if (shouldLog) HookLogger.mi.l(null, HOOK_NAME, COLLECTION_BIN.length + " logs exist to be picked up in the next batch");

                    IS_FIREBASE_SUBMISSION_IN_PROGRESS = false;
                }).fail(function(err) {
                    IS_FIREBASE_SUBMISSION_IN_PROGRESS = false;

                    if (shouldLog) HookLogger.l(interaction, HOOK_NAME, "AJAX Submission of the interactions failed");
                    if (shouldLog) HookLogger.mi.l(null, HOOK_NAME, COLLECTION_BIN.length + " logs are yet to be picked up");
                });
            }

            return strategy;
        };

        hooks["AJAXCollectToLimit"] = AJAXCollectToLimit;

        ////////////////////////////
        // Function Wrap Up
        ////////////////////////////

        return hooks;
    })();

    attachInteractionHook(HookStrategies.AJAXCollectToLimit(100, true));

    ///////////////////////////////
    // Generic Utility Functions
    ///////////////////////////////
    function huntSourceElement() {
        var pageScriptTags = Array.from(document.getElementsByTagName("script"));
        for (var idx = 0; idx < pageScriptTags.length; idx++) {
            var script = pageScriptTags[idx];
            if (script && script.src && script.src.indexOf(THIS_FILE_NAME) !== -1) {
                return script;
            }
        }

        throw "Unable to find the source element that included this source file!";
    }

    // Adapted from: https://stackoverflow.com/a/901144/705471
    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    ////////////////////////////
    // Generic Window Hooks
    ////////////////////////////
    window.getSessionID = function() {
        return socket.io.engine.id;
    }
})();
