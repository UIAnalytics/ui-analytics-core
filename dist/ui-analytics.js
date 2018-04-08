/* ui-analytics.js v0.0.1 by UIAnalytics.com */
(function () {
  'use strict';

  var version = "0.0.1";

  var integration = function integration(name, options) {};

  var track = function track(eventName, eventProperties) {};

  window.UIAnalytics = {
      version: version,
      track: track,
      integration: integration
  };

}());
