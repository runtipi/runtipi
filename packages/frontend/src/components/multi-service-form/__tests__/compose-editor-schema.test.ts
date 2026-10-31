import { expect, test } from 'vitest';
import { validateComposeEditorJson } from '../compose-editor-schema';

const services = [{ name: 'web', image: 'nginx:alpine', isMain: true, internalPort: 80 }];

test('accepts a valid custom app configuration', () => {
  expect(validateComposeEditorJson({ services })).toBe(true);
});

test.each([null, [], {}, 'migrations/setup.yml'])('rejects inline migrations: %j', (migrations) => {
  expect(validateComposeEditorJson({ services, migrations })).toBe(false);
});

test.each([
  { services: [] },
  { services: [{ name: 'web' }] },
  { services: [{ image: 'nginx:alpine' }] },
  { services: [{ name: 'web', image: 'nginx:alpine', internalPort: 65536 }] },
])('rejects invalid services: %j', (configuration) => {
  expect(validateComposeEditorJson(configuration)).toBe(false);
});
