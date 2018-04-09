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

  var _integrations = [];

  var integration = function integration(name, options) {
    if (!isString(name)) {
      error('integration requires a string name');
      return;
    }

    var selectedIntegration = void 0;

    if (isObject(options)) {
      selectedIntegration = {
        name: name,
        options: options
      };

      _integrations.push(selectedIntegration);
    } else {
      selectedIntegration = _integrations.filter(function (i) {
        return i.name === name;
      })[0];
    }

    return selectedIntegration;
  };

  var track = function track(eventName, eventProperties) {};

  window.UIAnalytics = {
      version: version,
      track: track,
      integration: integration
  };

}());
