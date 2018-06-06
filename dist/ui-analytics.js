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

  var subscriptions = {};

  var _subscribe = function _subscribe(topic, cb) {
    var topicSubs = subscriptions[topic];
    if (topicSubs && topicSubs.invokeImmediately) {

      // TODO: this should be ran async to match the
      // control flow as if invokeImmediately wasn't set
      invokeTopicCb(topic, cb);
    } else if (topicSubs) {
      topicSubs.push(cb);
    } else {
      subscriptions[topic] = [cb];
    }
    return { _subscriptionCb: cb };
  };

  var _unsubscribe = function _unsubscribe(topic, subscribeReference) {
    if (!topic || !subscribeReference || !subscribeReference._subscriptionCb) {
      // nothing to unsubscribe from
      return;
    }

    var topicSubs = subscriptions[topic];
    if (topicSubs) {
      // only remove one reference at a time.
      var filteredOneReference = void 0;
      subscriptions[topic] = topicSubs.filter(function (subCb) {
        if (!filteredOneReference && subCb === subscribeReference._subscriptionCb) {
          filteredOneReference = true;
          return false;
        }
        return true;
      });
    }
  };

  var _publish = function _publish(topic, data) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};


    if (!topic) {
      return;
    }

    var topicSubs = subscriptions[topic];

    if (Array.isArray(topicSubs)) {
      topicSubs.forEach(function (cb) {
        return invokeTopicCb(topic, cb, data);
      });
    }

    // add the flag that will make the subsequent
    if (options.invokeNewSubs) {
      subscriptions[topic] = topicSubs ? subscriptions[topic] : [];
      subscriptions[topic].invokeImmediately = true;

      // NOTE: evaluating need. Leaving out to reduce potential of memory leaking
      // for long living data storing
      // subscriptions[topic].invokeData = data;
    }
  };

  var invokeTopicCb = function invokeTopicCb(topic, cb, data) {
    cb(data);
  };

  var scopedPubSub = function scopedPubSub(topicScope) {
    return {
      publish: function publish(topic, data) {
        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

        return _publish(topicScope + "-" + topic, data, options);
      },
      subscribe: function subscribe(topic, cb) {
        return _subscribe(topicScope + "-" + topic, cb);
      },
      unsubscribe: function unsubscribe(topic, subscribeReference) {
        return _unsubscribe(topicScope + "-" + topic, subscribeReference);
      }
    };
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
      plugins: [],
      tracks: [],
      transforms: [],
      user: null
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

  var Track = function Track(type, name, properties, trackOptions) {
    var _this = this;

    classCallCheck(this, Track);


    this.type = type;
    this.name = name.trim();

    this.properties = isObject(properties) ? JSON.parse(JSON.stringify(properties)) : {};
    this.trackOptions = isObject(trackOptions) ? JSON.parse(JSON.stringify(trackOptions)) : {};

    var intWhitelist = this.trackOptions.integrationWhitelist;
    this.integrationWhitelist = Array.isArray(intWhitelist) && intWhitelist.length > 0 ? intWhitelist : [];

    var intBlacklist = this.trackOptions.integrationBlacklist;
    this.integrationBlacklist = Array.isArray(intBlacklist) && intBlacklist.length > 0 ? intBlacklist : [];

    var groups = this.trackOptions.groups;
    this.groups = Array.isArray(groups) && groups.length > 0 ? groups : [];

    // this handles making sure that the changes made inside the
    // transformation do not break any assumptions that
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

        // For now, we do not want to encourage change this.type in a transform
        _this.properties = isObject(transformedInstance.properties) ? JSON.parse(JSON.stringify(transformedInstance.properties)) : {};
        _this.trackOptions = isObject(transformedInstance.trackOptions) ? JSON.parse(JSON.stringify(transformedInstance.trackOptions)) : {};
        _this.integrationWhitelist = Array.isArray(transformedInstance.integrationWhitelist) ? transformedInstance.integrationWhitelist : [];
        _this.integrationBlacklist = Array.isArray(transformedInstance.integrationBlacklist) ? transformedInstance.integrationBlacklist : [];
        _this.groups = Array.isArray(transformedInstance.groups) ? transformedInstance.groups : [];
      } catch (e) {
        error(e);
      }
    };
  };

  var processNewTrackInstance = function processNewTrackInstance(trackInstance) {
    // Run all transforms before adding to tracks state
    get$1().transforms.forEach(trackInstance.runTransform);

    // Push to the global state so that new integrations can consume it later
    set$1({
      tracks: get$1().tracks.concat([trackInstance])
    });

    // All currently ready integrations need to recieve this event
    get$1().integrations.forEach(function (integration) {
      if (integration.isReady()) {
        runTrackForIntegration(trackInstance, integration);
      }
    });
  };

  var track = function track(name, properties, trackOptions) {

    if (!isString(name) || !name.trim()) {
      error('track was called without a string name as the first argument');
      return;
    }

    processNewTrackInstance(new Track('event', name, properties, trackOptions));
  };

  var trackPage = function trackPage(name, properties, trackOptions) {

    if (!isString(name) || !name.trim()) {
      error('trackPage was called without a string name as the first argument');
      return;
    }

    processNewTrackInstance(new Track('page', name, properties, trackOptions));
  };

  var runTrackForIntegration = function runTrackForIntegration(trackInstance, integration) {
    if (!trackInstance) {
      return;
    }
    var whitelist = trackInstance.integrationWhitelist;
    var blacklist = trackInstance.integrationBlacklist;

    // make sure it's allowed by whitelist and not dissallowed by blacklist
    if ((whitelist.length === 0 || whitelist.includes(integration.name)) && (blacklist.length === 0 || !blacklist.includes(integration.name))) {

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

  // this function allows users to invoke the user identification
  // calls that, if the integration defines the respective method, will
  // more accurately track the user in their respective systems
  var identifyUser = function identifyUser(userInfo) {

    if (!isObject(userInfo)) {
      error('identifyUser was called with a non-object as the first argument:', userInfo);
      return;
    }

    // Push to the global state so that new integrations can consume it later
    // Note: a reminder that set will do merge with what's already there
    set$1({
      user: userInfo
    });

    // All currently ready integrations need to recieve this user definition
    get$1().integrations.forEach(function (integration) {
      runIdentifyUserForIntegration(userInfo, integration);
    });
  };

  var runIdentifyUserForIntegration = function runIdentifyUserForIntegration(userInfo, integration) {
    if (integration.isReady()) {
      if (integration.identifyUser) {
        try {
          var identifyResult = integration.identifyUser(userInfo);
          if (identifyResult && identifyResult.catch) {
            identifyResult.catch(error);
          }
        } catch (e) {
          error(e);
        }
      }
    }
  };

  // invoking this function will clear the internal state of the user as well as
  // invoke all of the currently running integration's user session reset functionality.
  // This _should_ dissassociate the current browser/user session from all integrations.
  var clearAllUserSessions = function clearAllUserSessions() {

    // clear our current internal state of user
    set$1({
      user: null
    });

    // tell all integrations to clear their state of user
    get$1().integrations.forEach(function (integration) {
      integration.clearUserSession();
    });
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
      this.identifyUser = this.definition.identifyUser;

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

      // Get the reference to the integration's actual api.
      this.getToolReference = function () {
        if (_this.definition.getToolReference) {
          return _this.definition.getToolReference();
        }
      };

      // Invokes the integration's function that is in charge of removing the
      // current user's session state.
      this.clearUserSession = function () {
        if (_this.definition.clearUserSession) {
          return _this.definition.clearUserSession();
        }
      };

      this.setGroup = function (groupName, groupProperties) {
        if (_this.definition.setGroup) {
          _this.definition.setGroup(groupName, groupProperties);
        }
      };

      var pubSub = scopedPubSub('integration-' + this.name);
      this.subscribe = pubSub.subscribe;
      this.unsubscribe = pubSub.unsubscribe;
      this.publish = pubSub.publish;

      if (definition) {
        this.applyDefintion(definition);
      }
    }

    createClass(Integration, [{
      key: 'applyDefintion',
      value: function applyDefintion(definition) {
        var _this2 = this;

        this.definition = definition || {};
        this.initialize = definition.initialize;
        this.track = definition.track;
        this.identifyUser = definition.identifyUser;

        // start initialization
        if (this.initialize) {
          try {
            this.status = 'initializing';

            this.publish('before-init');

            // initialOptions plays a critical role of setting
            // default options or options needed at time of initialization
            var initializeResult = this.initialize(definition.initialOptions);

            (initializeResult && initializeResult.then ? initializeResult : Promise.resolve()).then(function () {
              _this2.status = 'ready';

              // apply the initially defined options
              if (_this2.options && definition.setOptions) {
                definition.setOptions(_this2.options);
              }

              // capture the user if it has already been identified
              if (get$1().user) {
                runIdentifyUserForIntegration(get$1().user, _this2);
              }

              // all of the track calls captured before this point,
              // make sure they should go to this integration, and track them
              get$1().tracks.forEach(function (trackInstance) {
                runTrackForIntegration(trackInstance, _this2);
              });

              _this2.publish('ready', /*data*/null, { invokeNewSubs: true });
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

    // respond to events happening to the integration
    this.on = integration.subscribe;
    this.off = integration.unsubscribe;

    // set the options for the integration that are needed to finalize initialization
    this.options = integration.setOptions;

    // get the integration api reference
    this.getToolReference = integration.getToolReference;

    // clear the user's session
    this.clearUserSession = integration.clearUserSession;

    // send track events directly to this integration
    this.track = function (trackName, trackProperties, trackOptions) {
      try {
        track(trackName, trackProperties, Object.assign({}, trackOptions, { integrationWhitelist: [_this3.name] }));
      } catch (e) {
        error(e);
      }
    };

    // send page events directly to this integration
    this.trackPage = function (pageName, pageProperties, trackOptions) {
      try {
        trackPage(pageName, pageProperties, Object.assign({}, trackOptions, { integrationWhitelist: [_this3.name] }));
      } catch (e) {
        error(e);
      }
    };

    // send events directly to a group attached to an integration
    this.group = function (groupName) {

      return {

        // this function allows the user to define group setup properties
        // if additional values are needed to be specified.
        options: function options(_options) {
          try {
            integration.setGroup(groupName, _options);
          } catch (e) {
            error(e);
          }
        },

        // this track event conveniently adds the group to the groups Array
        // of the track event meaning it's up to the track function to see that
        // groups are defined and act upon them.
        track: function track$$1(trackName, trackProperties, trackOptions) {
          _this3.track(trackName, trackProperties, Object.assign({}, trackOptions, { groups: [groupName] }));
        },
        trackPage: function trackPage$$1(pageName, pageProperties, trackOptions) {
          _this3.trackPage(pageName, pageProperties, Object.assign({}, trackOptions, { groups: [groupName] }));
        }
      };
    };

    // convenience access to know if the integration is in a ready state
    this.isReady = integration.isReady;
    // get the direct status of the integration
    this.status = function () {
      return integration.status;
    };
  };

  // integration allows users to reference a defined or a to be defined integration
  // and do things with it specifically. Whether that is sending track events directly
  // to it or adding event listeners to respond to things changing with the integration.
  // We are returning an IntegrationInterface instead of the Integration itself so we can
  // limit access to what users can do to the integration specifically for maintaining control
  // so we can update the API and understand the backwards compatability of the API


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

  var pubSub = scopedPubSub('environment');
  var publish = pubSub.publish;
  var windowListener = window.addEventListener;

  var PAGE_LOAD = 'page-load';
  var DOM_LOADED = 'page-dom-load';
  var PAGE_UNLOAD = 'page-unload';
  var BEFORE_PAGE_UNLOAD = 'page-before-unload';

  // 'page-load', 'dom-loaded', 'when-able', 'new-session'
  // new-session could potentially leverage the existence of a session based cookie or
  //  we could create a sessions using localstorage that we bump on every page load or something to note interactivity

  // the browser fully loaded HTML, and the DOM tree is built, but external resources like pictures <img> and stylesheets may be not yet loaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      publish(DOM_LOADED);
    });
  } else {
    publish(DOM_LOADED);
  }

  // the browser loaded all resources (images, styles etc).
  if (document.readyState === 'interactive') {
    windowListener('load', function () {
      publish(PAGE_LOAD);
    });
  } else if (document.readyState === 'complete') {
    publish(PAGE_LOAD);
  }

  windowListener('beforeunload', function () {
    publish(BEFORE_PAGE_UNLOAD);
  });

  windowListener('unload', function () {
    publish(PAGE_UNLOAD);
  });

  var on = pubSub.subscribe;
  var off = pubSub.unsubscribe;

  // NOTE: events are referenced in kabab case - forcing us to assign
  // in a rather verbose way here
  var events = {};
  events[PAGE_LOAD] = PAGE_LOAD;
  events[DOM_LOADED] = DOM_LOADED;
  events[PAGE_UNLOAD] = PAGE_UNLOAD;
  events[BEFORE_PAGE_UNLOAD] = BEFORE_PAGE_UNLOAD;

  var pluginDefaults = {
    name: '',
    triggers: ['immediately', 'manual'],
    maxRuns: 1,
    runCount: 0
  };

  var Plugin = function Plugin(pluginOptions, pluginRunFn) {
    var _this = this;

    classCallCheck(this, Plugin);


    var _invokeRun = function _invokeRun() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      try {
        pluginRunFn.call.apply(pluginRunFn, [null, libInterface].concat(args));
      } catch (e) {
        error('Plugin errored while invoking its run function', e);
      }
    };

    this.name = pluginOptions.name;

    // triggers need to be verified and transformed into a duplicate free array of strings
    this.triggers = Array.isArray(pluginOptions.triggers) ? pluginOptions.triggers : [pluginOptions.triggers];

    this.isDefined = isFunction(pluginRunFn);

    this.run = function () {
      if (!_this.isDefined) {
        error('Plugin was attempted to be run but it has not been defined yet');
      } else if (!_this.triggers.includes('manual')) {
        error('Plugin was attempted to be run directly but it is not configured to be able to do so.\n          To call directly, a \'manual\' entry needs to be in the plugin triggers field.');
      } else {
        _invokeRun.apply(undefined, arguments);
      }
    };

    this.triggers.forEach(function (triggerName) {

      // triggers should map directly to envMonitor events
      // this means that anything we automatically track with
      // the environment will be something a plugin can be triggered by
      if (events[triggerName]) {
        var monitor = on(triggerName, function () {

          _invokeRun();

          // NOTE: this is fine because our current set of events are one time
          // as that changes we will need to update this to be more aware of that
          // situation.
          off(monitor);
        });
      }
    });
  };

  // The supported signatures of a plugin:
  // #plugin('pluginName', ()=>{}) = configure plugin - invokable
  // #plugin({name: 'n', ... }, ()=>{}) = configure plugin - invokable unless triggers specified to not be invokable
  // #plugin(()=>{}) = configure plugin - not invokable
  // #plugin('pluginName') = reference plugin


  var plugin = function plugin(pluginOptionsOrNameRef, pluginRunFnRef) {

    var pluginNameLookup = isString(pluginOptionsOrNameRef) && !isFunction(pluginRunFnRef) ? pluginOptionsOrNameRef : null;
    var pluginOptions = void 0;
    var pluginRunFn = void 0;
    var pluginInstance = void 0;

    if (pluginNameLookup) {
      // we are only looking up a plugin

      // NOTE: this does mean that we are currently not going to support
      // multiple references to plugins that have the same name.
      pluginInstance = get$1().plugins.filter(function (p) {
        return p.name === pluginNameLookup;
      })[0];

      if (!pluginInstance) {
        pluginInstance = new Plugin(Object.assign({}, pluginDefaults, { name: pluginNameLookup }));
      }
    } else {

      if (isFunction(pluginOptionsOrNameRef)) {
        pluginRunFn = pluginOptionsOrNameRef;
        pluginOptions = Object.assign({}, pluginDefaults);
      } else if (isFunction(pluginRunFnRef)) {

        pluginRunFn = pluginRunFnRef;

        if (isString(pluginOptionsOrNameRef)) {
          pluginOptions = Object.assign({}, pluginDefaults, { name: pluginOptionsOrNameRef });
        } else if (isObject(pluginOptionsOrNameRef)) {
          pluginOptions = Object.assign({}, pluginDefaults, pluginOptionsOrNameRef);
        } else {
          pluginOptions = Object.assign({}, pluginDefaults);
        }
      } else {
        error('a plugin was attempted to be created but it did not supply a plugin run function as a second argument to the .plugin() function');
        return;
      }

      pluginInstance = new Plugin(pluginOptions, pluginRunFn);

      set$1({
        plugins: get$1().plugins.concat([pluginInstance])
      });

      // if this plugin is currently being defined properly
      // let's run through any initializing properties
      if (pluginInstance.isDefined && pluginInstance.triggers.includes('immediately')) {
        pluginInstance.run();
      }
    }

    return pluginInstance;
  };

  var transform = function transform(transformCb) {
    if (!isFunction(transformCb)) {
      error('transform was called without a function as the first argument');
      return;
    }

    set$1({
      transforms: get$1().transforms.concat([transformCb])
    });

    // run all transforms on all current tracks
    get$1().tracks.forEach(function (trackInstance) {
      trackInstance.runTransform(transformCb);
    });
  };

  var libInterface = {
      clearAllUserSessions: clearAllUserSessions,
      identifyUser: identifyUser,
      integration: integration,
      plugin: plugin,
      track: track,
      trackPage: trackPage,
      transformEvents: transform,
      version: version,
      _state: state
  };

  return libInterface;

})));
