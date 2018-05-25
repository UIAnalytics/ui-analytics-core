'use strict';

import { version } from '../package.json'
import integration from './integration'
import { identifyUser, clearAllUserSessions } from './user'
import { track, trackPage } from './tracking'
import { transform } from './transform'
import * as state from './state'

const libInterface = {
    clearAllUserSessions,
    identifyUser,
    integration,
    track,
    trackPage,
    transformEvents: transform,
    version,
    _state: state
};

export default libInterface;
