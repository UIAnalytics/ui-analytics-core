/* ui-analytics.js v0.0.1 by UIAnalytics.com */
(function () {
  'use strict';

  var version = "0.0.1";

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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

  function set(newState) {
    globalState = Object.assign({}, globalState, newState);
  }

  function get() {
    return globalState;
  }

  function clear() {
    globalState = defaultState();
  }

  var state = /*#__PURE__*/Object.freeze({
    set: set,
    get: get,
    clear: clear
  });

  var transform = function transform(transformCb) {
    if (!isFunction(transformCb)) {
      error('transform was called without a function as the first argument');
      return;
    }

    set({
      transforms: get().transforms.concat([transformCb])
    });

    get().tracks.forEach(function (trackInstance) {
      trackInstance.runTransform(transformCb);
    });
  };

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var Track = function Track(eventType, eventName, eventProperties, trackOptions) {
    var _this = this;

    _classCallCheck(this, Track);

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
    get().transforms.forEach(trackInstance.runTransform);

    // Push to the global state so that new integrations can consume it later
    set({
      tracks: get().tracks.concat([trackInstance])
    });

    // All currently read integrations need to recieve this event
    get().integrations.forEach(function (integration) {
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
      try {
        integration.track(trackInstance).catch(error);
      } catch (e) {
        error(e);
      }
    }
  };

  function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var Integration = function Integration(name, options) {
    var _this = this;

    _classCallCheck$1(this, Integration);

    this.name = name;
    this.options = options;
    this.initialize = options.initialize;
    this.track = options.track;
    this.ready = false;

    // start initialization
    this.initialize && this.initialize().then(function () {
      _this.ready = true;

      // all of the track calls captured before this point,
      // make sure they should go to this integration, and track them
      get().tracks.forEach(function (trackInstance) {
        runTrackForIntegration(trackInstance, _this);
      });
    }).catch(function (e) {
      error(e);
    });
  };

  var IntegrationInterface = function IntegrationInterface(integration) {
    var _this2 = this;

    _classCallCheck$1(this, IntegrationInterface);

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

    var selectedIntegration = void 0;
    var currentIntegrations = get().integrations;

    if (isObject(options)) {
      selectedIntegration = new Integration(name, options);
      set({
        integrations: currentIntegrations.concat([selectedIntegration])
      });
    } else {
      selectedIntegration = currentIntegrations.filter(function (i) {
        return i.name === name;
      })[0];
    }

    return new IntegrationInterface(selectedIntegration);
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

  window.UIAnalytics = {
      version: version,
      track: track,
      integration: integration,
      integrations: integrations,
      transform: transform,
      _state: state
  };

}());
