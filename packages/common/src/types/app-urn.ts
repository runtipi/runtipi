import { type } from 'arktype';
import { z } from 'zod';

export type AppUrn = `${string}:${string}` & {
  readonly __type: 'urn';
  split: (separator: ':') => [string, string];
};

export const zodAppUrn = z.string<AppUrn>();
export const arkAppUrn = type('string').as<AppUrn>();
