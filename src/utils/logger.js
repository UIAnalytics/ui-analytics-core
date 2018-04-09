'use strict';

// TODO: Add check that console is actually available (for cases where it is not like private mode on ios)

const noop = ()=>{};
const console = window.console || {
  error: noop,
  log: noop,
  info: noop
};

export const error = (...args)=>{
  console.error(...args)
};
export const log = (...args)=>{
  console.log(...args)
};
export const info = (...args)=>{
  console.info(...args)
};
