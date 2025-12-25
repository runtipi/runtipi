import { createArkDto } from 'nestjs-arktype';
import { dynamicComposeSchemaYaml } from '@runtipi/common/schemas';
import { type } from 'arktype';

export const createCustomAppSchema = type({
  name: type(/^[a-z0-9-]+$/)
    .lessThanLength(51)
    .moreThanLength(0),
  config: dynamicComposeSchemaYaml,
});

export class CreateCustomAppDto extends createArkDto(createCustomAppSchema, {
  name: 'CreateCustomAppDto',
}) {}

export const createCustomAppResponseSchema = type({
  appUrn: 'string',
  appName: 'string',
  storeId: 'string',
});

export class CreateCustomAppResponseDto extends createArkDto(createCustomAppResponseSchema, { name: 'CreateCustomAppResponseDto' }) {}

export const updateCustomAppSchema = type({
  config: dynamicComposeSchemaYaml,
});

export class UpdateCustomAppDto extends createArkDto(updateCustomAppSchema, {
  name: 'UpdateCustomAppDto',
}) {}

export const updateAppMetadataDto = type({
  data: 'string',
});

export class UpdateAppMetadataDto extends createArkDto(updateAppMetadataDto, {
  name: 'UpdateAppMetadataDto',
}) {}
