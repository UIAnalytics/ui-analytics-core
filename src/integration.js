import { isString, isObject } from './utils/validate'
import * as logger from './utils/logger'
import * as state from './state'
import * as tracking from './tracking'

class Integration {
  constructor(name, definition, internalOptions = {}){

    // integration is awaiting a full definition for initialization
    this.pendingDefinition = internalOptions.pendingDefinition || false;

    this.name = name;
    this.definition = definition || {};
    this.initialize = this.definition.initialize;
    this.track = this.definition.track;

    this.ready = false;

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
         this.subscriptions[topic] = topicSubs.filter((sub) =>{
          return sub !== subscribeReference._subscriptionCb;
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

    if(definition){
      this.applyDefintion(definition);
    }
  }

  applyDefintion(definition) {
    this.definition = definition || {};
    this.initialize = this.definition.initialize;
    this.track = this.definition.track;
    this.ready = false;

    // start initialization
    // TODO: add a beforeeach that is promise based. I.e. the subscriptions will
    // execute as standard functions but the wrapper around those executions will
    // be promise based
    if(this.initialize){
      try{
        const initializeResult = this.initialize();

        ((initializeResult && initializeResult.then) ? initializeResult : Promise.resolve()).then(()=>{
          this.ready = true;

          // all of the track calls captured before this point,
          // make sure they should go to this integration, and track them
          state.get().tracks.forEach((trackInstance)=>{
            tracking.runTrackForIntegration(trackInstance, this);
          });

          this.publish('ready', null, { invokeNewSubs: true });

        }).catch((e)=>{
          this.publish('init-error', { error: e });
          logger.error(e);
        });
      }catch(e){
        this.publish('init-error', { error: e });
        logger.error(e);
      }
    }
  }
}

class IntegrationInterface {
  constructor(integration){

    this.name = integration.name;

    this.on = integration.subscribe;
    this.off = integration.unsubscribe;

    this.options = (options)=>{

    };
    this.getIdentifiers = ()=>{};
    this.createGroup = ()=>{

    };

    this.track = (trackName, trackProperties, trackOptions)=>{
      try {
        tracking.track(trackName, trackProperties, Object.assign({}, trackOptions, { integrationWhitelist: [this.name]}));
      }catch(e){
        logger.error(e);
      }
    };


    // this.trackProduct = ()=>{
    //   // TODO: if no track product defined but there is a track send it straight there
    //   // This might get confusing as it is hard to handle the proper event naming
    // }
  }
}



export default function integration(name, definition){
  if(!isString(name)){
    logger.error('integration requires a string name');
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
      logger.error(`integration ${name} has already been defined and is attempting to be defined again`);
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
