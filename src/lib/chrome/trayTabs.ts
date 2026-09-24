/** Pure floating-tray tab builders — no React Native imports (unit-testable). */

export type TrayTab = {
  key: string;
  icon: string;
  label: string;
  href: string;
  active: boolean;
  badge?: number;
};

/** React remount key so seat switch rebuilds from tabsFor(role) only — never concatenate (P-06). */
export function trayRemountKey(role: string): string {
  return role;
}

export function trayKeysForRole(role: string): string[] {
  return tabsFor(role, '/', null, 0).map((tab) => tab.key);
}

export function tabsFor(
  role: string,
  pathname: string,
  classId: string | null,
  badgeCount: number,
  _homeTab?: string,
  schoolFeedIcon = 'feedSchool',
): TrayTab[] {
  if (role === 'superintendent' || role === 'administrator') {
    const office = officeTrayKey(pathname);
    return [
      {
        key: 'home',
        icon: 'today',
        label: 'Home',
        href: '/',
        active: office === 'home',
      },
      {
        key: 'diary',
        icon: 'diary',
        label: 'Diary',
        href: '/diary',
        active: office === 'diary',
      },
      {
        key: 'calendar',
        icon: 'calendar',
        label: 'Calendar',
        href: '/calendar',
        active: office === 'calendar',
      },
      // Office tray label is KelyraAsk; key/href stay ask /ask.
      { key: 'ask', icon: 'ask', label: 'KelyraAsk', href: '/ask', active: pathname === '/ask' },
    ];
  }
  if (role === 'student') {
    return [
      {
        key: 'home',
        icon: 'work',
        label: 'Assignments',
        href: '/todo',
        active: pathname === '/todo' || pathname.startsWith('/todo/'),
      },
      {
        key: 'feed',
        icon: schoolFeedIcon,
        label: 'Feeds',
        href: '/student/feed',
        active: pathname.startsWith('/student/feed'),
      },
      {
        key: 'class',
        icon: 'classes',
        label: 'Classes',
        href: '/student/class',
        active: pathname.startsWith('/student/class'),
      },
      {
        key: 'grades',
        icon: 'grades',
        label: 'Grades',
        href: '/student/grades',
        active: pathname.startsWith('/student/grades'),
      },
      {
        key: 'people',
        icon: 'person',
        label: 'People',
        href: '/student/people',
        active: pathname.startsWith('/student/people'),
      },
      {
        key: 'calendar',
        icon: 'calendar',
        label: 'Calendar',
        href: '/calendar',
        active: pathname === '/calendar' || pathname.startsWith('/calendar/'),
      },
      { key: 'ask', icon: 'ask', label: 'Ask', href: '/ask', active: pathname === '/ask' },
    ];
  }
  if (role === 'parent') {
    return [
      { key: 'home', icon: 'today', label: 'Home', href: '/parent', active: pathname === '/parent' },
      { key: 'ride', icon: 'ride', label: 'Ride', href: '/parent/ride', active: pathname.startsWith('/parent/ride') || pathname.startsWith('/parent/vehicles') },
      {
        key: 'calendar',
        icon: 'calendar',
        label: 'Calendar',
        href: '/calendar',
        active: pathname === '/calendar' || pathname.startsWith('/calendar/'),
      },
      { key: 'ask', icon: 'ask', label: 'Ask', href: '/ask', active: pathname === '/ask' },
    ];
  }

  // ST-A / Desk-active-on-cluster: structure routes light Desk after Class tray drop.
  const onClass = pathname.startsWith('/class/');
  const houseActive = pathname === '/' || (onClass && !pathname.includes('/student/'));
  const onDiary = pathname === '/diary' || pathname.startsWith('/diary/');

  return [
    { key: 'home', icon: 'today', label: 'Desk', href: '/?switch=1', active: houseActive },
    {
      key: 'inbox',
      icon: 'inbox',
      label: 'Needs Attention',
      href: '/inbox',
      active: pathname === '/inbox',
      badge: badgeCount > 0 ? badgeCount : undefined,
    },
    {
      key: 'diary',
      icon: 'diary',
      label: 'Diary',
      href: '/diary',
      active: onDiary,
    },
    {
      key: 'calendar',
      icon: 'calendar',
      label: 'Calendar',
      href: '/calendar',
      active: pathname === '/calendar' || pathname.startsWith('/calendar/'),
    },
    // KL-A: tray label Kelyra; key/href stay ask /ask.
    { key: 'ask', icon: 'ask', label: 'Kelyra', href: '/ask', active: pathname === '/ask' },
  ];
}

function officeTrayKey(
  pathname: string,
): 'home' | 'diary' | 'calendar' | 'ask' | null {
  if (pathname === '/calendar' || pathname.startsWith('/calendar/')) return 'calendar';
  if (pathname === '/ask') return 'ask';
  if (pathname === '/diary' || pathname.startsWith('/diary/')) return 'diary';
  if (pathname === '/' || pathname === '') return 'home';
  return null;
}
