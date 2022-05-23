import validator from 'validator';
import { AppConfig, FieldTypes } from '../../core/types';

export const validateAppConfig = (values: Record<string, string>, fields: (AppConfig['form_fields'][0] & { id: string })[]) => {
  const errors: any = {};

  fields.forEach((field) => {
    if (field.required && !values[field.id]) {
      errors[field.id] = `${field.label} is required`;
    }

    if (values[field.id]) {
      switch (field.type) {
        case FieldTypes.text:
          if (field.max && values[field.id].length > field.max) {
            errors[field.id] = `${field.label} must be less than ${field.max} characters`;
          }

          if (field.min && values[field.id].length < field.min) {
            errors[field.id] = `${field.label} must be at least ${field.min} characters`;
          }
          break;
        case FieldTypes.password:
          if (!validator.isLength(values[field.id], { min: field.min, max: field.max })) {
            errors[field.id] = `${field.label} must be between ${field.min} and ${field.max} characters`;
          }
          break;
        case FieldTypes.email:
          if (!validator.isEmail(values[field.id])) {
            errors[field.id] = `${field.label} must be a valid email address`;
          }
          break;
        case FieldTypes.number:
          if (!validator.isNumeric(values[field.id])) {
            errors[field.id] = `${field.label} must be a number`;
          }
          break;
        case FieldTypes.fqdn:
          if (!validator.isFQDN(values[field.id])) {
            errors[field.id] = `${field.label} must be a valid domain`;
          }
          break;
        case FieldTypes.ip:
          if (!validator.isIP(values[field.id])) {
            errors[field.id] = `${field.label} must be a valid IP address`;
          }
          break;
        case FieldTypes.fqdnip:
          if (!validator.isFQDN(values[field.id] || '') && !validator.isIP(values[field.id])) {
            errors[field.id] = `${field.label} must be a valid domain or IP address`;
          }
          break;
        case FieldTypes.url:
          if (!validator.isURL(values[field.id])) {
            errors[field.id] = `${field.label} must be a valid URL`;
          }
          break;
        default:
          break;
      }
    }
  });

  return errors;
};
