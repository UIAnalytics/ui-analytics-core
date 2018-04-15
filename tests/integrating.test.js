import integration from '../src/integration'
import integrations from '../src/integrations'
import { clear as clearState } from '../src/state'

describe.skip('integrating', ()=>{
  beforeEach(() => {
    clearState();
  });

  test('initialization structure/lookup of an integration', () => {
    expect(integration('a')).toBeFalsy();
    expect(integration('a', {})).toEqual({name: 'a', options: {}, trackQueue: []});
    expect(integration('a')).toEqual({name: 'a', options: {}, trackQueue: []});
  });

  test('initializations grab all integrations of by name', () => {
    expect(integration('a')).toBeFalsy();
    expect(integration('b')).toBeFalsy();
    expect(integration('a', {})).toEqual({name: 'a', options: {}, trackQueue: []});
    expect(integration('b', {})).toEqual({name: 'b', options: {}, trackQueue: []});
    expect(integrations(['a', 'b'])).toEqual([
      {name: 'a', options: {}, trackQueue: []},
      {name: 'b', options: {}, trackQueue: []}
    ]);
  });
});
