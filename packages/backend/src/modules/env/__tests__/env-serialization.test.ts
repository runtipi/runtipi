import { expect, test } from 'vitest';
import { EnvUtils } from '../env.utils';

test.each(['\n', '\r', '\r\n'])('rejects assignment injection through keys or values using %j', (separator) => {
  const env = new EnvUtils();
  expect(() => env.envMapToString(new Map([['APP_KEY', `value${separator}APP_PORT=9000`]]))).toThrow('line breaks');
  expect(() => env.envMapToString(new Map([[`APP_KEY${separator}APP_PORT`, 'value']]))).toThrow('line breaks');
});

test('accepts CRLF files and preserves single-line special characters', () => {
  const env = new EnvUtils();
  const parsed = env.envStringToMap('APP_KEY=a=b $value "quotes"\r\nAPP_PORT=8080\r\n');
  const serialized = env.envMapToString(parsed);
  expect(serialized).toBe('APP_KEY=a=b $value "quotes"\nAPP_PORT=8080');
  expect(env.envStringToMap(serialized)).toEqual(parsed);
});
