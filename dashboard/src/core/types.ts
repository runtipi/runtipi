interface FormField {
  type: string;
  label: string;
  max?: number;
  min?: number;
  required?: boolean;
  env_variable: string;
}

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  image: string;
  form_fields: Record<string, FormField>;
  short_desc: string;
  author: string;
  source: string;
  installed: boolean;
  status: 'running' | 'stopped';
}

export enum RequestStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  LOADING = 'LOADING',
}

export enum AppStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  INSTALLING = 'installing',
}
