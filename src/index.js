'use strict';

import { version } from '../package.json'
import integration from './integration'
import integrations from './integrations'
import { track } from './tracking'
import * as state from './state'

window.UIAnalytics = {
    version,
    track,
    integration,
    integrations,
    _state: state
};
