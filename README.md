📊**UIAnalytics.js** is a library designed to handle all of your ui analytics tooling requirements. You can universally capture events, transform them, define and directly work with integrations, and much more.

### API ⚒

#### Tracking

`UIAnalytics.track( eventName, eventProperties, trackOptions )` send events to all of your integrations.

----
#### Integrations

`UIAnalytics.integration( integrationName, integrationDefinition )` define your integration and receive a reference to it.

`UIAnalytics.integration( integrationName )` get a reference to your integration to work directly with it. Note, the integration does not have to be defined yet. When it is defined, the integration will pick up all events sent directly to it.

The reference to the integration offers the following api:

_assuming `const integrationRef = UIAnalytics.integration( 'FakeIntegration' )`_

`integrationRef.options( integrationOptions )` depending on your integration, it will might need some configuration options passed to it to properly complete it's initialization or identification of the application.

`integrationRef.track( eventName, eventProperties )` send events directly to this integration only.

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

`integrationRef.group('groupName').track()` This allows you to create track calls for specific groups definitions for your integration. Internally, this will invoke track in a way that whitelists the event only for this integration and adds this group to the event's group list.

----
#### Transforming Events


`UIAnalytics.transformEvents( transformFn )` defines a function that is used to inspect and potentially change the event it's being called with. This will allow you to migrate events, route them, and even block them.

Your `transformFn` function will be invoked for every event that needs to be processed. This will be ran for all events that have been captured before this point and will be run for all events after this `addTransform` call. What this means is that when integrations are initialized they will start consuming the events that are open for them to consume - any transform that you want to run before that point needs to already be added. Usually that means you should add your scripts for transforms after the inclusion of this library.

The `transformFn` will receive and event instance (see its spec below) and should return that event instance along with it's modifications. If nothing is returned, we will ignore the transformation and keep the event as it was before it was called.

----

### The Event Instance

The default event model structure:

```
{
  type: "track",

  // the string name passed to `track( name )`
  name: "",

  // the properties object passed to `track( name, props )
  properties: {},

  // the original track options passed to `track( name, props, trackOpts )`
  trackOptions: {},

  // current integration whitelist
  integrationWhitelist: [
    "all"
  ],

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
