'use strict';

// TODO: set this default to error and have it configurable
let _logLevel = 'verbose';

// TODO: Add check that console is actually available (for cases where it is not like private mode on ios)
const noop = ()=>{};
const console = window.console || {
  error: noop,
  log: noop,
  info: noop
};

export const error = (...args)=>{
  if(_logLevel === 'verbose' || _logLevel === 'error'){
    console.error(...args)
  }
};
export const log = (...args)=>{
  if(_logLevel === 'verbose'){
    console.log(...args)
  }
};
export const info = (...args)=>{
  if(_logLevel === 'verbose' || _logLevel === 'info'){
    console.info(...args)
  }
};

export const setLogLevel = (level='')=>{
  _logLevel = level;
};
