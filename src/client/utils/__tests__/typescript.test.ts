import { expect, describe, test } from 'vitest';
import { nonNullable, objectKeys } from '../typescript';

describe('objectKeys and nonNullable', () => {
  describe('objectKeys', () => {
    test('should return an array of keys from an object', () => {
      // arrange
      const input = { foo: 1, bar: 'baz' };

      // act
      const result = objectKeys(input);

      // assert
      expect(result).toStrictEqual(['foo', 'bar']);
    });

    test('should return an empty array for an empty object', () => {
      // arrange
      const input = {};

      // act
      const result = objectKeys(input);

      // assert
      expect(result).toStrictEqual([]);
    });
  });

  describe('nonNullable', () => {
    test('should return true for a non-null, non-undefined value', () => {
      // arrange
      const input = 'foo';

      // act
      const result = nonNullable(input);

      // assert
      expect(result).toBe(true);
    });

    test('should return false for a null value', () => {
      // arrange
      const input = null;

      // act
      const result = nonNullable(input);

      // assert
      expect(result).toBe(false);
    });

    test('should return false for an undefined value', () => {
      // arrange
      const input = undefined;

      // act
      const result = nonNullable(input);

      // assert
      expect(result).toBe(false);
    });
  });
});
