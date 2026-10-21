import { dynamicComposeSchemaArk } from '@runtipi/common/schemas';
import Ajv from 'ajv/dist/2020';

// Arktype serializes the forbidden migrations field as an empty enum, which Ajv cannot compile.
export const composeEditorJsonSchema = {
  ...dynamicComposeSchemaArk.omit('schemaVersion', 'migrations').toJsonSchema({ fallback: { default: (ctx) => ctx.base } }),
  not: { required: ['migrations'] },
};

const ajv = new Ajv({ allErrors: true });
ajv.addKeyword('message');

export const validateComposeEditorJson = ajv.compile(composeEditorJsonSchema);
