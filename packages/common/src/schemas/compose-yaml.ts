import { type } from 'arktype';

const xRuntipiService = type({
  is_main: 'boolean?',
  internal_port: 'number?',
  add_to_main_network: 'boolean?',
});

export type XRuntipiServiceParams = type.infer<typeof xRuntipiService>;

const serviceObject = type({
  image: 'string',
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
  'x-runtipi': xRuntipiService.optional(),
  '[string]': 'unknown',
});

const services = type({
  '[string]': serviceObject,
});

export type ServicesSchema = type.infer<typeof services>;
export type ServiceSchema = type.infer<typeof serviceObject>;

export const dynamicComposeSchemaYaml = type({
  services,
  networks: type({
    '[string]': 'unknown',
  }).optional(),
  'x-runtipi': type({
    schema_version: '1 | 2',
    overrides: type({
      architecture: '"arm64" | "amd64"',
      services: type({
        '[string]': serviceObject.partial().and({ image: 'string' }),
      }),
    })
      .array()
      .optional(),
  }),

  '[string]': 'unknown',
});

export type DynamicComposeSchemaYaml = type.infer<typeof dynamicComposeSchemaYaml>;
