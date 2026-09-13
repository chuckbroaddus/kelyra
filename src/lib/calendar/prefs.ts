import type { CalendarLayer, CalendarSeat } from './types.ts';

/** Architect §7.1 — local only; never consulted by DEFINER RPCs (filters ≠ security). */
export const CAL_PREFS_VERSION = 1 as const;

export type CalPrefsV1 = {
  version: typeof CAL_PREFS_VERSION;
  /** Explicit enabled layer ids. null → derive from layer.defaultEnabled (sport off). */
  enabledCalendarIds: string[] | null;
  /** Selected category chip ids. null → default chips (sport chip off). */
  categoryChipIds: string[] | null;
};

export function calPrefsKey(
  profileId: string,
  seat: CalendarSeat,
  childStudentId?: string | null,
): string {
  const child = childStudentId && childStudentId.length ? childStudentId : 'none';
  return `calprefs:v1:${profileId}:${seat}:${child}`;
}

export function defaultCategoryChipIds(): string[] {
  return ['academic', 'school', 'personal'];
}

/** Sport / team layers start off even when prefs key is empty. */
export function defaultEnabledCalendarIds(layers: CalendarLayer[]): string[] {
  return layers.filter((l) => l.defaultEnabled && l.kind !== 'team').map((l) => l.id);
}

export function resolveEnabledCalendarIds(
  prefs: CalPrefsV1 | null,
  layers: CalendarLayer[],
): string[] {
  if (prefs?.enabledCalendarIds != null) {
    const known = new Set(layers.map((l) => l.id));
    return prefs.enabledCalendarIds.filter((id) => known.has(id));
  }
  return defaultEnabledCalendarIds(layers);
}

export function resolveCategoryChipIds(prefs: CalPrefsV1 | null): string[] {
  if (prefs?.categoryChipIds != null) return [...prefs.categoryChipIds];
  return defaultCategoryChipIds();
}

export function emptyPrefs(): CalPrefsV1 {
  return {
    version: CAL_PREFS_VERSION,
    enabledCalendarIds: null,
    categoryChipIds: null,
  };
}

export function parseCalPrefsJson(raw: string | null | undefined): CalPrefsV1 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CalPrefsV1;
    if (!parsed || parsed.version !== CAL_PREFS_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
