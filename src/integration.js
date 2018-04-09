'use strict';

import { isString, isObject } from './utils/validate'
import * as logger from './utils/logger'

const _integrations = [];

const integration = (name, options) => {
  if(!isString(name)){
    logger.error('integration requires a string name');
    return;
  }

  let selectedIntegration;

  if(isObject(options)){
    selectedIntegration = {
      name,
      options
    };

    _integrations.push(selectedIntegration);

  }else {
    selectedIntegration = _integrations.filter( i => i.name === name )[0];
  }

  return selectedIntegration;
};

export { integration };
