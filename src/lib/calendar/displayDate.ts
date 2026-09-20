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

/** CAL-R5-03 Month chevron — Month, Year (no day). */
export function formatCalendarMonthYear(iso: string, locale?: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return d.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

/** CAL-R5-05 Week/multiday range — MM/DD/YYYY. */
export function formatCalendarNumericDate(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

/** CAL-R5-05 range label: MM/DD/YYYY – MM/DD/YYYY. */
export function formatCalendarNumericRange(fromIso: string, toIso: string): string {
  return `${formatCalendarNumericDate(fromIso)} – ${formatCalendarNumericDate(toIso)}`;
}
