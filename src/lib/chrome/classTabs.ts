/** Pure Class desk tab config — no React Native imports (unit-testable). */

import { DEFAULT_CLASS_FEED_ICON } from '../feeds/icons.ts';

export type ClassDeskTab = {
  key: string;
  label: string;
  icon: string;
};

/** Default Class desk icons (≤7). Week / Heatmap / Family stay reachable via hrefForClassTab. */
export const CLASS_TABS: ClassDeskTab[] = [
  { key: 'today', label: 'Today', icon: 'today' },
  { key: 'needs', label: 'Needs', icon: 'inbox' },
  { key: 'feed', label: 'Feed', icon: DEFAULT_CLASS_FEED_ICON },
  { key: 'students', label: 'Students', icon: 'setup' },
  { key: 'assignments', label: 'Assignments', icon: 'work' },
  { key: 'gradebook', label: 'Gradebook', icon: 'records' },
  { key: 'parents', label: 'Parents', icon: 'parents' },
];

export const OFFICE_CLASS_TABS: ClassDeskTab[] = [
  { key: 'feed', label: 'Feed', icon: DEFAULT_CLASS_FEED_ICON },
  { key: 'teacher', label: 'Teacher', icon: 'person' },
  { key: 'parents', label: 'Parents', icon: 'parents' },
  { key: 'students', label: 'Students', icon: 'setup' },
];

/** Demoted keys: not default ClassTabs icons; routes stay for teacher deep links. */
export const DEMOTED_CLASS_TAB_KEYS = ['week', 'heatmap', 'family'] as const;

export function hrefForClassTab(classId: string, key: string): string {
  switch (key) {
    case 'week':
      return `/class/${classId}?tab=week`;
    case 'needs':
      return `/class/${classId}?tab=needs`;
    case 'feed':
      return `/class/${classId}/feed`;
    case 'students':
      return `/class/${classId}/setup`;
    case 'parents':
      return `/class/${classId}/parents`;
    case 'gradebook':
      return `/class/${classId}/gradebook`;
    case 'heatmap':
      return `/class/${classId}/gradebook?tab=heatmap`;
    case 'assignments':
      return `/class/${classId}/assignments`;
    case 'family':
      return `/class/${classId}/family`;
    default:
      return `/class/${classId}?tab=today`;
  }
}

/**
 * PersonTabs selection key for the current class route.
 * Demoted deep links (week / heatmap / family) highlight a nearby default tab.
 */
export function classTabFromRoute(pathname: string, tab?: string | string[]): string {
  const pane = Array.isArray(tab) ? tab[0] : tab;
  if (pathname.endsWith('/feed')) return 'feed';
  if (pathname.endsWith('/setup')) return 'students';
  if (pathname.endsWith('/parents')) return 'parents';
  if (pathname.endsWith('/family')) return 'parents';
  if (pathname.endsWith('/assignments')) return 'assignments';
  if (pathname.includes('/gradebook')) return 'gradebook';
  if (pane === 'needs') return 'needs';
  if (pane === 'week' || pane === 'today') return 'today';
  return 'today';
}

export function tabsWithFeedIcon<T extends { key: string; icon?: string }>(tabs: T[], icon: string): T[] {
  return tabs.map((tab) => (tab.key === 'feed' ? { ...tab, icon } : tab));
}
