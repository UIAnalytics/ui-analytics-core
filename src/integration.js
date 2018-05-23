import { isString, isObject } from './utils/validate'
import { error } from './utils/logger'
import * as state from './state'
import * as tracking from './tracking'
import { runIdentifyUserForIntegration } from './user'

class Integration {
  constructor(name, definition, internalOptions = {}){

    // integration is awaiting a full definition for initialization
    this.pendingDefinition = internalOptions.pendingDefinition || false;

    this.name = name;
    this.definition = definition || {};
    this.initialize = this.definition.initialize;
    this.track = this.definition.track;
    this.identifyUser = this.definition.identifyUser;

    this.status = 'pending-definition';
    this.isReady = ()=>this.status === 'ready';

    // options represent the configuration made by the user
    this.options = {};
    this.setOptions = (options)=>{
      this.options = Object.assign(this.options, options);
      if(this.definition.setOptions){
        this.definition.setOptions(this.options);
      }
    };

    // Get the reference to the namespace of the integration.
    this.getToolReference = ()=>{
      if(this.definition.getToolReference){
        return this.definition.getToolReference();
      }
    };

    this.subscriptions = {};
    this.subscribe = (topic, cb)=>{
      const topicSubs = this.subscriptions[topic];
      if(topicSubs && topicSubs.invokeImmediately){
        this.invokeTopicCb(topic, cb);
      }else if(topicSubs){
        topicSubs.push(cb);
      }else {
        this.subscriptions[topic] = [cb];
      }
      return { _subscriptionCb: cb };
    };
    this.unsubscribe = (topic, subscribeReference)=>{
      if(!topic || !subscribeReference || !subscribeReference._subscriptionCb){
        // nothing to unsubscribe from
        return;
      }

      const topicSubs = this.subscriptions[topic];
      if(topicSubs){
        // only remove one reference at a time.
        let filteredOneReference;
        this.subscriptions[topic] = topicSubs.filter((subCb) =>{
          if (!filteredOneReference && subCb === subscribeReference._subscriptionCb) {
            filteredOneReference = true;
            return false;
          }
          return true;
        });
      }
    };
    this.publish = (topic, data, options={})=>{

      if(!topic){
        return;
      }

      const topicSubs = this.subscriptions[topic];

      if(Array.isArray(topicSubs)){
        topicSubs.forEach(cb=>this.invokeTopicCb(topic, cb, data))
      }

      // add the flag that will make the subsequent
      if(options.invokeNewSubs){
        this.subscriptions[topic] = topicSubs ? this.subscriptions[topic] : [];
        this.subscriptions[topic].invokeImmediately = true;

        // TODO: evaluating the need for this
        // this.subscriptions[topic].invokeData = data;
      }
    }
    this.invokeTopicCb = (topic, cb, data)=>{
      // TODO: add more useful information to call
      cb(data);
    };

    this.setGroup = (groupName, groupProperties)=>{
      if(this.definition.setGroup){
        this.definition.setGroup(groupName, groupProperties);
      }
    };

    if(definition){
      this.applyDefintion(definition);
    }
  }

  applyDefintion(definition) {
    this.definition = definition || {};
    this.initialize = definition.initialize;
    this.track = definition.track;
    this.identifyUser = this.definition.identifyUser;

    // start initialization
    if(this.initialize){
      try{
        this.status = 'initializing';

        this.publish('before-init')

        // initialOptions plays a critical role of setting
        // default options or options needed at time of initialization
        const initializeResult = this.initialize(definition.initialOptions);

        ((initializeResult && initializeResult.then) ? initializeResult : Promise.resolve()).then(()=>{
          this.status = 'ready';

          if(this.options && definition.setOptions){
            definition.setOptions(this.options);
          }

          // capture the user if it has already been identified
          if(state.get().user){
            runIdentifyUserForIntegration(state.get().user, this);
          }

          // all of the track calls captured before this point,
          // make sure they should go to this integration, and track them
          state.get().tracks.forEach((trackInstance)=>{
            tracking.runTrackForIntegration(trackInstance, this);
          });

          this.publish('ready', /*data*/null, { invokeNewSubs: true });

        }).catch((e)=>{
          this.fatalError(e);
        });
      }catch(e){
        this.fatalError(e);
      }
    }
  }

  fatalError(e) {
    this.status = 'errored';
    this.publish('error', { error: e });
    error('Fatal Error', e);
  }
}

// Note: we are adding this class as the consumer interface so that we
// can not open up methods that we aren't ready to support publicly,
class IntegrationInterface {
  constructor(integration){

    this.name = integration.name;

    // respond to events happening to the integration
    this.on = integration.subscribe;
    this.off = integration.unsubscribe;

    // set the options for the integration that are needed to finalize initialization
    this.options = integration.setOptions;

    // get the integration api reference
    this.getToolReference = integration.getToolReference;

    // send track events directly to this integration
    this.track = (trackName, trackProperties, trackOptions)=>{
      try {
        tracking.track(trackName, trackProperties, Object.assign({}, trackOptions, { integrationWhitelist: [this.name]}));
      }catch(e){
        error(e);
      }
    };

    // send events directly to a group attached to an integration
    this.group = (groupName)=>{

      return {

        // this function allows the user to define group setup properties
        // if additional values are needed to be specified.
        options: (options)=>{
          try {
            integration.setGroup(groupName, options);
          }catch(e){
            error(e);
          }
        },

        // this track event conveniently adds the group to the groups Array
        // of the track event meaning it's up to the track function to see that
        // groups are defined and act upon them.
        track: (trackName, trackProperties, trackOptions)=>{
          this.track(trackName, trackProperties, Object.assign({}, trackOptions, { groups: [ groupName ]}));
        }
      }
    };

    // convenience access to know if the integration is in a ready state
    this.isReady = integration.isReady
    // get the direct status of the integration
    this.status = ()=>integration.status
  }
}


// integration allows users to reference a defined or a to be defined integration
// and do things with it specifically. Whether that is sending track events directly
// to it or adding event listeners to respond to things changing with the integration.
// We are returning an IntegrationInterface instead of the Integration itself so we can
// limit access to what users can do to the integration specifically for maintaining control
// so we can update the API and understand the backwards compatability of the API
export default function integration(name, definition){

  if(!isString(name)){
    error('integration requires a string name');
    return;
  }

  const currentIntegrations = state.get().integrations;
  let referencedIntegration = currentIntegrations.filter( i => i.name === name )[0];
  const tryingToConfigure = isObject(definition);

  if(referencedIntegration){

    // Upgrade the integration if it is still waiting to be defined
    // If it's already defined, we will do nothing and log this message
    if(tryingToConfigure && referencedIntegration.pendingDefinition){
      referencedIntegration.pendingDefinition = false;
      referencedIntegration.applyDefintion(definition);
    }else if (tryingToConfigure) {
      error(`integration ${name} has already been defined and is attempting to be defined again`);
    }

  }else {

    if(isObject(definition)){
      referencedIntegration = new Integration(name, definition);
    }else {
      referencedIntegration =  new Integration(name, {}, { pendingDefinition: true });
    }

    state.set({
      integrations: currentIntegrations.concat([referencedIntegration])
    });
  }

  return new IntegrationInterface(referencedIntegration);
};
