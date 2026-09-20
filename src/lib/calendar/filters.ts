import type { CalendarLayer } from './types.ts';
import {
  defaultCategoryChipIds,
  defaultEnabledCalendarIds,
  type CalPrefsV1,
} from './prefs.ts';

/** LF-A category chips — multi-select. Maps to item.category values for p_categories. */
export type CategoryChipDef = {
  id: string;
  label: string;
  categories: string[];
};

export const CATEGORY_CHIPS: CategoryChipDef[] = [
  {
    id: 'academic',
    label: 'Academic',
    categories: ['assignment', 'homework', 'quiz', 'test', 'project', 'lesson', 'class', 'study'],
  },
  { id: 'school', label: 'School', categories: ['school'] },
  { id: 'sport', label: 'Sport', categories: ['sport'] },
  { id: 'personal', label: 'Personal', categories: ['personal', 'absence'] },
];

export type FilterPresetId = 'all_academic' | 'school_only' | 'my_sports' | 'reset';

export const FILTER_PRESETS: Array<{ id: FilterPresetId; label: string }> = [
  { id: 'all_academic', label: 'All academic' },
  { id: 'school_only', label: 'School only' },
  { id: 'my_sports', label: 'My sports' },
  { id: 'reset', label: 'Reset' },
];

/**
 * Expand selected chip ids → category strings for list_calendar_items.
 * Empty selection (Clear Filters) → null = unfiltered categories (CAL-R5-08).
 */
export function categoriesForChips(chipIds: string[]): string[] | null {
  if (!chipIds.length) return null;
  const set = new Set<string>();
  for (const chip of CATEGORY_CHIPS) {
    if (!chipIds.includes(chip.id)) continue;
    for (const c of chip.categories) set.add(c);
  }
  return [...set];
}

/** CAL-R5-08 Clear Filters — deselect every Show chip; restore default layers. */
export function clearFilters(
  layers: CalendarLayer[],
): Pick<CalPrefsV1, 'enabledCalendarIds' | 'categoryChipIds'> {
  return {
    categoryChipIds: [],
    enabledCalendarIds: defaultEnabledCalendarIds(layers),
  };
}

export function toggleChip(chipIds: string[], chipId: string): string[] {
  if (chipIds.includes(chipId)) return chipIds.filter((id) => id !== chipId);
  return [...chipIds, chipId];
}

export function toggleLayerEnabled(enabledIds: string[], layerId: string): string[] {
  if (enabledIds.includes(layerId)) return enabledIds.filter((id) => id !== layerId);
  return [...enabledIds, layerId];
}

/**
 * Apply LF-A preset. Sport layers stay off on Reset / All academic / School only
 * unless the preset is My sports (then enable opted team layers).
 */
export function applyPreset(
  preset: FilterPresetId,
  layers: CalendarLayer[],
): Pick<CalPrefsV1, 'enabledCalendarIds' | 'categoryChipIds'> {
  switch (preset) {
    case 'all_academic':
      return {
        categoryChipIds: ['academic'],
        enabledCalendarIds: layers
          .filter((l) => l.kind === 'class' || l.kind === 'class_work' || l.roleTint === 'academic')
          .map((l) => l.id),
      };
    case 'school_only':
      return {
        categoryChipIds: ['school'],
        enabledCalendarIds: layers.filter((l) => l.kind === 'school').map((l) => l.id),
      };
    case 'my_sports':
      return {
        categoryChipIds: ['sport'],
        enabledCalendarIds: layers.filter((l) => l.kind === 'team').map((l) => l.id),
      };
    case 'reset':
    default:
      return {
        categoryChipIds: defaultCategoryChipIds(),
        enabledCalendarIds: defaultEnabledCalendarIds(layers),
      };
  }
}


/**
 * True when UX filters are narrowed vs Clear (none selected) or cold-start defaults.
 * Clear = chips [] (unfiltered categories) — not narrowed (CAL-R5-08).
 * Cold-start defaults trio + sport off — not narrowed.
 * Sport chip / team layers off is the default — not "narrowed" — so an empty
 * month must not show "Nothing matches these filters" or hide MonthGrid.
 */
export function areFiltersNarrowed(
  chipIds: string[],
  enabledIds: string[],
  layers: CalendarLayer[],
): boolean {
  // Clear Filters baseline: no chips selected = unfiltered categories.
  if (chipIds.length > 0) {
    const defaults = defaultCategoryChipIds();
    const chipSet = new Set(chipIds);
    if (chipSet.size !== defaults.length || defaults.some((id) => !chipSet.has(id))) {
      return true;
    }
  }
  if (!layers.length) return false;
  const defaultEnabled = defaultEnabledCalendarIds(layers);
  if (enabledIds.length !== defaultEnabled.length) return true;
  const enabledSet = new Set(enabledIds);
  return defaultEnabled.some((id) => !enabledSet.has(id));
}

/** Client-side filter is never security — server already gated. Used for empty-state copy. */
export function filterItemsByEnabledLayers<T extends { calendarId: string }>(
  items: T[],
  enabledIds: string[] | null,
): T[] {
  if (enabledIds == null) return items;
  const set = new Set(enabledIds);
  return items.filter((it) => set.has(it.calendarId));
}
