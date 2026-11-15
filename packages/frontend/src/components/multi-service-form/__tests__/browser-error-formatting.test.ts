// @vitest-environment node
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { expect, test } from 'vitest';

test('formats invalid JSON in a browser bundle without Node globals', async () => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      lib: {
        entry: fileURLToPath(import.meta.resolve('better-ajv-errors')),
        formats: ['iife'],
        name: 'formatErrors',
      },
    },
  });

  const bundle = Array.isArray(result) ? result[0] : result;

  if (!bundle || !('output' in bundle)) {
    throw new Error('Expected one browser bundle');
  }

  const chunk = bundle.output.find((output) => output.type === 'chunk');
  expect(chunk).toBeDefined();

  const formatErrors = runInNewContext(`${chunk!.code}; formatErrors;`);
  const message = formatErrors(
    { type: 'object', required: ['services'] },
    {},
    [
      {
        keyword: 'required',
        instancePath: '',
        schemaPath: '#/required',
        params: { missingProperty: 'services' },
        message: "must have required property 'services'",
      },
    ],
    { format: 'cli', indent: 2 },
  );

  expect(message).toContain('services');
  expect(message).toContain('REQUIRED');
  expect(message).not.toContain('\u001b[');
});
