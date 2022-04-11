import { AppConfig } from '../../core/types';

export const validateAppConfig = (values: Record<string, string>, fields: (AppConfig['form_fields'][0] & { id: string })[]) => {
  const errors: any = {};

  fields.forEach((field) => {
    if (field.required && !values[field.id]) {
      errors[field.id] = 'Field required';
    } else if (field.min && values[field.id].length < field.min) {
      errors[field.id] = `Field must be at least ${field.min} characters long`;
    } else if (field.max && values[field.id].length > field.max) {
      errors[field.id] = `Field must be at most ${field.max} characters long`;
    }
  });

  return errors;
};
