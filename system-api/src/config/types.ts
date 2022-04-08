// "form_fields": {
//     "username": {
//       "type": "text",
//       "label": "Username",
//       "max": 50,
//       "min": 3,
//       "required": true,
//       "env_variable": "NEXTCLOUD_USERNAME"
//     },
//     "password": {
//       "type": "password",
//       "label": "Password",
//       "max": 50,
//       "min": 3,
//       "required": true,
//       "env_variable": "NEXTCLOUD_PASSWORD"
//     }

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
  form_fields: Record<string, FormField[]>;
}
