import { describe, expect, it } from 'vitest';
import type { UpdateNotice } from '@runtipi/common/schemas';
import { computeUpdateNoticesFingerprint } from './update-notices';

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

describe('computeUpdateNoticesFingerprint', () => {
  it('is stable across key order changes', () => {
    const a: UpdateNotice = { ...baseNotice };
    const b: UpdateNotice = {
      ...baseNotice,
      // Rebuild the same content with a different construction order
      before_update: [...baseNotice.before_update],
      title: 'Database migration',
    };

    expect(computeUpdateNoticesFingerprint([a])).toBe(computeUpdateNoticesFingerprint([b]));
  });

  it('changes when the message content changes under the same id', () => {
    const changed: UpdateNotice = { ...baseNotice, message: 'The first startup may take up to an hour.' };

    expect(computeUpdateNoticesFingerprint([baseNotice])).not.toBe(computeUpdateNoticesFingerprint([changed]));
  });

  it('changes when translations change', () => {
    const translated: UpdateNotice = {
      ...baseNotice,
      translations: { fr: { title: 'Migration de la base' } },
    };

    expect(computeUpdateNoticesFingerprint([baseNotice])).not.toBe(computeUpdateNoticesFingerprint([translated]));
  });

  it('is order-independent across notices', () => {
    const other: UpdateNotice = { ...baseNotice, id: 'other', tipi_version: 23 };

    expect(computeUpdateNoticesFingerprint([baseNotice, other])).toBe(computeUpdateNoticesFingerprint([other, baseNotice]));
  });

  it('handles null or undefined notice lists', () => {
    expect(computeUpdateNoticesFingerprint(null)).toBe(computeUpdateNoticesFingerprint(undefined));
  });
});
