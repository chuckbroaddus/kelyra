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
  tabsWithFeedIcon,
} from '@/lib/chrome/classTabs';

function asPersonTabs(tabs: ClassDeskTab[]): PersonTab[] {
  return tabs.map((tab) => ({ ...tab, icon: tab.icon as IconName }));
}

/** Icon-first class desk tabs. Selected name, everyone else icon-only — same as people. */
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
      onChange={(key) => {
        if (key === value) return;
        router.replace(hrefForClassTab(classId, key) as never);
      }}
    />
  );
}

/** Office class card uses the same PersonTab shape. */
export function officeClassPersonTabs(feedIcon: IconName): PersonTab[] {
  return tabsWithFeedIcon(asPersonTabs(OFFICE_CLASS_TABS), feedIcon);
}
