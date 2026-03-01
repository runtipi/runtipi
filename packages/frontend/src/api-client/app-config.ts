import { client } from './client.gen';
import type { Options } from './sdk.gen';

export type GetAppConfigData = {
  body?: never;
  path: {
    urn: string;
  };
  query?: never;
  url: '/api/apps/{urn}/config';
};

export type GetAppConfigResponse = {
  config: string;
};

export type GetAppConfigResponses = {
  default: GetAppConfigResponse;
};

export type UpdateAppConfigData = {
  body: {
    config: string;
  };
  path: {
    urn: string;
  };
  query?: never;
  url: '/api/apps/{urn}/config';
};

export type UpdateAppConfigResponses = {
  200: void;
};

export type GetTemplateDiffData = {
  body?: never;
  path: {
    urn: string;
  };
  query?: never;
  url: '/api/apps/{urn}/template/diff';
};

export type TemplateDiffResponse = {
  hasChanges: boolean;
  localVersion: number;
  templateVersion: number;
  current?: string;
  template?: string;
};

export type GetTemplateDiffResponses = {
  default: TemplateDiffResponse;
};

export type SyncWithTemplateData = {
  body?: never;
  path: {
    urn: string;
  };
  query?: never;
  url: '/api/apps/{urn}/template/sync';
};

export type SyncWithTemplateResponses = {
  200: void;
};

export const getAppConfig = <ThrowOnError extends boolean = false>(
  options: Options<GetAppConfigData, ThrowOnError>
) => {
  return (options.client ?? client).get<GetAppConfigResponses, unknown, ThrowOnError>({
    url: '/api/apps/{urn}/config',
    ...options
  });
};

export const updateAppConfig = <ThrowOnError extends boolean = false>(
  options: Options<UpdateAppConfigData, ThrowOnError>
) => {
  return (options.client ?? client).post<UpdateAppConfigResponses, unknown, ThrowOnError>({
    url: '/api/apps/{urn}/config',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};

export const getTemplateDiff = <ThrowOnError extends boolean = false>(
  options: Options<GetTemplateDiffData, ThrowOnError>
) => {
  return (options.client ?? client).get<GetTemplateDiffResponses, unknown, ThrowOnError>({
    url: '/api/apps/{urn}/template/diff',
    ...options
  });
};

export const syncWithTemplate = <ThrowOnError extends boolean = false>(
  options: Options<SyncWithTemplateData, ThrowOnError>
) => {
  return (options.client ?? client).post<SyncWithTemplateResponses, unknown, ThrowOnError>({
    url: '/api/apps/{urn}/template/sync',
    ...options
  });
};