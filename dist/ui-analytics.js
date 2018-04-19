/* ui-analytics.js v0.0.1 by UIAnalytics.com */
(function () {
  'use strict';

  var version = "0.0.1";

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var isString = function isString(s) {
    return !!s && typeof s === 'string';
  };
  var isObject = function isObject(o) {
    return !!o && (typeof o === 'undefined' ? 'undefined' : _typeof(o)) === 'object';
  };
  var isFunction = function isFunction(f) {
    return !!f && {}.toString.call(f) === '[object Function]';
  };

  // TODO: set this default to error and have it configurable

  var _logLevel = 'verbose';

  // TODO: Add check that console is actually available (for cases where it is not like private mode on ios)
  var noop = function noop() {};
  var console = window.console || {
    error: noop,
    log: noop,
    info: noop
  };

  var error = function error() {
    if (_logLevel === 'verbose' || _logLevel === 'error') {
      console.error.apply(console, arguments);
    }
  };

  var defaultState = function defaultState() {
    return JSON.parse(JSON.stringify({
      integrations: [],
      tracks: [],
      transforms: []
    }));
  };

  var globalState = defaultState();

  function set$1(newState) {
    globalState = Object.assign({}, globalState, newState);
  }

  function get$1() {
    return globalState;
  }

  function clear() {
    globalState = defaultState();
  }

  var state = /*#__PURE__*/Object.freeze({
    set: set$1,
    get: get$1,
    clear: clear
  });

  var Track = function Track(eventType, eventName, eventProperties, trackOptions) {
    var _this = this;

    classCallCheck(this, Track);

    this.type = eventType;
    this.name = eventName.trim();

    this.properties = isObject(eventProperties) ? JSON.parse(JSON.stringify(eventProperties)) : {};
    this.trackOptions = isObject(trackOptions) ? JSON.parse(JSON.stringify(trackOptions)) : {};

    var intWhitelist = this.trackOptions.integrationWhitelist;
    this.integrationWhitelist = Array.isArray(intWhitelist) && intWhitelist.length > 0 ? intWhitelist : ['all'];

    var intBlacklist = this.trackOptions.integrationBlacklist;
    this.integrationBlacklist = Array.isArray(intBlacklist) && intBlacklist.length > 0 ? intBlacklist : [];

    // runTransform will handle making sure that the
    this.runTransform = function (transformCb) {
      var transformedInstance = void 0;
      try {
        transformedInstance = transformCb(Object.assign({}, _this));

        // Verify the current needs of the track instance after every transform
        if (!transformedInstance) {
          // Currently, we are not allowing transforms to outright remove the instance.
          // This seems to make too many assumptions at this point for how transforms
          // might be used and we don't want to allow this functionality for the sake
          // of not being able to change this behavior once it's introduced
          error('"' + trackInstance.name + '" was deleted by a transform. This is currently not allowed and we will ignore this transform. Update the \'integrationBlacklist\' array to "all" if you want it to fully block it.');
          return;
        }

        if (!isString(transformedInstance.name) || !transformedInstance.name.trim()) {
          error('"' + _this.name + '" had it\'s string name removed by a transform. This is currently not allowed and we will ignore this name change and are reverting it.');
        } else {
          _this.name = transformedInstance.name.trim();
        }

        _this.properties = isObject(transformedInstance.properties) ? JSON.parse(JSON.stringify(transformedInstance.properties)) : {};
        _this.trackOptions = isObject(transformedInstance.trackOptions) ? JSON.parse(JSON.stringify(transformedInstance.trackOptions)) : {};
        _this.integrationWhitelist = Array.isArray(transformedInstance.integrationWhitelist) ? transformedInstance.integrationWhitelist : [];
        _this.integrationBlacklist = Array.isArray(transformedInstance.integrationBlacklist) ? transformedInstance.integrationBlacklist : [];
        _this.type = isString(transformedInstance.type) ? transformedInstance.type : _this.type;
      } catch (e) {
        error(e);
      }
    };
  };

  var track = function track(eventName, eventProperties, trackOptions) {

    if (!isString(eventName) || !eventName.trim()) {
      error('track was called without a string name as the first argument');
      return;
    }

    var trackInstance = new Track('track', eventName, eventProperties, trackOptions);

    // Run all transforms before calling the
    get$1().transforms.forEach(trackInstance.runTransform);

    // Push to the global state so that new integrations can consume it later
    set$1({
      tracks: get$1().tracks.concat([trackInstance])
    });

    // All currently read integrations need to recieve this event
    get$1().integrations.forEach(function (integration) {
      if (integration.ready) {
        runTrackForIntegration(trackInstance, integration);
      }
    });
  };

  var runTrackForIntegration = function runTrackForIntegration(trackInstance, integration) {
    if (!trackInstance) {
      return;
    }

    // make sure it's allowed by whitelist and not dissallowed by blacklist
    if ((trackInstance.integrationWhitelist.includes('all') || trackInstance.integrationWhitelist.includes(integration.name)) && !trackInstance.integrationBlacklist.includes('all') && !trackInstance.integrationBlacklist.includes(integration.name)) {

      if (integration.track) {
        try {
          var trackResult = integration.track(trackInstance);
          if (trackResult && trackResult.catch) {
            trackResult.catch(error);
          }
        } catch (e) {
          error(e);
        }
      } else {
        error('integration: "' + integration.name + '" is initialized but does not have a track method');
      }
    }
  };

  var Integration = function () {
    function Integration(name, options) {
      var internalOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      classCallCheck(this, Integration);

      this.pendingDefinition = internalOptions.pendingDefinition || false;

      this.name = name;
      this.options = options || {};
      this.initialize = this.options.initialize;
      this.track = this.options.track;
      this.ready = false;

      if (options) {
        this.applyOptions(options);
      }
    }

    createClass(Integration, [{
      key: 'applyOptions',
      value: function applyOptions(options) {
        var _this = this;

        this.options = options || {};
        this.initialize = this.options.initialize;
        this.track = this.options.track;
        this.ready = false;

        // start initialization
        // TODO: add a beforeeach that is promise based. I.e. the subscriptions will
        // execute as standard functions but the wrapper around those executions will
        // be promise based
        if (this.initialize) {
          try {
            var initializeResult = this.initialize();

            (initializeResult && initializeResult.then ? initializeResult : Promise.resolve()).then(function () {
              _this.ready = true;

              // all of the track calls captured before this point,
              // make sure they should go to this integration, and track them
              get$1().tracks.forEach(function (trackInstance) {
                runTrackForIntegration(trackInstance, _this);
              });
            }).catch(function (e) {
              error(e);
            });
          } catch (e) {
            error(e);
          }
        }
      }
    }]);
    return Integration;
  }();

  var IntegrationInterface = function IntegrationInterface(integration) {
    var _this2 = this;

    classCallCheck(this, IntegrationInterface);


    this.name = integration.name;

    // TODO: as a user I would like to add integration('int').on('ready') and track
    // before the integration is defined. This allows me to define callbacks and actions
    // before the integration as been added
    this.on = function (eventName, cb) {};

    this.options = function () {};
    this.getIdentifiers = function () {};
    this.createGroup = function () {};

    this.track = function (trackName, trackProperties, trackOptions) {
      try {
        track(trackName, trackProperties, Object.assign({}, trackOptions, { integrationWhitelist: [_this2.name] }));
      } catch (e) {
        error(e);
      }
    };

    // this.trackProduct = ()=>{
    //   // TODO: if no track product defined but there is a track send it straight there
    //   // This might get confusing as it is hard to handle the proper event naming
    // }
  };

  function integration(name, options) {
    if (!isString(name)) {
      error('integration requires a string name');
      return;
    }

    var currentIntegrations = get$1().integrations;
    var referencedIntegration = currentIntegrations.filter(function (i) {
      return i.name === name;
    })[0];
    var tryingToConfigure = isObject(options);

    if (referencedIntegration) {
      // Upgrade the integration if it is still waiting to be defined
      // If it's already defined, we will do nothing and log this message
      if (tryingToConfigure && referencedIntegration.pendingDefinition) {
        referencedIntegration.pendingDefinition = false;
        referencedIntegration.applyOptions(options);
      } else if (tryingToConfigure) {
        error('integration ' + name + ' has already been defined and is attempting to be defined again');
      }
    } else {

      if (isObject(options)) {
        referencedIntegration = new Integration(name, options);
      } else {
        referencedIntegration = new Integration(name, {}, { pendingDefinition: true });
      }

      set$1({
        integrations: currentIntegrations.concat([referencedIntegration])
      });
    }
    return new IntegrationInterface(referencedIntegration);
  }

  function integrations(integrationNames) {

    // todo, add string asserting too
    if (!Array.isArray(integrationNames)) {
      error('integrations requires an arrat of string names');
      return;
    }

    return integrationNames.map(function (name) {
      return integration(name);
    });
  }

  var transform = function transform(transformCb) {
    if (!isFunction(transformCb)) {
      error('transform was called without a function as the first argument');
      return;
    }

    set$1({
      transforms: get$1().transforms.concat([transformCb])
    });

    get$1().tracks.forEach(function (trackInstance) {
      trackInstance.runTransform(transformCb);
    });
  };

  window.UIAnalytics = {
      version: version,
      track: track,
      integration: integration,
      integrations: integrations,
      transform: transform,
      _state: state
  };

}());
