'use strict';

import { version } from '../package.json'
import integration from './integration'
import { track } from './tracking'
import { transform } from './transform'
import * as state from './state'

const libInterface = {
    version,
    track,
    integration,
    transformEvents: transform,
    _state: state
};

export default libInterface;
