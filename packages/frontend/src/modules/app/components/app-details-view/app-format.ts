import { toSupportedLocale } from '@/lib/i18n/locales';
import i18next from 'i18next';

/**
 * Short date and time, e.g. "28 Sep 2026, 1:42 AM", in the instance time zone.
 */
export const formatShortDate = (date: Date | string | number, timeZone?: string) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  try {
    return value.toLocaleString(toSupportedLocale(i18next.language), { dateStyle: 'medium', timeStyle: 'short', timeZone });
  } catch {
    return value.toLocaleString();
  }
};
