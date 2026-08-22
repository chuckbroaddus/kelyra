import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';

import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import type { IconName } from '@/components/ui/Icon';
import { DEFAULT_CLASS_FEED_ICON } from '@/lib/feeds/icons';
import { useClassFeedIcon } from '@/lib/feeds/useFeedIcon';

export const CLASS_TABS: PersonTab[] = [
  { key: 'feed', label: 'Feed', icon: DEFAULT_CLASS_FEED_ICON },
  { key: 'today', label: 'Today', icon: 'today' },
  { key: 'week', label: 'This week', icon: 'history' },
  { key: 'needs', label: 'Needs you', icon: 'inbox' },
  { key: 'students', label: 'Students', icon: 'setup' },
  { key: 'parents', label: 'Parents', icon: 'parents' },
  { key: 'gradebook', label: 'Gradebook', icon: 'records' },
  { key: 'heatmap', label: 'Heatmap', icon: 'focus' },
  { key: 'assignments', label: 'Assignments', icon: 'work' },
  { key: 'family', label: 'Family', icon: 'mail' },
];

export const OFFICE_CLASS_TABS: PersonTab[] = [
  { key: 'feed', label: 'Feed', icon: DEFAULT_CLASS_FEED_ICON },
  { key: 'teacher', label: 'Teacher', icon: 'person' },
  { key: 'parents', label: 'Parents', icon: 'parents' },
  { key: 'students', label: 'Students', icon: 'setup' },
];

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

export function classTabFromRoute(pathname: string, tab?: string | string[]): string {
  const pane = Array.isArray(tab) ? tab[0] : tab;
  if (pathname.endsWith('/feed')) return 'feed';
  if (pathname.endsWith('/setup')) return 'students';
  if (pathname.endsWith('/parents')) return 'parents';
  if (pathname.endsWith('/family')) return 'family';
  if (pathname.endsWith('/assignments')) return 'assignments';
  if (pathname.includes('/gradebook')) return pane === 'heatmap' ? 'heatmap' : 'gradebook';
  if (pane === 'week' || pane === 'needs' || pane === 'today') return pane;
  return 'today';
}

export function tabsWithFeedIcon(tabs: PersonTab[], icon: IconName): PersonTab[] {
  return tabs.map((tab) => (tab.key === 'feed' ? { ...tab, icon } : tab));
}

/** Icon-first class desk tabs. Selected name, everyone else icon-only — same as people. */
export function ClassTabs({ classId }: { classId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const value = classTabFromRoute(pathname, tab);
  const feedIcon = useClassFeedIcon(classId);

  return (
    <PersonTabs
      tabs={tabsWithFeedIcon(CLASS_TABS, feedIcon)}
      value={value}
      onChange={(key) => {
        if (key === value) return;
        router.replace(hrefForClassTab(classId, key) as never);
      }}
    />
  );
}
