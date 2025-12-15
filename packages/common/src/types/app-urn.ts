import { type } from 'arktype';

export type AppUrn = `${string}:${string}` & {
  readonly __type: 'urn';
  split: (separator: ':') => [string, string];
};

export const arkAppUrn = type('string').as<AppUrn>();
