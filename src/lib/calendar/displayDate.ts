import { parseISODate } from '../date/iso.ts';

/**
 * Calendar chrome visible anchor — Month Name DD, YYYY (e.g. September 19, 2026).
 * Storage / prefs / API stay ISO; never persist this string as SoT.
 */
export function formatCalendarDisplayDate(iso: string, locale?: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
