import integration from './integration'
import * as logger from './utils/logger'


export default function integrations(integrationNames){

  // todo, add string asserting too
  if(!Array.isArray(integrationNames)){
    logger.error('integrations requires an arrat of string names');
    return;
  }

  return integrationNames.map( name => {
    return integration(name);
  });
};
