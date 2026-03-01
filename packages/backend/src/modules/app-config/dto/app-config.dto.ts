import { type } from 'arktype';

export const updateAppConfigSchema = type({
  config: 'string',
});

export type UpdateAppConfigDto = typeof updateAppConfigSchema.infer;

export const templateDiffSchema = type({
  hasChanges: 'boolean',
  localVersion: 'number',
  templateVersion: 'number',
  current: 'string?',
  template: 'string?',
});

export type TemplateDiff = typeof templateDiffSchema.infer;
