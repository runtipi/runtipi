import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const getUserConfigSchema = type({
  dockerCompose: 'string | null',
  appEnv: 'string | null',
  sourceCompose: 'string | null',
  actualEnv: 'string | null',
  isEnabled: 'boolean',
});

const updateUserConfigSchema = type({
  dockerCompose: 'string',
  appEnv: 'string',
});

export class GetUserConfigDto extends createArkDto(getUserConfigSchema, { name: 'GetUserConfigDto' }) {}
export class UpdateUserConfigDto extends createArkDto(updateUserConfigSchema, { name: 'UpdateUserConfigDto', input: true }) {}
