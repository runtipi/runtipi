import { mkdir, writeFile } from 'node:fs/promises';
import { appInfoSchema } from '../src/schemas/app-info.js';
import { dynamicComposeUnion } from '../src/schemas/dynamic-compose.js';
import { dynamicComposeSchemaArk } from '../src/schemas/dynamic-compose-ark.js';
import { dynamicComposeSchemaV1 } from '../src/schemas/utils/converters/v1.js';

const omitProperty = (schema: unknown, key: string): unknown => {
  // biome-ignore lint/suspicious/noExplicitAny: JSON schema post-processing
  const s: any = structuredClone(schema as any);

  if (!s || typeof s !== 'object') return schema;

  if (s.properties && typeof s.properties === 'object') {
    // biome-ignore lint/suspicious/noExplicitAny: JSON schema post-processing
    delete (s.properties as any)[key];
  }

  if (Array.isArray(s.required)) {
    s.required = s.required.filter((k: unknown) => k !== key);
  }

  return s;
};

const main = async () => {
  const dynamicCompose = dynamicComposeUnion.toJsonSchema({});
  const appInfo = omitProperty(appInfoSchema.toJsonSchema({}), 'urn');

  const outDir = './json-schemas';

  const v1 = dynamicComposeSchemaV1.toJsonSchema({});
  const v2 = dynamicComposeSchemaArk.toJsonSchema({});

  await mkdir(outDir, { recursive: true });
  await mkdir(`${outDir}/v1`, { recursive: true });
  await mkdir(`${outDir}/v2`, { recursive: true });

  await writeFile(`${outDir}/dynamic-compose.json`, JSON.stringify(dynamicCompose, null, 2));
  await writeFile(`${outDir}/app-info.json`, JSON.stringify(appInfo, null, 2));

  await writeFile(`${outDir}/v1/dynamic-compose.json`, JSON.stringify(v1, null, 2));
  await writeFile(`${outDir}/v1/app-info.json`, JSON.stringify(appInfo, null, 2));

  await writeFile(`${outDir}/v2/dynamic-compose.json`, JSON.stringify(v2, null, 2));
  await writeFile(`${outDir}/v2/app-info.json`, JSON.stringify(appInfo, null, 2));
};

void main();
