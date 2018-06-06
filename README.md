📊**UIAnalytics.js** is a library designed to handle all of your ui analytics tooling requirements. You can universally capture events, transform them, define and directly work with integrations, and much more.

### API ⚒

#### Tracking

`UIAnalytics.track( eventName, eventProperties, trackOptions )` send an event to all of your integrations. You can use the `trackOptions` option tweak where your event goes like `groups`, `integrationWhitelist`, or `integrationBlacklist`. Calls to this method will create a Track instance with type equally `event`.

`UIAnalytics.trackPage( pageName, pageProperties, trackOptions )` send a page event to all of your integrations. Generally speaking, integrations take page event tracking as a special consideration. This track call takes the same form as the general purpose `UIAnalytics.track()` function but the Track instance type will be `page` allowing integrations to know the difference and act accordingly. But since it has the same signature as `track()` you may use all of the same functionality for detailing where it should go.

----
#### User Identity

`UIAnalytics.identifyUser( userObject )` will send the user definition to all integrations that have an `identifyUser` function in their definition.

`UIAnalytics.clearAllUserSessions()` will remove any identification passed to `identifyUser` internally to the library as well as invoke all of the current integration's `clearUserSession` definition functions. This should clear all current user/browser session state with your integrations.

----
#### Integrations

`UIAnalytics.integration( integrationName, integrationDefinition )` define your integration and receive a reference to it.

`UIAnalytics.integration( integrationName )` get a reference to your integration to work directly with it. Note, the integration does not have to be defined yet. When it is defined, the integration will pick up all events sent directly to it.

The reference to the integration offers the following api:

_assuming `const integrationRef = UIAnalytics.integration( 'FakeIntegration' )`_

`integrationRef.options( integrationOptions )` depending on your integration, it will might need some configuration options passed to it to properly complete it's initialization or identification of the application.

`integrationRef.track( eventName, eventProperties, trackOptions )` send general events directly to this integration only.

`integrationRef.trackPage( pageName, pageProperties, trackOptions )` send page events directly to this integration only.

`integrationRef.on( eventName, callback )` assign an event listener for the integration lifecycle. This returns an event listener reference that is used to remove the listener later via the `.off` function.
 - available events:
  - `before-init` - emitted the integration's initialize function is called
  - `ready` - emitted when the integration's initialize call completes
  -  `error` - emitted if an error happens when attempting to initialize the integration

`integrationRef.off(eventName, eventListenerRefence)` assign an event listener for the integration lifecycle.

`integrationRef.status()` will provide the integration's current status.
 - possible statuses: `pending-definition`, `initializing`, `ready`, `errored`

`integrationRef.isReady()` is a convenience function to check to see if the integration's status is ready - `status === 'ready'`

`integrationRef.getToolReference()` will return the references to the tool's apis as defined by the integration.

`integrationRef.group('groupName').options( groupOptions )` Some integrations require more information in order to properly create your group. This function allows you to pass data to enrich your groups definition which will ultimately be passed to the integration's `setGroup` function if it has been defined.

`integrationRef.group('groupName').track( eventName, eventProperties, trackOptions )` This allows you to create track calls for specific groups definitions for your integration. Internally, this will invoke track in a way that whitelists the event only for this integration and adds this group to the event's group list.

`integrationRef.group('groupName').trackPage( pageName, pageProperties, trackOptions )` This allows you to create track page calls for specific groups definitions for your integration. Internally, this will invoke trackPage in a way that whitelists the event only for this integration and adds this group to the event's group list.

`integrationRef.clearUserSession()` This allows you to clear the user's session information for this integration specifically. If you want to clear user session information for all integrations use `UIAnalytics.clearAllUserSessions()`


----
#### Transforming Events


`UIAnalytics.transformEvents( transformFn )` defines a function that is used to inspect and potentially change the event it's being called with. This will allow you to migrate events, route them, and even block them.

Your `transformFn` function will be invoked for every event that needs to be processed. This will be ran for all events that have been captured before this point and will be run for all events after this `addTransform` call. What this means is that when integrations are initialized they will start consuming the events that are open for them to consume - any transform that you want to run before that point needs to already be added. Usually that means you should add your scripts for transforms after the inclusion of this library.

The `transformFn` will receive and event instance (see its spec below) and should return that event instance along with it's modifications. If nothing is returned, we will ignore the transformation and keep the event as it was before it was called.

----

### The Track Instance

The default event model structure:

```
{
  // for UIAnalytics.track() this will be 'event' but for
  // UIAnalytics.trackPage() this value will be 'page'
  type: "event",

  // the string name passed to `track( name )`
  name: "",

  // the properties object passed to `track( name, props )
  properties: {},

  // the original track options passed to `track( name, props, trackOpts )`
  trackOptions: {},

  // current integration whitelist
  integrationWhitelist: [],

  // current integration blacklist
  integrationBlacklist: [],

  // the groups specified to be targeted
  groups: []
}
```

Things to know about the event model:

- `integrationWhitelist`, `integrationBlacklist`, and `groups` initially come from the `trackOptions` parameter of `track( name, props, trackOptions )`.
- The `integration( int ).track( 'track1' )` and `integration( int ).group( groupA ).track('track2')` functions are convenience functions for setting the `integrationWhitelist` or `groups` trackOptions properties.
- If an integration is in the event's blacklist then the integration will never consume that event - even if it's in the whitelist.


----
#### Plugins

Plugins are bits of logic that bundle a group of analytics or other tooling logic into a chunk of very portable code.

There are several ways to define a plugin:

```
// give it a string name and then the function to run when triggered
UIAnalytics.plugin( pluginNameString, pluginRunFn );


// provide more override options and then the function to run when triggered
UIAnalytics.plugin( pluginOptionsObject, pluginRunFn );


// go with all of the defaults and just pass the function to run when triggered
UIAnalytics.plugin( pluginRunFn );
```

Plugins will all have the default configuration listed below unless you create a plugin and pass the `pluginOptionsObject` to override them. Note, this override is a shallow merge.

```
// default plugin configuration
{
  // string name of the plugin - this name is how you reference after definition
  name: '',

  // array of string trigger values
  triggers: ['immediately', 'manual']
}
```

**`pluginOptionsObject.triggers`** values represent how the plugin's run function gets invoked. This value should always be an array and can include some or all of these values - just be careful you understand the implications of your plugin being executed multiple times.

- `'manual'` - you want the plugin to be invokable directly by other areas of your website
- `'immediately'` - run as soon as the plugin is defined _(synchronously)_
- `'page-load'` - run when the `window`'s `load` event fires
- `'page-dom-load'` - run when the `document`'s `DOMContentLoaded` event fires
- `'page-before-unload'` - run when the `window`'s `beforeunload` event fires
- `'page-unload'` - run when the `window`'s `unload` event fires

With that, looking at the default plugin configuration section, you see that, unless overridden, all plugins will run as soon as they are defined and they will be allowed to be directly invoked.

**pluginRunFn** is your function that will be ran when an trigger event that matches anything in your triggers configuration array happens. This function will always receive a nonconflicting `UIAnalytics` object reference. It's encouraged to use this object directly and not look for `window.UIAnalytics`.



`UIAnalytics.plugin('your-plugin-name').run()` will get the reference to the defined plugin with the name `'your-plugin-name'` and will directly invoke that plugin if `'manual'` is in its configured triggers (it is by default). When directly calling `run()` on a plugin you can pass arguments to the plugin's function. But note, plugins will always receive the `UIAnalytics` as the first argument - all arguments manually passed in will come after that.

For example:

```
UIAnalytics.plugin({
  name: 'user-name-tracker',
  // we only want this to be run directly
  triggers: ['manual']
}, function(UIAnalytics, firstName, lastName){
  UIAnalytics.track('user-name-change', {
    newName: firstName + ' ' + lastName
  })
});

UIAnalytics.plugin('user-name-tracker').run('Sean', 'Roberts');

```
