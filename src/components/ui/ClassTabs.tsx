import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';

import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import type { IconName } from '@/components/ui/Icon';
import { useClassFeedIcon } from '@/lib/feeds/useFeedIcon';
import {
  CLASS_TABS,
  OFFICE_CLASS_TABS,
  classTabFromRoute,
  hrefForClassTab,
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
  tabsWithFeedIcon,
} from '@/lib/chrome/classTabs';

function asPersonTabs(tabs: ClassDeskTab[]): PersonTab[] {
  return tabs.map((tab) => ({ ...tab, icon: tab.icon as IconName }));
}

/**
 * Icon-first class desk tabs. Selected name, everyone else icon-only — same as people.
 * CT-A: visibilityReserve label policy. Prefer a layout-hosted instance so
 * PersonTabs stays mounted across desk pane navigations (no replace remount kill).
 */
export function ClassTabs({ classId, stacked }: { classId: string; stacked?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const value = classTabFromRoute(pathname, tab);
  const feedIcon = useClassFeedIcon(classId);

  return (
    <PersonTabs
      tabs={tabsWithFeedIcon(asPersonTabs(CLASS_TABS), feedIcon)}
      value={value}
      stacked={stacked}
      labelPolicy="visibilityReserve"
      onChange={(key) => {
        if (key === value) return;
        // Content route may change; PersonTabs itself must live in class `_layout`
        // so this replace does not remount the morph row.
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

/** Today · This week under ClassTabs — CT-A hug/reserve; same morph (demoted week route). */
export function DeskSpanTabs({ value, onChange, stacked, compact }: ShelfProps) {
  return (
    <PersonTabs
      tabs={DESK_SPAN_TABS}
      value={value}
      onChange={onChange}
      stacked={stacked}
      compact={compact}
      labelPolicy="visibilityReserve"
    />
  );
}

/** Gradebook · Heatmap under ClassTabs — default fraction until a later copy card. */
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
