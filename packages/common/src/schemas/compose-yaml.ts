import { type } from 'arktype';

const xRuntipiService = type({
  is_main: 'boolean?',
  internal_port: 'number?',
  add_to_main_network: 'boolean?',
});

export type XRuntipiServiceParams = type.infer<typeof xRuntipiService>;

const services = type({
  '[string]': type({
    'x-runtipi': xRuntipiService.optional(),
    networks: type({
      '[string]': 'unknown',
    })
      .or('string[]')
      .optional(),
    ports: type('unknown[]').optional(),
    labels: type({
      '[string]': 'string | number | boolean',
    })
      .or('string[]')
      .optional(),
    '[string]': 'unknown',
  }),
});

export const dynamicComposeSchemaYaml = type({
  services,
  networks: type({
    '[string]': 'unknown',
  }).optional(),
  'x-runtipi': type({
    overrides: type({
      architecture: '"arm64" | "amd64"',
      services,
    }).array(),
  }).optional(),

  '[string]': 'unknown',
});

export type DynamicComposeSchemaYaml = type.infer<typeof dynamicComposeSchemaYaml>;
