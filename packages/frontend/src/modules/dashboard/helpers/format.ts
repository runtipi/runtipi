const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export const formatBytes = (bytes: number, decimals = 1) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** i;

  return `${Number.parseFloat(value.toFixed(i === 0 ? 0 : decimals))} ${BYTE_UNITS[i]}`;
};

export const formatRate = (bytesPerSec: number) => `${formatBytes(bytesPerSec)}/s`;

export const formatPercent = (value: number, decimals = 1) => `${Number.parseFloat((value || 0).toFixed(decimals))}%`;

export const formatTime = (timestamp: number, locale?: string) => {
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  try {
    return new Date(timestamp).toLocaleTimeString(locale, options);
  } catch {
    // The detected language is not always a valid BCP 47 tag (e.g. "en-US@posix")
    return new Date(timestamp).toLocaleTimeString(undefined, options);
  }
};

/**
 * Format a duration in seconds as "3d 4h", "4h 12m" or "12m"
 */
export const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export type Severity = 'ok' | 'warning' | 'danger';

export const getSeverity = (percent: number): Severity => {
  if (percent >= 90) return 'danger';
  if (percent >= 75) return 'warning';
  return 'ok';
};

export const severityClass: Record<Severity, string> = {
  ok: 'bg-primary',
  warning: 'bg-warning',
  danger: 'bg-danger',
};
