export enum FieldTypes {
  text = 'text',
  password = 'password',
  email = 'email',
  number = 'number',
  fqdn = 'fqdn',
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
  name: string;
  requirements?: {
    ports?: number[];
  };
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
