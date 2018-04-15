'use strict';

import { isString, isObject } from './utils/validate'
import * as logger from './utils/logger'
import * as state from './state'
import * as tracking from './tracking'

const _integrations = [];

class Integration {
  constructor(name, options){
    this.name = name;
    this.options = options;
    this.initialize = options.initialize;
    this.track = options.track;
    this.ready = false;

    // start initialization
    this.initialize && this.initialize().then(()=>{
      this.ready = true;

      // all of the track calls captured before this point,
      // make sure they should go to this integration, and track them
      state.get().tracks.forEach((track)=>{
        if((track.integrationWhitelist.includes('all') || track.integrationWhitelist.includes(this.name)) &&
          !track.integrationBlacklist.includes(this.name)
        ){
          try{
            this.track(track).catch(logger.error);
          }catch(e){
            logger.error(e)
          }
        }
      });
    }).catch((e)=>{
      logger.error(e)
    });
  }
}

class IntegrationInterface {
  constructor(integration){
    this.name = integration.name;
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

  let selectedIntegration;
  const currentIntegrations = state.get().integrations;

  if(isObject(options)){


    selectedIntegration = new Integration(name, options);

    state.set({
      integrations: currentIntegrations.concat([selectedIntegration])
    });

  }else {
    selectedIntegration = currentIntegrations.filter( i => i.name === name )[0];
  }

  return new IntegrationInterface(selectedIntegration);
};
