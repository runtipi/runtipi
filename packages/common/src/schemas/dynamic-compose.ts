import { type } from 'arktype';
import { dynamicComposeSchemaV1 } from './utils/converters/v1.js';
import { dynamicComposeSchemaArk, serviceSchemaArk } from './dynamic-compose-ark.js';

/**
 * Minimum supported schema version
 * Apps with schema version below this will be blocked from installation/update
 */
export const MIN_SCHEMA_VERSION = 1;

/**
 * Current schema version
 * Apps below this version will show a deprecation warning
 */
export const CURRENT_SCHEMA_VERSION = 2;

// V2 schemas (current)
export const serviceSchemaV2 = serviceSchemaArk;
export const dynamicComposeSchemaV2 = dynamicComposeSchemaArk;

// Union over supported schema versions
export const dynamicComposeUnion = type.or(dynamicComposeSchemaV1, dynamicComposeSchemaV2);

// Change when introducing breaking changes
export const serviceSchema = serviceSchemaV2;
export const dynamicComposeSchema = dynamicComposeSchemaV2;

export type DynamicCompose = typeof dynamicComposeSchema.infer;
export type ServiceInput = typeof serviceSchema.inferIn;
export type Service = typeof serviceSchema.infer;
export type DependsOn = Service['dependsOn'];
