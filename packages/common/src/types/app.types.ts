export enum AppCategoriesEnum {
  NETWORK = 'network',
  MEDIA = 'media',
  DEVELOPMENT = 'development',
  AUTOMATION = 'automation',
  SOCIAL = 'social',
  UTILITIES = 'utilities',
  PHOTOGRAPHY = 'photography',
  SECURITY = 'security',
  FEATURED = 'featured',
  BOOKS = 'books',
  DATA = 'data',
}

export enum FieldTypes {
  text = 'text',
  password = 'password',
  email = 'email',
  number = 'number',
  fqdn = 'fqdn',
  ip = 'ip',
  fqdnip = 'fqdnip',
  url = 'url',
}

interface FormField {
  type: FieldTypes;
  label: string;
  max?: number;
  min?: number;
  hint?: string;
  required?: boolean;
  env_variable: string;
}

export enum AppStatusEnum {
  RUNNING = 'running',
  STOPPED = 'stopped',
  INSTALLING = 'installing',
  UNINSTALLING = 'uninstalling',
  STOPPING = 'stopping',
  STARTING = 'starting',
}

export interface AppConfig {
  id: string;
  available: boolean;
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
  categories: AppCategoriesEnum[];
  status: AppStatusEnum;
  url_suffix: string;
}
