import { error } from './utils/logger'
import { isString, isObject, isFunction } from './utils/validate'
import * as state from './state'
import * as envMonitor from './environment-monitor'
import UIAnalytics from './index'

const pluginDefaults = {
  name: '',
  triggers: ['immediately', 'manual'],
  maxRuns: 1,
  runCount: 0
};

class Plugin {

  constructor(pluginOptions, pluginRunFn){

    const _invokeRun = (...args)=>{
      try{
        pluginRunFn.call(null, UIAnalytics, ...args);
      }catch(e){
        error(`Plugin errored while invoking its run function`, e);
      }
    };

    this.name = pluginOptions.name;

    // triggers need to be verified and transformed into a duplicate free array of strings
    this.triggers = Array.isArray(pluginOptions.triggers) ? pluginOptions.triggers : [pluginOptions.triggers];

    this.isDefined = isFunction(pluginRunFn);

    this.run = (...args)=>{
      if(!this.isDefined){
        error(`Plugin was attempted to be run but it has not been defined yet`)
      }else if(!this.triggers.includes('manual')) {
        error(`Plugin was attempted to be run directly but it is not configured to be able to do so.
          To call directly, a 'manual' entry needs to be in the plugin triggers field.`)
      }else {
        _invokeRun(...args);
      }
    };

    this.triggers.forEach((triggerName)=>{

      // triggers should map directly to envMonitor events
      // this means that anything we automatically track with
      // the environment will be something a plugin can be triggered by
      if(envMonitor.events[triggerName]){
        let monitor = envMonitor.on(triggerName, ()=>{

          _invokeRun();

          // NOTE: this is fine because our current set of events are one time
          // as that changes we will need to update this to be more aware of that
          // situation.
          envMonitor.off(monitor);
        });
      }
    });
  }
}


// The supported signatures of a plugin:
// #plugin('pluginName', ()=>{}) = configure plugin - invokable
// #plugin({name: 'n', ... }, ()=>{}) = configure plugin - invokable unless triggers specified to not be invokable
// #plugin(()=>{}) = configure plugin - not invokable
// #plugin('pluginName') = reference plugin
const plugin = (pluginOptionsOrNameRef, pluginRunFnRef) => {

  const pluginNameLookup = isString(pluginOptionsOrNameRef) && !isFunction(pluginRunFnRef) ? pluginOptionsOrNameRef : null;
  let pluginOptions;
  let pluginRunFn;
  let pluginInstance;
  let pluginInitialDefinition = false;

  if(pluginNameLookup){
    // we are only looking up a plugin

    // NOTE: this does mean that we are currently not going to support
    // multiple references to plugins that have the same name.
    pluginInstance = state.get().plugins.filter(p => p.name === pluginNameLookup)[0];

    if(!pluginInstance){
      pluginInstance = new Plugin(Object.assign({}, pluginDefaults, { name: pluginNameLookup }));
    }

  } else {

    // we are configuring a new plugin

    pluginInitialDefinition = true;

    if(isFunction(pluginOptionsOrNameRef)){
      pluginRunFn = pluginOptionsOrNameRef;
      pluginOptions = Object.assign({}, pluginDefaults);
    }else if(isFunction(pluginRunFnRef)){

      pluginRunFn = pluginRunFnRef;

      if(isString(pluginOptionsOrNameRef)){
        pluginOptions = Object.assign({}, pluginDefaults, {name: pluginOptionsOrNameRef});
      }else if(isObject(pluginOptionsOrNameRef)){
        pluginOptions = Object.assign({}, pluginDefaults, pluginOptionsOrNameRef);
      }else {
        pluginOptions = Object.assign({}, pluginDefaults);
      }

    }else {
      error('a plugin was attempted to be created but it did not supply a plugin run function as a second argument to the .plugin() function')
      return;
    }

    pluginInstance = new Plugin(pluginOptions, pluginRunFn);

    state.set({
      plugins: state.get().plugins.concat([pluginInstance])
    });

    // if this plugin is currently being defined properly
    // let's run through any initializing properties
    if( pluginInstance.isDefined && pluginInstance.triggers.includes('immediately') ){
      pluginInstance.run();
    }
  }

  return pluginInstance;
};


export { plugin };
