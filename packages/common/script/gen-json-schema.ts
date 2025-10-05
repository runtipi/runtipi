import z from 'zod';
import { dynamicComposeUnion } from '../src/schemas/dynamic-compose.js';
import fs from 'node:fs/promises';
import { appInfoSchema } from '../src/schemas/app-info.js';
import { dynamicComposeSchemaArk } from '../src/schemas/dynamic-compose-ark.js';

const dynamicCompose = z.toJSONSchema(dynamicComposeUnion, {});
const dynamicComposeArk = dynamicComposeSchemaArk.toJsonSchema({});
const appInfo = z.toJSONSchema(appInfoSchema, { unrepresentable: 'any' });

const outDir = './json-schemas';

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(`${outDir}/dynamic-compose.json`, JSON.stringify(dynamicCompose, null, 2));
await fs.writeFile(`${outDir}/dynamic-compose-ark.json`, JSON.stringify(dynamicComposeArk, null, 2));
await fs.writeFile(`${outDir}/app-info.json`, JSON.stringify(appInfo, null, 2));
