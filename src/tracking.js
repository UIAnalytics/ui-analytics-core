import { error } from './utils/logger'
import { isObject, isString } from './utils/validate'
import * as state from './state'


class Track {

  constructor(type, name, properties, trackOptions) {

    this.type = type;
    this.name = name.trim();

    this.properties = isObject(properties) ? JSON.parse(JSON.stringify(properties)) : {};
    this.trackOptions = isObject(trackOptions) ? JSON.parse(JSON.stringify(trackOptions)) : {};

    const intWhitelist = this.trackOptions.integrationWhitelist;
    this.integrationWhitelist = (Array.isArray(intWhitelist) && intWhitelist.length > 0) ? intWhitelist : [];

    const intBlacklist = this.trackOptions.integrationBlacklist;
    this.integrationBlacklist = (Array.isArray(intBlacklist) && intBlacklist.length > 0) ? intBlacklist : [];

    const groups = this.trackOptions.groups;
    this.groups = (Array.isArray(groups) && groups.length > 0) ? groups : [];

    // this handles making sure that the changes made inside the
    // transformation do not break any assumptions that
    this.runTransform = (transformCb)=>{
      let transformedInstance;
      try {
        transformedInstance = transformCb(Object.assign({}, this));

        // Verify the current needs of the track instance after every transform
        if(!transformedInstance){
          // Currently, we are not allowing transforms to outright remove the instance.
          // This seems to make too many assumptions at this point for how transforms
          // might be used and we don't want to allow this functionality for the sake
          // of not being able to change this behavior once it's introduced
          error(`"${trackInstance.name}" was deleted by a transform. This is currently not allowed and we will ignore this transform. Update the 'integrationBlacklist' array to "all" if you want it to fully block it.`);
          return;
        }

        if(!isString(transformedInstance.name) || !transformedInstance.name.trim()){
          error(`"${this.name}" had it's string name removed by a transform. This is currently not allowed and we will ignore this name change and are reverting it.`);
        }else {
          this.name = transformedInstance.name.trim();
        }

        // For now, we do not want to encourage change this.type in a transform
        this.properties = isObject(transformedInstance.properties) ? JSON.parse(JSON.stringify(transformedInstance.properties)) : {};
        this.trackOptions = isObject(transformedInstance.trackOptions) ? JSON.parse(JSON.stringify(transformedInstance.trackOptions)) : {};
        this.integrationWhitelist = Array.isArray(transformedInstance.integrationWhitelist) ? transformedInstance.integrationWhitelist : [];
        this.integrationBlacklist = Array.isArray(transformedInstance.integrationBlacklist) ? transformedInstance.integrationBlacklist : [];
        this.groups = Array.isArray(transformedInstance.groups) ? transformedInstance.groups : [];


      }catch(e) {
        error(e);
      }
    };
  }
}

const processNewTrackInstance = (trackInstance) => {
  // Run all transforms before adding to tracks state
  state.get().transforms.forEach(trackInstance.runTransform);

  // Push to the global state so that new integrations can consume it later
  state.set({
    tracks: state.get().tracks.concat([trackInstance])
  });

  // All currently ready integrations need to recieve this event
  state.get().integrations.forEach((integration)=>{
    if(integration.isReady()){
      runTrackForIntegration(trackInstance, integration)
    }
  });
};

const track = (name, properties, trackOptions) => {

  if(!isString(name) || !name.trim()){
    error('track was called without a string name as the first argument');
    return;
  }

  processNewTrackInstance(new Track('event', name, properties, trackOptions));
};

const trackPage = (name, properties, trackOptions) => {

  if(!isString(name) || !name.trim()){
    error('trackPage was called without a string name as the first argument');
    return;
  }

  processNewTrackInstance(new Track('page', name, properties, trackOptions));
};

const runTrackForIntegration = (trackInstance, integration)=>{
  if(!trackInstance){
    return;
  }
  const whitelist = trackInstance.integrationWhitelist;
  const blacklist = trackInstance.integrationBlacklist;

  // make sure it's allowed by whitelist and not dissallowed by blacklist
  if((whitelist.length === 0 || whitelist.includes(integration.name)) &&
     (blacklist.length === 0 || !blacklist.includes(integration.name))){

    if(integration.track){
      try{
        const trackResult = integration.track(trackInstance);
        if(trackResult && trackResult.catch){
          trackResult.catch(error)
        }
      }catch(e){
        error(e)
      }
    }else {
      error(`integration: "${integration.name}" is initialized but does not have a track method`)
    }
  }
}

export { track, trackPage, runTrackForIntegration };
