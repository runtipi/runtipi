import { createHash } from 'node:crypto';
import type { UpdateNotice } from '@runtipi/common/schemas';

/**
 * Computes a stable fingerprint of a set of update notices, used to detect
 * content changes between the moment notices were displayed and the moment the
 * update is actually submitted. Acknowledging a notice id alone would not
 * detect a changed message under the same id.
 *
 * Lives in the backend (not the shared browser-facing common package) because
 * it uses the Node crypto module.
 */
export const computeUpdateNoticesFingerprint = (notices: UpdateNotice[] | null | undefined): string => {
  const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  };

  const serialized = stableStringify(
    [...(notices ?? [])]
      .sort((a, b) => a.tipi_version - b.tipi_version || a.id.localeCompare(b.id))
      .map(({ id, tipi_version, title, message, severity, before_update, after_update, require_confirmation, translations }) => ({
        after_update,
        before_update,
        id,
        message,
        require_confirmation,
        severity,
        tipi_version,
        title,
        translations,
      })),
  );

  return createHash('sha256').update(serialized).digest('hex');
};
