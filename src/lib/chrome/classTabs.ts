/** Pure Class desk tab config — no React Native imports (unit-testable). */

import { DEFAULT_CLASS_FEED_ICON } from '../feeds/icons.ts';

export type ClassDeskTab = {
  key: string;
  label: string;
  icon: string;
};

/** Default Class desk icons (≤8). Week / Heatmap / Family stay reachable via hrefForClassTab. */
export const CLASS_TABS: ClassDeskTab[] = [
  { key: 'today', label: 'Today', icon: 'today' },
  { key: 'needs', label: 'Needs Attention', icon: 'inbox' },
  { key: 'feed', label: 'Feed', icon: DEFAULT_CLASS_FEED_ICON },
  { key: 'students', label: 'Students', icon: 'setup' },
  { key: 'assignments', label: 'Assignments', icon: 'work' },
  { key: 'gradebook', label: 'Gradebook', icon: 'records' },
  { key: 'parents', label: 'Parents', icon: 'parents' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

export const OFFICE_CLASS_TABS: ClassDeskTab[] = [
  { key: 'feed', label: 'Feed', icon: DEFAULT_CLASS_FEED_ICON },
  { key: 'teacher', label: 'Teacher', icon: 'person' },
  { key: 'parents', label: 'Parents', icon: 'parents' },
  { key: 'students', label: 'Students', icon: 'setup' },
];

/** Demoted keys: not default ClassTabs icons; routes stay for teacher deep links. */
export const DEMOTED_CLASS_TAB_KEYS = ['week', 'heatmap', 'family'] as const;


/** True for `/class/:id` (index desk) — no dedicated pane segment. */
export function isClassIndexPath(pathname: string): boolean {
  return /\/class\/[^/]+\/?$/.test(pathname);
}

/** Today / week / needs live on the class index via `?tab=`. */
export function isClassIndexTab(key: string): boolean {
  return key === 'today' || key === 'week' || key === 'needs';
}

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
    case 'settings':
      return `/class/${classId}/settings`;
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
  // Index query panes (needs/today/week) — check BEFORE dedicated segments so a
  // stale /feed pathname cannot win after replace to `?tab=needs` (CEO bounce).
  if (isClassIndexPath(pathname)) {
    if (pane === 'needs') return 'needs';
    if (pane === 'week' || pane === 'today') return 'today';
    return 'today';
  }
  if (pathname.endsWith('/feed')) return 'feed';
  if (pathname.endsWith('/setup')) return 'students';
  if (pathname.endsWith('/settings') || pathname.endsWith('/syllabus')) return 'settings';
  if (pathname.endsWith('/parents')) return 'parents';
  if (pathname.endsWith('/family')) return 'parents';
  if (pathname.endsWith('/assignments')) return 'assignments';
  if (pathname.includes('/gradebook')) return 'gradebook';
  // Non-index fallback: honor explicit needs query if present.
  if (pane === 'needs') return 'needs';
  if (pane === 'week' || pane === 'today') return 'today';
  return 'today';
}

export function tabsWithFeedIcon<T extends { key: string; icon?: string }>(tabs: T[], icon: string): T[] {
  return tabs.map((tab) => (tab.key === 'feed' ? { ...tab, icon } : tab));
}

/** Desk panes that show ClassTabs (not student/assignment/review/parent-detail). */
export function isClassDeskTabsRoute(pathname: string): boolean {
  if (!pathname.includes('/class/')) return false;
  if (pathname.includes('/student/')) return false;
  if (pathname.includes('/assignment/')) return false;
  if (pathname.includes('/review/')) return false;
  if (pathname.includes('/lesson-result/')) return false;
  if (pathname.includes('/parent/') && !pathname.endsWith('/parents')) return false;
  if (pathname.endsWith('/assign')) return false;
  return true;
}

