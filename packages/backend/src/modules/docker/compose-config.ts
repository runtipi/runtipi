import { type } from 'arktype';

export const effectiveComposeSchema = type({
  services: {
    '[string]': {
      '[string]': 'unknown',
      'image?': 'string',
      'volumes_from?': 'string[]',
      'volumes?': type({
        type: 'string',
        'source?': 'string',
        target: 'string',
        'read_only?': 'boolean',
      }).array(),
    },
  },
});

export type EffectiveAppServices = typeof effectiveComposeSchema.infer.services;
