import * as state from './state';
import * as logger from './utils/logger';
import {isFunction, isObject, isString} from './utils/validate';

const transform = (transformCb) => {
  if(!isFunction(transformCb)){
    logger.error('transform was called without a function as the first argument');
    return;
  }

  state.set({
    transforms: state.get().transforms.concat([transformCb])
  });

  // run all transforms on all current tracks
  state.get().tracks.forEach((trackInstance)=>{
    trackInstance.runTransform(transformCb);
  });
};

export { transform };
