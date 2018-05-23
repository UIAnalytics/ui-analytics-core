'use strict';

import { version } from '../package.json'
import integration from './integration'
import { identifyUser } from './user'
import { track } from './tracking'
import { transform } from './transform'
import * as state from './state'

const libInterface = {
    identifyUser,
    integration,
    track,
    transformEvents: transform,
    version,
    _state: state
};

export default libInterface;
