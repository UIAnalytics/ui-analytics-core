'use strict';

const isString = (s) => !!s && typeof s === 'string';
const isObject = (o) => !!o && typeof o === 'object';
const isFunction = (f) => !!f && {}.toString.call(f) === '[object Function]';

export { isString, isObject, isFunction }
