import { error } from './utils/logger'
import { isObject } from './utils/validate'
import * as state from './state'

// this function allows users to invoke the user identification
// calls that, if the integration defines the respective method, will
// more accurately track the user in their respective systems
const identifyUser = (userInfo) => {

  if(!isObject(userInfo)){
    error('identifyUser was called with a non-object as the first argument:', userInfo);
    return;
  }

  // Push to the global state so that new integrations can consume it later
  // Note: a reminder that set will do merge with what's already there
  state.set({
    user: userInfo
  });

  // All currently ready integrations need to recieve this user definition
  state.get().integrations.forEach((integration)=>{
    runIdentifyUserForIntegration(userInfo, integration);
  });
}

const runIdentifyUserForIntegration = (userInfo, integration)=>{
  if(integration.isReady()){
    if(integration.identifyUser){
      try{
        const identifyResult = integration.identifyUser(userInfo);
        if(identifyResult && identifyResult.catch){
          identifyResult.catch(error)
        }
      }catch(e){
        error(e)
      }
    }
  }
}

export { identifyUser, runIdentifyUserForIntegration };
