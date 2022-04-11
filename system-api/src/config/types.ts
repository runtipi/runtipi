interface FormField {
  type: string;
  label: string;
  max?: number;
  min?: number;
  required?: boolean;
  env_variable?: string;
}

export interface AppConfig {
  name: string;
  description: string;
  version: string;
  image: string;
  form_fields: Record<string, FormField>;
  installed: boolean;
}
