import { createArkDto } from 'nestjs-arktype';
import { dynamicComposeSchemaArk } from '@runtipi/common/schemas';
import { type } from 'arktype';

export const createCustomAppSchema = type({
  name: type(/^[a-z0-9-]+$/)
    .lessThanLength(51)
    .moreThanLength(0),
  config: dynamicComposeSchemaArk.omit('schemaVersion'),
});

export class CreateCustomAppDto extends createArkDto(createCustomAppSchema, { name: 'CreateCustomAppDto' }) {}

export const createCustomAppResponseSchema = type({
  appUrn: 'string',
  appName: 'string',
  storeId: 'string',
});

export class CreateCustomAppResponseDto extends createArkDto(createCustomAppResponseSchema, { name: 'CreateCustomAppResponseDto' }) {}
