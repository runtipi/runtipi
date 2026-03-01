import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

export const updateAppConfigSchema = type({
  config: 'string',
});

export class UpdateAppConfigBodyDto extends createArkDto(updateAppConfigSchema, {
  name: 'UpdateAppConfigBodyDto',
  input: true,
}) {}

export type UpdateAppConfigDto = typeof updateAppConfigSchema.infer;

const getAppConfigSchema = type({
  config: 'string | null',
});

export class GetAppConfigDto extends createArkDto(getAppConfigSchema, {
  name: 'GetAppConfigDto',
}) {}

const appConfigSuccessSchema = type({
  success: 'boolean',
});

export class AppConfigSuccessDto extends createArkDto(appConfigSuccessSchema, {
  name: 'AppConfigSuccessDto',
}) {}

export const templateDiffSchema = type({
  hasChanges: 'boolean',
  localVersion: 'number',
  templateVersion: 'number',
  current: 'string?',
  template: 'string?',
});

export class TemplateDiffDto extends createArkDto(templateDiffSchema, {
  name: 'TemplateDiffDto',
}) {}

export type TemplateDiff = typeof templateDiffSchema.infer;
