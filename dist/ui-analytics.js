/* ui-analytics.js v0.0.1 by UIAnalytics.com */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.UIAnalytics = factory());
}(this, (function () { 'use strict';

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
  var con = console || {
    error: noop,
    log: noop,
    info: noop
  };

  var error = function error() {
    if (_logLevel === 'verbose' || _logLevel === 'error') {
      con.error.apply(con, arguments);
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

  var Event = function Event(type, name, properties, trackOptions) {
    var _this = this;

    classCallCheck(this, Event);

    this.type = type;
    this.name = name.trim();

    this.properties = isObject(properties) ? JSON.parse(JSON.stringify(properties)) : {};
    this.trackOptions = isObject(trackOptions) ? JSON.parse(JSON.stringify(trackOptions)) : {};

    var intWhitelist = this.trackOptions.integrationWhitelist;
    this.integrationWhitelist = Array.isArray(intWhitelist) && intWhitelist.length > 0 ? intWhitelist : ['all'];

    var intBlacklist = this.trackOptions.integrationBlacklist;
    this.integrationBlacklist = Array.isArray(intBlacklist) && intBlacklist.length > 0 ? intBlacklist : [];

    var groups = this.trackOptions.groups;
    this.groups = Array.isArray(groups) && groups.length > 0 ? groups : [];

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
        _this.groups = Array.isArray(transformedInstance.groups) ? transformedInstance.groups : [];
        _this.type = isString(transformedInstance.type) ? transformedInstance.type : _this.type;
      } catch (e) {
        error(e);
      }
    };
  };

  var track = function track(name, properties, trackOptions) {

    if (!isString(name) || !name.trim()) {
      error('track was called without a string name as the first argument');
      return;
    }

    var trackInstance = new Event('track', name, properties, trackOptions);

    // Run all transforms before calling the
    get$1().transforms.forEach(trackInstance.runTransform);

    // Push to the global state so that new integrations can consume it later
    set$1({
      tracks: get$1().tracks.concat([trackInstance])
    });

    // All currently read integrations need to recieve this event
    get$1().integrations.forEach(function (integration) {
      if (integration.isReady()) {
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
    function Integration(name, definition) {
      var _this = this;

      var internalOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      classCallCheck(this, Integration);


      // integration is awaiting a full definition for initialization
      this.pendingDefinition = internalOptions.pendingDefinition || false;

      this.name = name;
      this.definition = definition || {};
      this.initialize = this.definition.initialize;
      this.track = this.definition.track;

      this.status = 'pending-definition';
      this.isReady = function () {
        return _this.status === 'ready';
      };

      // options represent the configuration made by the user
      this.options = {};
      this.setOptions = function (options) {
        _this.options = Object.assign(_this.options, options);
        if (_this.definition.setOptions) {
          _this.definition.setOptions(_this.options);
        }
      };

      // Get the reference to the namespace of the integration.
      this.getToolReference = function () {
        if (_this.definition.getToolReference) {
          return _this.definition.getToolReference();
        }
      };

      this.subscriptions = {};
      this.subscribe = function (topic, cb) {
        var topicSubs = _this.subscriptions[topic];
        if (topicSubs && topicSubs.invokeImmediately) {
          _this.invokeTopicCb(topic, cb);
        } else if (topicSubs) {
          topicSubs.push(cb);
        } else {
          _this.subscriptions[topic] = [cb];
        }
        return { _subscriptionCb: cb };
      };
      this.unsubscribe = function (topic, subscribeReference) {
        if (!topic || !subscribeReference || !subscribeReference._subscriptionCb) {
          // nothing to unsubscribe from
          return;
        }

        var topicSubs = _this.subscriptions[topic];
        if (topicSubs) {
          // only remove one reference at a time.
          var filteredOneReference = void 0;
          _this.subscriptions[topic] = topicSubs.filter(function (subCb) {
            if (!filteredOneReference && subCb === subscribeReference._subscriptionCb) {
              filteredOneReference = true;
              return false;
            }
            return true;
          });
        }
      };
      this.publish = function (topic, data) {
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};


        if (!topic) {
          return;
        }

        var topicSubs = _this.subscriptions[topic];

        if (Array.isArray(topicSubs)) {
          topicSubs.forEach(function (cb) {
            return _this.invokeTopicCb(topic, cb, data);
          });
        }

        // add the flag that will make the subsequent
        if (options.invokeNewSubs) {
          _this.subscriptions[topic] = topicSubs ? _this.subscriptions[topic] : [];
          _this.subscriptions[topic].invokeImmediately = true;

          // TODO: evaluating the need for this
          // this.subscriptions[topic].invokeData = data;
        }
      };
      this.invokeTopicCb = function (topic, cb, data) {
        // TODO: add more useful information to call
        cb(data);
      };

      this.setGroup = function (groupName, groupProperties) {
        if (_this.definition.setGroup) {
          _this.definition.setGroup(groupName, groupProperties);
        }
      };

      if (definition) {
        this.applyDefintion(definition);
      }
    }

    createClass(Integration, [{
      key: 'applyDefintion',
      value: function applyDefintion(definition) {
        var _this2 = this;

        this.definition = definition || {};
        this.initialize = this.definition.initialize;
        this.track = this.definition.track;

        // start initialization
        // TODO: add a beforeeach that is promise based. I.e. the subscriptions will
        // execute as standard functions but the wrapper around those executions will
        // be promise based
        if (this.initialize) {
          try {
            this.status = 'initializing';

            this.publish('before-init');

            var initializeResult = this.initialize();

            (initializeResult && initializeResult.then ? initializeResult : Promise.resolve()).then(function () {
              _this2.status = 'ready';

              if (_this2.options && _this2.definition.setOptions) {
                _this2.definition.setOptions(_this2.options);
              }

              // all of the track calls captured before this point,
              // make sure they should go to this integration, and track them
              get$1().tracks.forEach(function (trackInstance) {
                runTrackForIntegration(trackInstance, _this2);
              });

              _this2.publish('ready', null, { invokeNewSubs: true });
            }).catch(function (e) {
              _this2.fatalError(e);
            });
          } catch (e) {
            this.fatalError(e);
          }
        }
      }
    }, {
      key: 'fatalError',
      value: function fatalError(e) {
        this.status = 'errored';
        this.publish('error', { error: e });
        error('Fatal Error', e);
      }
    }]);
    return Integration;
  }();

  // Note: we are adding this class as the consumer interface so that we
  // can not open up methods that we aren't ready to support publicly,


  var IntegrationInterface = function IntegrationInterface(integration) {
    var _this3 = this;

    classCallCheck(this, IntegrationInterface);


    this.name = integration.name;

    this.on = integration.subscribe;
    this.off = integration.unsubscribe;
    this.options = integration.setOptions;
    this.getToolReference = integration.getToolReference;

    this.track = function (trackName, trackProperties, trackOptions) {
      try {
        track(trackName, trackProperties, Object.assign({}, trackOptions, { integrationWhitelist: [_this3.name] }));
      } catch (e) {
        error(e);
      }
    };

    this.group = function (groupName, groupProperties) {
      return {
        track: function track$$1(trackName, trackProperties, trackOptions) {
          var setResult = void 0;

          try {
            if (integration.setGroup) {
              setResult = integration.setGroup(groupName, groupProperties);
            }
          } catch (e) {
            error(e);
          }

          // setting the group definition for a given
          (setResult && setResult.then ? setResult : Promise.resolve()).then(function () {
            _this3.track(trackName, trackProperties, Object.assign({}, trackOptions, { groups: [groupName] }));
          });
        }
      };
    };

    this.isReady = integration.isReady;
    this.status = function () {
      return integration.status;
    };

    // this.trackProduct = ()=>{
    //   // TODO: if no track product defined but there is a track send it straight there
    //   // This might get confusing as it is hard to handle the proper event naming
    // }
  };

  function integration(name, definition) {
    if (!isString(name)) {
      error('integration requires a string name');
      return;
    }

    var currentIntegrations = get$1().integrations;
    var referencedIntegration = currentIntegrations.filter(function (i) {
      return i.name === name;
    })[0];
    var tryingToConfigure = isObject(definition);

    if (referencedIntegration) {
      // Upgrade the integration if it is still waiting to be defined
      // If it's already defined, we will do nothing and log this message
      if (tryingToConfigure && referencedIntegration.pendingDefinition) {
        referencedIntegration.pendingDefinition = false;
        referencedIntegration.applyDefintion(definition);
      } else if (tryingToConfigure) {
        error('integration ' + name + ' has already been defined and is attempting to be defined again');
      }
    } else {

      if (isObject(definition)) {
        referencedIntegration = new Integration(name, definition);
      } else {
        referencedIntegration = new Integration(name, {}, { pendingDefinition: true });
      }

      set$1({
        integrations: currentIntegrations.concat([referencedIntegration])
      });
    }
    return new IntegrationInterface(referencedIntegration);
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

  var libInterface = {
      version: version,
      track: track,
      integration: integration,
      transformEvents: transform,
      _state: state
  };

  return libInterface;

})));
