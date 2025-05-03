export type AppUrn = `${string}:${string}` & {
  readonly __type: 'urn';
  split: (separator: ':') => [string, string];
};
