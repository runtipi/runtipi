import z from 'zod';

export type AppUrn = `${string}:${string}` & {
  readonly __type: 'urn';
  split: (separator: ':') => [string, string];
};

export const zodAppUrn = z.string<AppUrn>();
