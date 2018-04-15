import * as logger from './utils/logger'
import * as state from './state'


class Track {
  constructor(eventType, eventName, eventProperties, trackOptions) {
    this.type = eventType;
    this.name = eventName;

    this.properties = eventProperties ? JSON.parse(JSON.stringify(eventProperties)) : {};
    this.trackOptions = trackOptions ? JSON.parse(JSON.stringify(trackOptions)) : {};

    const intWhitelist = this.trackOptions.integrationWhitelist;
    this.integrationWhitelist = (Array.isArray(intWhitelist) && intWhitelist.length > 0)? intWhitelist : ['all'];

    const intBlacklist = this.trackOptions.integrationBlacklist;
    this.integrationBlacklist = (Array.isArray(intBlacklist) && intBlacklist.length > 0) ? intBlacklist : []
  }
}


const track = (eventName, eventProperties, trackOptions) => {

  if(!eventName){
    logger.error('track was called without an eventName');
    return;
  }

  let trackInstance = new Track('track', eventName, eventProperties, trackOptions);

  // TODO: run through transformers

  // Push to the global state so that new integrations can consume it later
  state.set({
    tracks: state.get().tracks.concat([trackInstance])
  });

  // All currently read integrations need to recieve this event
  state.get().integrations.forEach((integration)=>{
    if(integration.ready &&
      (trackInstance.integrationWhitelist.includes('all') || trackInstance.integrationWhitelist.includes(integration.name)) &&
      !trackInstance.integrationBlacklist.includes(integration.name)
    ){
      try{
        integration.track(trackInstance).catch(logger.error);
      }catch(e){
        logger.error(e)
      }
    }
  });
}

export { track };
