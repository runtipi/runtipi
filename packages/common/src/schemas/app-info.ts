import { type } from 'arktype';
import { arkAppUrn } from '../types/app-urn.js';

export const APP_CATEGORIES = [
  'network',
  'media',
  'development',
  'automation',
  'social',
  'utilities',
  'photography',
  'security',
  'featured',
  'books',
  'data',
  'music',
  'finance',
  'gaming',
  'ai',
] as const;
export type AppCategory = (typeof APP_CATEGORIES)[number];
export const ARCHITECTURES = ['arm64', 'amd64'] as const;

export const FIELD_TYPES = ['text', 'password', 'email', 'number', 'fqdn', 'ip', 'fqdnip', 'url', 'random', 'boolean'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const RANDOM_ENCODINGS = ['hex', 'base64'] as const;
export type RandomEncoding = (typeof RANDOM_ENCODINGS)[number];

export const formFieldSchema = type({
  type: type.enumerated(...FIELD_TYPES),
  label: 'string',
  placeholder: 'string?',
  max: 'number?',
  min: 'number?',
  hint: 'string?',
  options: type({ label: 'string', value: 'string' }).array().optional(),
  required: 'boolean = false',
  default: type.or('boolean', 'string', 'number').optional(),
  regex: 'string?',
  pattern_error: 'string?',
  env_variable: 'string',
  encoding: type.enumerated(...RANDOM_ENCODINGS).optional(),
});

export const NOTICE_SEVERITIES = ['info', 'warning'] as const;
export type NoticeSeverity = (typeof NOTICE_SEVERITIES)[number];

const nonEmptyStringArray = () =>
  type('string')
    .narrow((v, ctx) => (v.trim().length > 0 ? true : ctx.mustBe('a non-empty string')))
    .array();

const nonEmptyTrimmedString = () => type('string').narrow((v, ctx) => (v.trim().length > 0 ? true : ctx.mustBe('a non-empty string')));

/**
 * Translation overrides for a single update notice.
 * English reference fields are always required; any translated field that is
 * omitted falls back to the English reference value.
 */
export const updateNoticeTranslationSchema = type({
  title: nonEmptyTrimmedString().optional(),
  message: nonEmptyTrimmedString().optional(),
  before_update: nonEmptyStringArray().optional(),
  after_update: nonEmptyStringArray().optional(),
});

/**
 * A notice that warns the user about important changes introduced by a package
 * revision (`tipi_version`). Applicable notices are shown as the first step of
 * the app update wizard.
 *
 * Text fields use English as the reference language. Optional translations can
 * be provided per locale (e.g. `fr`, `fr-FR`) under `translations`.
 */
export const updateNoticeSchema = type({
  id: nonEmptyTrimmedString(),
  tipi_version: type('number.integer >= 1'),
  severity: type.enumerated(...NOTICE_SEVERITIES).default('warning'),
  title: nonEmptyTrimmedString(),
  message: nonEmptyTrimmedString(),
  before_update: nonEmptyStringArray().default(() => []),
  after_update: nonEmptyStringArray().default(() => []),
  require_confirmation: 'boolean = true',
  translations: type({ '[string]': updateNoticeTranslationSchema }).optional(),
});

export const appInfoSchema = type({
  id: type('string').narrow((v, ctx) => (v.split(':').length === 1 ? true : ctx.mustBe('a string without colons'))),
  urn: arkAppUrn,
  available: 'boolean',
  deprecated: 'boolean = false',
  port: '1 <= number <= 65535?',
  name: 'string',
  description: 'string = ""',
  version: "string = 'latest'",
  tipi_version: 'number',
  short_desc: 'string',
  author: 'string',
  source: 'string',
  website: 'string?',
  force_expose: 'boolean = false',
  generate_vapid_keys: 'boolean = false',
  categories: type
    .enumerated(...APP_CATEGORIES)
    .array()
    .default(() => ['utilities']),
  url_suffix: 'string?',
  form_fields: formFieldSchema.array().default(() => []),
  https: 'boolean = false',
  exposable: 'boolean = false',
  no_gui: 'boolean = false',
  supported_architectures: type
    .enumerated(...ARCHITECTURES)
    .array()
    .default(() => ['amd64', 'arm64']),
  uid: 'number?',
  gid: 'number?',
  dynamic_config: 'boolean = false',
  min_tipi_version: 'string?',
  created_at: type('number.integer >= 0')
    .narrow((v, ctx) => (v < Date.now() ? true : ctx.mustBe('a timestamp before now')))
    .default(0),
  updated_at: type('number.integer >= 0')
    .narrow((v, ctx) => (v < Date.now() ? true : ctx.mustBe('a timestamp before now')))
    .default(0),
  force_pull: 'boolean = false',
  update_notices: updateNoticeSchema.array().default(() => []),
});

export const frontmatterSchema = type({
  name: 'string?',
  short_desc: 'string?',
  description: 'string?',
  source: 'string?',
  website: 'string?',
  author: 'string?',
  categories: type
    .enumerated(...APP_CATEGORIES)
    .array()
    .default(() => ['development']),
  version: 'string?',
  port: '1 <= number <= 65535?',
  supported_architectures: type
    .enumerated(...ARCHITECTURES)
    .array()
    .default(() => ['amd64', 'arm64']),
});

// Derived types
export type AppInfoInput = typeof appInfoSchema.inferIn;
export type AppInfo = typeof appInfoSchema.infer;
export type FormField = typeof formFieldSchema.infer;
export type UpdateNotice = typeof updateNoticeSchema.infer;
export type UpdateNoticeInput = typeof updateNoticeSchema.inferIn;
export type UpdateNoticeTranslation = typeof updateNoticeTranslationSchema.infer;

/**
 * Cross-field validation for `update_notices` that cannot be expressed in the
 * schema itself: notice ids must be unique and a notice cannot target a package
 * revision above the one shipping it.
 *
 * Returns a list of human-readable errors. An empty list means the notices are
 * valid.
 */
export const getUpdateNoticeConfigErrors = (appInfo: { tipi_version: number; update_notices?: UpdateNotice[] | null }): string[] => {
  const errors: string[] = [];
  const notices = appInfo.update_notices ?? [];
  const seenIds = new Set<string>();

  for (const notice of notices) {
    if (seenIds.has(notice.id)) {
      errors.push(`update_notices: duplicate notice id "${notice.id}"`);
    }
    seenIds.add(notice.id);

    if (notice.tipi_version > appInfo.tipi_version) {
      errors.push(
        `update_notices: notice "${notice.id}" targets revision ${notice.tipi_version} which is above the package revision ${appInfo.tipi_version}`,
      );
    }
  }

  return errors;
};

/**
 * Returns the notices that apply when updating from `installedTipiVersion` to
 * `targetTipiVersion`, sorted by revision. A notice applies when it was
 * introduced in a revision that is crossed by the update:
 *
 *   installedTipiVersion < notice.tipi_version <= targetTipiVersion
 *
 * Notices for revisions already installed are never shown again, which also
 * guarantees they reappear on every retry of a failed update.
 */
export const selectUpdateNotices = (
  notices: UpdateNotice[] | null | undefined,
  installedTipiVersion: number,
  targetTipiVersion: number,
): UpdateNotice[] =>
  (notices ?? [])
    .filter((notice) => notice.tipi_version > installedTipiVersion && notice.tipi_version <= targetTipiVersion)
    .sort((a, b) => a.tipi_version - b.tipi_version);
