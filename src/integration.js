import { isString, isObject } from './utils/validate'
import * as logger from './utils/logger'
import * as state from './state'
import * as tracking from './tracking'

class Integration {
  constructor(name, options, internalOptions = {}){
    this.pendingDefinition = internalOptions.pendingDefinition || false;

    this.name = name;
    this.options = options || {};
    this.initialize = this.options.initialize;
    this.track = this.options.track;
    this.ready = false;

    if(options){
      this.applyOptions(options);
    }
  }

  applyOptions(options) {
    this.options = options || {};
    this.initialize = this.options.initialize;
    this.track = this.options.track;
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
        }).catch((e)=>{
          logger.error(e)
        });
      }catch(e){
        logger.error(e);
      }
    }
  }
}

class IntegrationInterface {
  constructor(integration){

    this.name = integration.name;

    // TODO: as a user I would like to add integration('int').on('ready') and track
    // before the integration is defined. This allows me to define callbacks and actions
    // before the integration as been added
    this.on = (eventName, cb)=>{};

    this.options = ()=>{};
    this.getIdentifiers = ()=>{};
    this.createGroup = ()=>{};

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



export default function integration(name, options){
  if(!isString(name)){
    logger.error('integration requires a string name');
    return;
  }

  const currentIntegrations = state.get().integrations;
  let referencedIntegration = currentIntegrations.filter( i => i.name === name )[0];
  const tryingToConfigure = isObject(options);

  if(referencedIntegration){
    // Upgrade the integration if it is still waiting to be defined
    // If it's already defined, we will do nothing and log this message
    if(tryingToConfigure && referencedIntegration.pendingDefinition){
      referencedIntegration.pendingDefinition = false;
      referencedIntegration.applyOptions(options);
    }else if (tryingToConfigure) {
      logger.error(`integration ${name} has already been defined and is attempting to be defined again`);
    }
  }else {

    if(isObject(options)){
      referencedIntegration = new Integration(name, options);
    }else {
      referencedIntegration =  new Integration(name, {}, { pendingDefinition: true });
    }

    state.set({
      integrations: currentIntegrations.concat([referencedIntegration])
    });
  }
  return new IntegrationInterface(referencedIntegration);
};
