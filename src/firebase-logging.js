(function() {
	var THIS_FILE_NAME = "firebase-logging.js";

	var THIS_SOURCE_ELEMENT = document.getElementById("firebaselogging");
	if (THIS_SOURCE_ELEMENT == null) {
		THIS_SOURCE_ELEMENT = huntSourceElement();
	}

	var REQUIRED_KEYS = ["apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId"];
	var SRC_URL = THIS_SOURCE_ELEMENT.src;

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
            throw "A required key was not sent in as the query parameter to this script; " + key;
		}

		firebaseConfig[key] = value;
	}

    firebase.initializeApp(firebaseConfig);

	var database = firebase.database();

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

            return {
                ci: _cleanInteraction,
                ivi: _isValidInteraction,
                tiinv: _throwIfInteractionNotValid
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

                return "sessions/" + interaction.sessionID + "/interactions";
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

            ////////////////////////////
            // Function Wrap Up
            ////////////////////////////
            return {
                giuv: _generateInteractionUpdateValue,
                gfdbr: _generateFirebaseDBReference,
                mi: {
                    gfdbr: _generateFirebaseDBReferenceForMultipleInteractions,
                    guo: _generateUpdateObjectForMultipleInteractions
                }
            }
        })();

        ////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////

		var hooks = {};

        ////////////////////////////
        // Generic Hook Code
		// (GenericFirebaseHook)
        ////////////////////////////
        var GenericFirebaseHook = function(shouldLog) {
        	var HOOK_NAME = "GenericFirebaseHook";

            if (!shouldLog) shouldLog = false;

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

        hooks["GenericFirebaseHook"] = GenericFirebaseHook;

        ////////////////////////////
        // Batch Collect At Interval
        // (BatchCollectAtInterval)
        ////////////////////////////
		var BatchCollectAtInterval = function(duration, shouldLog) {
			var HOOK_NAME = "BatchCollectAtInterval";

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

		hooks["BatchCollectAtInterval"] = BatchCollectAtInterval;

        ////////////////////////////
        // Collect Up Till A Limit
        // (CollectToLimit)
        ////////////////////////////
        var CollectToLimitTransformations = (function() {
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

        var CollectToLimit = function(collectionLimit, shouldLog) {
            var HOOK_NAME = "CollectToLimit";

            var DEFAULT_COLLECTION_LIMIT = 1000;
            if (!collectionLimit) collectionLimit = DEFAULT_COLLECTION_LIMIT;
            if (!shouldLog) shouldLog = false;

            var TRANSFORMATION = CollectToLimitTransformations.ap(collectionLimit, shouldLog);
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

        hooks["CollectToLimit"] = CollectToLimit;

        ////////////////////////////
        // Function Wrap Up
        ////////////////////////////

		return hooks;
	})();

    attachInteractionHook(HookStrategies.CollectToLimit(100, true));

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
