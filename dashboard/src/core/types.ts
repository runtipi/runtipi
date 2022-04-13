export enum FieldTypes {
  text = 'text',
  password = 'password',
  email = 'email',
  number = 'number',
  fqdn = 'fqdn',
  ip = 'ip',
}

interface FormField {
  type: FieldTypes;
  label: string;
  max?: number;
  min?: number;
  required?: boolean;
  env_variable: string;
}

export interface AppConfig {
  id: string;
  port: number;
  requirements?: {
    ports?: number[];
  };
  name: string;
  description: string;
  version: string;
  image: string;
  form_fields: Record<string, FormField>;
  short_desc: string;
  author: string;
  source: string;
  installed: boolean;
  status: AppStatus;
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
  UNINSTALLING = 'uninstalling',
  STOPPING = 'stopping',
  STARTING = 'starting',
}
