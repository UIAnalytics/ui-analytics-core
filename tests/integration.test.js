import { integration } from '../src/integration'

test('initialization structure/lookup of an integration', () => {
  expect(integration('a')).toBeFalsy();

  const a = integration('a', {});

  expect(a).toMatchObject({});
  expect(integration('a')).toMatchObject({});
});
