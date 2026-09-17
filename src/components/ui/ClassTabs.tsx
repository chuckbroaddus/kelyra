import {
  useGlobalSearchParams,
  usePathname,
  useRouter,
} from 'expo-router';

import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import type { IconName } from '@/components/ui/Icon';
import { useClassFeedIcon } from '@/lib/feeds/useFeedIcon';
import {
  CLASS_TABS,
  OFFICE_CLASS_TABS,
  classTabFromRoute,
  hrefForClassTab,
  isClassIndexPath,
  isClassIndexTab,
  tabsWithFeedIcon,
  type ClassDeskTab,
} from '@/lib/chrome/classTabs';

export {
  CLASS_TABS,
  DEMOTED_CLASS_TAB_KEYS,
  OFFICE_CLASS_TABS,
  classTabFromRoute,
  hrefForClassTab,
  isClassDeskTabsRoute,
  isClassIndexPath,
  isClassIndexTab,
  tabsWithFeedIcon,
} from '@/lib/chrome/classTabs';

function asPersonTabs(tabs: ClassDeskTab[]): PersonTab[] {
  return tabs.map((tab) => ({ ...tab, icon: tab.icon as IconName }));
}

/**
 * Icon-first class desk tabs. Selected name, everyone else icon-only — same as people.
 * FoM PersonTabs default (visibilityReserve). Layout-hosted so PersonTabs stays
 * mounted across pane nav. Needs Attention: global `tab` + setParams on index.
 */
export function ClassTabs({ classId, stacked }: { classId: string; stacked?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  // Layout-local useLocalSearchParams often omits `?tab=` — global keeps Needs selected.
  const params = useGlobalSearchParams<{ tab?: string | string[] }>();
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const value = classTabFromRoute(pathname, tab);
  const feedIcon = useClassFeedIcon(classId);

  return (
    <PersonTabs
      tabs={tabsWithFeedIcon(asPersonTabs(CLASS_TABS), feedIcon)}
      value={value}
      stacked={stacked}
      onChange={(key) => {
        if (key === value) return;
        // Same-route index panes: setParams keeps `?tab=` without a replace that
        // drops query / remounts selection (Today ↔ Needs ↔ week).
        if (isClassIndexTab(key) && isClassIndexPath(pathname)) {
          router.setParams({ tab: key });
          return;
        }
        // Cross-route (e.g. Feed → Needs): replace must land on index `?tab=needs`.
        router.replace(hrefForClassTab(classId, key) as never);
      }}
    />
  );
}

/** Office class card uses the same PersonTab shape. */
export function officeClassPersonTabs(feedIcon: IconName): PersonTab[] {
  return tabsWithFeedIcon(asPersonTabs(OFFICE_CLASS_TABS), feedIcon);
}

const DESK_SPAN_TABS: PersonTab[] = [
  { key: 'today', label: 'Today', icon: 'today' },
  { key: 'week', label: 'This week', icon: 'history' },
];

const GRADEBOOK_VIEW_TABS: PersonTab[] = [
  { key: 'gradebook', label: 'Gradebook', icon: 'records' },
  { key: 'heatmap', label: 'Heatmap', icon: 'grades' },
];

type ShelfProps = {
  value: string;
  onChange: (key: string) => void;
  stacked?: boolean;
  compact?: boolean;
};

/** Today · This week under ClassTabs — FoM PersonTabs default; demoted week route. */
export function DeskSpanTabs({ value, onChange, stacked, compact }: ShelfProps) {
  return (
    <PersonTabs
      tabs={DESK_SPAN_TABS}
      value={value}
      onChange={onChange}
      stacked={stacked}
      compact={compact}
    />
  );
}

/** Gradebook · Heatmap under ClassTabs — FoM PersonTabs default. */
export function GradebookViewTabs({ value, onChange, stacked, compact }: ShelfProps) {
  return (
    <PersonTabs
      tabs={GRADEBOOK_VIEW_TABS}
      value={value}
      onChange={onChange}
      stacked={stacked}
      compact={compact}
    />
  );
}
