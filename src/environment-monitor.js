import { scopedPubSub } from './utils/pub-sub'

const pubSub = scopedPubSub('environment');
const publish = pubSub.publish;
const windowListener = window.addEventListener;

const PAGE_LOAD = 'page-load';
const DOM_LOADED = 'page-dom-load';
const PAGE_UNLOAD = 'page-unload';
const BEFORE_PAGE_UNLOAD = 'page-before-unload';

// 'page-load', 'dom-loaded', 'when-able', 'new-session'
// new-session could potentially leverage the existence of a session based cookie or
//  we could create a sessions using localstorage that we bump on every page load or something to note interactivity

// the browser fully loaded HTML, and the DOM tree is built, but external resources like pictures <img> and stylesheets may be not yet loaded.
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', ()=>{
      publish(DOM_LOADED);
  });
}else {
  publish(DOM_LOADED);
}

// the browser loaded all resources (images, styles etc).
if(document.readyState === 'interactive'){
  windowListener('load', ()=>{
    publish(PAGE_LOAD);
  });
}else if(document.readyState === 'complete') {
  publish(PAGE_LOAD);
}

windowListener('beforeunload', ()=>{
  publish(BEFORE_PAGE_UNLOAD);
});

windowListener('unload', ()=>{
  publish(PAGE_UNLOAD);
});


const on = pubSub.subscribe;
const off = pubSub.unsubscribe;

// NOTE: events are referenced in kabab case - forcing us to assign
// in a rather verbose way here
const events = {};
events[PAGE_LOAD] = PAGE_LOAD;
events[DOM_LOADED] = DOM_LOADED;
events[PAGE_UNLOAD] = PAGE_UNLOAD;
events[BEFORE_PAGE_UNLOAD] = BEFORE_PAGE_UNLOAD;

export { on, off, events };
