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

  // TODO: Add check that console is actually available (for cases where it is not like private mode on ios)

  var noop = function noop() {};
  var console = window.console || {
    error: noop,
    log: noop,
    info: noop
  };

  var error = function error() {
    console.error.apply(console, arguments);
  };

  var defaultState = function defaultState() {
    return JSON.parse(JSON.stringify({
      integrations: [],
      tracks: []
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

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var Track = function Track(eventType, eventName, eventProperties, trackOptions) {
    _classCallCheck(this, Track);

    this.type = eventType;
    this.name = eventName;

    this.properties = eventProperties ? JSON.parse(JSON.stringify(eventProperties)) : {};
    this.trackOptions = trackOptions ? JSON.parse(JSON.stringify(trackOptions)) : {};

    var intWhitelist = this.trackOptions.integrationWhitelist;
    this.integrationWhitelist = Array.isArray(intWhitelist) && intWhitelist.length > 0 ? intWhitelist : ['all'];

    var intBlacklist = this.trackOptions.integrationBlacklist;
    this.integrationBlacklist = Array.isArray(intBlacklist) && intBlacklist.length > 0 ? intBlacklist : [];
  };

  var track = function track(eventName, eventProperties, trackOptions) {

    if (!eventName) {
      error('track was called without an eventName');
      return;
    }

    var trackInstance = new Track('track', eventName, eventProperties, trackOptions);

    // TODO: run through transformers

    // Push to the global state so that new integrations can consume it later
    set({
      tracks: get().tracks.concat([trackInstance])
    });

    // All currently read integrations need to recieve this event
    get().integrations.forEach(function (integration) {
      if (integration.ready && (trackInstance.integrationWhitelist.includes('all') || trackInstance.integrationWhitelist.includes(integration.name)) && !trackInstance.integrationBlacklist.includes(integration.name)) {
        try {
          integration.track(trackInstance).catch(error);
        } catch (e) {
          error(e);
        }
      }
    });
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
      get().tracks.forEach(function (track$$1) {
        if ((track$$1.integrationWhitelist.includes('all') || track$$1.integrationWhitelist.includes(_this.name)) && !track$$1.integrationBlacklist.includes(_this.name)) {
          try {
            _this.track(track$$1).catch(error);
          } catch (e) {
            error(e);
          }
        }
      });
    }).catch(function (e) {
      error(e);
    });
  };

  var IntegrationInterface = function IntegrationInterface(integration) {
    var _this2 = this;

    _classCallCheck$1(this, IntegrationInterface);

    this.name = integration.name;
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
      _state: state
  };

}());
