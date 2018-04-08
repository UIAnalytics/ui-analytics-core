'use strict';

import { version } from '../package.json'
import { integration } from './integration'
import { track } from './tracking'

window.UIAnalytics = {
    version,
    track,
    integration
};
