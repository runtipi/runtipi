import validator from 'validator';
import { AppConfig, FieldTypes } from '../../core/types';

export const validateAppConfig = (values: Record<string, string>, fields: (AppConfig['form_fields'][0] & { id: string })[]) => {
  const errors: any = {};

  fields.forEach((field) => {
    if (field.required && !values[field.id]) {
      errors[field.id] = 'Field required';
    } else if (values[field.id] && field.min && values[field.id].length < field.min) {
      errors[field.id] = `Field must be at least ${field.min} characters long`;
    } else if (values[field.id] && field.max && values[field.id].length > field.max) {
      errors[field.id] = `Field must be at most ${field.max} characters long`;
    } else if (values[field.id] && field.type === FieldTypes.number && !validator.isNumeric(values[field.id])) {
      errors[field.id] = 'Field must be a number';
    } else if (values[field.id] && field.type === FieldTypes.email && !validator.isEmail(values[field.id])) {
      errors[field.id] = 'Field must be a valid email';
    } else if (values[field.id] && field.type === FieldTypes.fqdn && !validator.isFQDN(values[field.id] || '')) {
      errors[field.id] = 'Field must be a valid domain';
    } else if (values[field.id] && field.type === FieldTypes.ip && !validator.isIP(values[field.id])) {
      errors[field.id] = 'Field must be a valid IP address';
    } else if (values[field.id] && field.type === FieldTypes.fqdnip && !validator.isFQDN(values[field.id] || '') && !validator.isIP(values[field.id])) {
      errors[field.id] = 'Field must be a valid domain or IP address';
    }
  });

  return errors;
};
