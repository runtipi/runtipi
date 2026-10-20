import { expect, test } from 'vitest';
import { appEventSchema } from './app-events';

test.each([
  [{}, true],
  [{ performBackup: true }, true],
  [{ performBackup: false }, false],
])('preserves backup protection and explicit update choices: %j', (options, expected) => {
  const event = appEventSchema({
    appUrn: 'demo:store',
    command: 'update',
    requestId: crypto.randomUUID(),
    form: {},
    ...options,
  });

  expect(event).toMatchObject({ command: 'update', performBackup: expected });
});
