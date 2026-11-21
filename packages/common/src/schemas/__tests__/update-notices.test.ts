import { describe, expect, it } from 'vitest';
import { type } from 'arktype';
import { appInfoSchema, getUpdateNoticeConfigErrors, selectUpdateNotices, type AppInfo, type UpdateNotice } from '../app-info.js';

const assertValid = (parsed: ReturnType<typeof appInfoSchema>): AppInfo => {
  if (parsed instanceof type.errors) {
    throw new Error(`Expected a valid config, got: ${parsed.summary}`);
  }
  return parsed;
};

const baseConfig = {
  id: 'my-app',
  urn: 'my-app:local',
  available: true,
  port: 3000,
  name: 'My App',
  short_desc: 'An app',
  author: 'me',
  source: 'https://example.com',
  tipi_version: 25,
  version: '5.2.0',
  form_fields: [],
};

const validNotice = {
  id: 'database-migration-22',
  tipi_version: 22,
  title: 'Database migration',
  message: 'The first startup may take several minutes.',
};

const baseNotice: UpdateNotice = {
  id: 'database-migration-22',
  tipi_version: 22,
  severity: 'warning',
  title: 'Database migration',
  message: 'The first startup may take several minutes.',
  before_update: [],
  after_update: [],
  require_confirmation: true,
  translations: undefined,
};

describe('update_notices schema', () => {
  it('is optional and defaults to an empty list', () => {
    const parsed = assertValid(appInfoSchema({ ...baseConfig }));

    expect(parsed).toMatchObject({ update_notices: [] });
  });

  it('accepts a minimal notice and applies field defaults', () => {
    const parsed = assertValid(appInfoSchema({ ...baseConfig, update_notices: [validNotice] }));

    expect(parsed.update_notices).toEqual([
      {
        ...baseNotice,
        translations: undefined,
      },
    ]);
  });

  it('rejects a missing required field', () => {
    const parsed = appInfoSchema({
      ...baseConfig,
      update_notices: [{ id: 'x', tipi_version: 22, title: 'Title' }],
    });

    expect(String(parsed)).toContain('message');
  });

  it('rejects an empty or whitespace title', () => {
    const parsed = appInfoSchema({
      ...baseConfig,
      update_notices: [{ ...validNotice, title: '   ' }],
    });

    expect(String(parsed)).toContain('title');
  });

  it('rejects an invalid severity', () => {
    const parsed = appInfoSchema({
      ...baseConfig,
      update_notices: [{ ...validNotice, severity: 'critical' }],
    });

    expect(String(parsed)).toContain('severity');
  });

  it('rejects an invalid require_confirmation type', () => {
    const parsed = appInfoSchema({
      ...baseConfig,
      update_notices: [{ ...validNotice, require_confirmation: 'true' }],
    });

    expect(String(parsed)).toContain('require_confirmation');
  });

  it('rejects an empty instruction in a procedure list', () => {
    const parsed = appInfoSchema({
      ...baseConfig,
      update_notices: [{ ...validNotice, before_update: [''] }],
    });

    expect(String(parsed)).toContain('before_update');
  });

  it('rejects a non-integer or non-positive tipi_version', () => {
    const parsed = appInfoSchema({
      ...baseConfig,
      update_notices: [{ ...validNotice, tipi_version: 0 }],
    });

    expect(String(parsed)).toContain('tipi_version');
  });

  it('accepts translations and strips unknown translation fields', () => {
    const valid = assertValid(
      appInfoSchema({
        ...baseConfig,
        update_notices: [
          {
            ...validNotice,
            translations: { fr: { title: 'Migration de la base', message: 'Le premier démarrage peut prendre plusieurs minutes.' } },
          },
        ],
      }),
    );
    expect(valid.update_notices).toHaveLength(1);

    // Unknown keys inside a translation are ignored (the value is passed
    // through) rather than rejecting the whole config; they are never used.
    const ignored = assertValid(
      appInfoSchema({
        ...baseConfig,
        update_notices: [{ ...validNotice, translations: { fr: { severity: 'info' } } }],
      }),
    );
    expect(ignored.update_notices?.[0]?.translations?.fr).toEqual({ severity: 'info' });
  });
});

describe('getUpdateNoticeConfigErrors', () => {
  it('returns no errors for a valid configuration', () => {
    expect(getUpdateNoticeConfigErrors({ ...baseConfig, update_notices: [baseNotice] })).toEqual([]);
  });

  it('reports duplicated notice ids', () => {
    const errors = getUpdateNoticeConfigErrors({
      ...baseConfig,
      update_notices: [baseNotice, { ...baseNotice, tipi_version: 23 }],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('database-migration-22');
  });

  it('reports a notice targeting a revision above the package revision', () => {
    const errors = getUpdateNoticeConfigErrors({
      ...baseConfig,
      update_notices: [{ ...baseNotice, tipi_version: 26 }],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('26');
  });

  it('ignores an absent update_notices list', () => {
    expect(getUpdateNoticeConfigErrors({ ...baseConfig })).toEqual([]);
  });
});

describe('selectUpdateNotices', () => {
  const notices: UpdateNotice[] = [{ ...baseNotice }, { ...baseNotice, id: 'index-rebuild-25', tipi_version: 25, require_confirmation: false }];

  it('selects every notice crossed by a multi-revision jump, sorted by revision', () => {
    expect(selectUpdateNotices(notices, 21, 25).map((n) => n.id)).toEqual(['database-migration-22', 'index-rebuild-25']);
  });

  it('excludes notices for revisions already installed', () => {
    expect(selectUpdateNotices(notices, 22, 25).map((n) => n.id)).toEqual(['index-rebuild-25']);
    expect(selectUpdateNotices(notices, 25, 25)).toEqual([]);
  });

  it('returns nothing when the installed revision is already the target', () => {
    expect(selectUpdateNotices(notices, 25, 25)).toEqual([]);
  });

  it('handles null or undefined notice lists', () => {
    expect(selectUpdateNotices(null, 0, 25)).toEqual([]);
    expect(selectUpdateNotices(undefined, 0, 25)).toEqual([]);
  });
});
