import UIAnalytics from '../src/index'
import { plugin } from '../src/plugin'
import * as envMonitor from '../src/environment-monitor'
import { clear as clearState, get as getState } from '../src/state'
import { setLogLevel } from '../src/utils/logger'

describe('UIAnalytics.plugin', ()=>{

  const pluginObjectWithFields = (fields)=>{
    return Object.assign({
      isDefined: false,
      name: expect.any(String),
      run: expect.any(Function),
      triggers: ['immediately', 'manual']
    }, fields);
  };

  beforeEach(() => {
    clearState();
    setLogLevel(/*noLogs*/);
  });

  test('defining and referencing a plugin', ()=>{

    expect(plugin('plugin-a')).toEqual(pluginObjectWithFields());
    expect(plugin('plugin-a', ()=>{ })).toEqual(pluginObjectWithFields({ isDefined: true }));
    expect(plugin('plugin-a')).toEqual(pluginObjectWithFields({ isDefined: true }));

    expect(plugin('plugin-b')).toEqual(pluginObjectWithFields());
    expect(plugin({ name: 'plugin-b' }, ()=>{ })).toEqual(pluginObjectWithFields({ isDefined: true }));
    expect(plugin('plugin-b')).toEqual(pluginObjectWithFields({ isDefined: true }));

    expect(plugin(()=>{ })).toEqual(pluginObjectWithFields({ isDefined: true }));
    expect(plugin(null, ()=>{ })).toEqual(pluginObjectWithFields({ isDefined: true }));
    expect(plugin('', ()=>{ })).toEqual(pluginObjectWithFields({ isDefined: true }));

    expect(plugin()).toEqual(undefined);
    expect(plugin(null)).toEqual(undefined);
    expect(plugin(null, null)).toEqual(undefined);
    expect(plugin(1, 1)).toEqual(undefined);
    expect(plugin(true, true)).toEqual(undefined);
    expect(plugin(false, false)).toEqual(undefined);
    expect(plugin('')).toEqual(undefined);

  });

  test('plugin triggers', ()=>{

    const eventWhitelists = ['page-load', 'page-dom-load', 'page-before-unload', 'page-unload'];

    const pluginAfunction = jest.fn();
    const pluginBfunction = jest.fn();
    const pluginCfunction = jest.fn();

    const envMonitorSubs = [];

    envMonitor.on = jest.fn(function (topic, cb){
      envMonitorSubs.push({
        topic,
        cb
      });

      return {};
    });

    expect(envMonitorSubs).toHaveLength(0);
    expect(pluginAfunction.mock.calls).toHaveLength(0);

    plugin({
      name: 'plugin-a',
      triggers: ['manual', 'immediately', 'page-load', 'page-dom-load', 'page-before-unload', 'page-unload', 'not-real']
    }, pluginAfunction);

    // catch 'immediately' trigger
    expect(pluginAfunction.mock.calls).toHaveLength(1);

    expect(envMonitorSubs).toHaveLength(4);

    expect(pluginBfunction.mock.calls).toHaveLength(0);

    plugin({
      name: 'plugin-b',
      triggers: ['manual', 'immediately', 'page-load', 'page-dom-load', 'page-before-unload', 'page-unload', '', null]
    }, pluginBfunction);

    // catch 'immediately' trigger
    expect(pluginBfunction.mock.calls).toHaveLength(1);

    expect(pluginCfunction.mock.calls).toHaveLength(0);

    // make sure having no triggers doesn't cause issues
    plugin({
      name: 'plugin-c',
      triggers: []
    }, pluginCfunction);

    // no immediately trigger
    expect(pluginCfunction.mock.calls).toHaveLength(0);

    expect(envMonitorSubs).toHaveLength(8);

    envMonitorSubs.forEach(({topic, cb})=>{
      expect(eventWhitelists.includes(topic)).toEqual(true);
      cb();
    });

    expect(pluginAfunction.mock.calls).toHaveLength(eventWhitelists.length + 1 /*for immediately trigger*/);
    expect(pluginBfunction.mock.calls).toHaveLength(eventWhitelists.length + 1 /*for immediately trigger*/);
    expect(pluginCfunction.mock.calls).toHaveLength(0);

    pluginAfunction.mock.calls.forEach((callArgs)=>{
      expect(callArgs).toHaveLength(1);
      expect(callArgs[0]).toEqual(UIAnalytics)
    });


    // manual invoking the function should
    plugin('plugin-b').run('a', 2, null, undefined);

    const pluginCallCount = eventWhitelists.length + 1 /* for immediately */
    expect(pluginBfunction.mock.calls).toHaveLength(pluginCallCount + 1 /*for this direct run*/);
    expect(pluginBfunction.mock.calls[pluginCallCount][0]).toEqual(UIAnalytics)
    expect(pluginBfunction.mock.calls[pluginCallCount][1]).toEqual('a')
    expect(pluginBfunction.mock.calls[pluginCallCount][2]).toEqual(2)
    expect(pluginBfunction.mock.calls[pluginCallCount][3]).toEqual(null)
    expect(pluginBfunction.mock.calls[pluginCallCount][4]).toEqual(undefined)

    plugin('plugin-c').run('a', 2, null, undefined);

    expect(pluginCfunction.mock.calls).toHaveLength(0);
  });
});
