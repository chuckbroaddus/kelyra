/** Pure floating-tray tab builders — no React Native imports (unit-testable). */

export type TrayTab = {
  key: string;
  icon: string;
  label: string;
  href: string;
  active: boolean;
  badge?: number;
};

export function trayKeysForRole(role: string): string[] {
  return tabsFor(role, '/', null, 0).map((tab) => tab.key);
}

export function tabsFor(
  role: string,
  pathname: string,
  classId: string | null,
  badgeCount: number,
  homeTab?: string,
  schoolFeedIcon = 'feedSchool',
): TrayTab[] {
  if (role === 'superintendent' || role === 'administrator') {
    const office = officeTrayKey(pathname, homeTab);
    return [
      {
        key: 'feed',
        icon: schoolFeedIcon,
        label: 'Feed',
        href: '/?tab=feed',
        active: office === 'feed',
      },
      {
        key: 'classes',
        icon: 'classes',
        label: 'Classes',
        href: '/?tab=classes',
        active: office === 'classes',
      },
      {
        key: 'people',
        icon: 'person',
        label: 'People',
        href: '/?tab=people',
        active: office === 'people',
      },
      {
        key: 'manage',
        icon: 'manage',
        label: 'Manage',
        href: '/?tab=manage',
        active: office === 'manage',
      },
      { key: 'ask', icon: 'ask', label: 'Kelyra', href: '/ask', active: pathname === '/ask' },
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
      { key: 'ask', icon: 'ask', label: 'Kelyra', href: '/ask', active: pathname === '/ask' },
    ];
  }
  if (role === 'parent') {
    return [
      { key: 'home', icon: 'today', label: 'Home', href: '/parent', active: pathname === '/parent' },
      { key: 'ride', icon: 'work', label: 'Ride', href: '/parent/ride', active: pathname.startsWith('/parent/ride') || pathname.startsWith('/parent/vehicles') },
      { key: 'ask', icon: 'ask', label: 'Kelyra', href: '/ask', active: pathname === '/ask' },
    ];
  }

  const classRoot = classId ? `/class/${classId}` : '/';
  const onClassCluster =
    pathname.endsWith('/setup') ||
    pathname.includes('/gradebook') ||
    pathname.includes('/assignment') ||
    pathname.endsWith('/parents') ||
    pathname.includes('/parent/') ||
    pathname.endsWith('/family');
  const onClass = pathname.startsWith('/class/');
  const houseActive =
    pathname === '/' || (onClass && !onClassCluster && !pathname.includes('/student/'));

  return [
    { key: 'home', icon: 'today', label: 'Desk', href: classRoot, active: houseActive },
    { key: 'capture', icon: 'capture', label: 'Capture', href: '/capture', active: pathname === '/capture' },
    {
      key: 'inbox',
      icon: 'inbox',
      label: 'Needs',
      href: '/inbox',
      active: pathname === '/inbox',
      badge: badgeCount > 0 ? badgeCount : undefined,
    },
    {
      key: 'class',
      icon: 'records',
      label: 'Class',
      href: classId ? `${classRoot}/setup` : '/',
      active: onClassCluster,
    },
    { key: 'ask', icon: 'ask', label: 'Ask', href: '/ask', active: pathname === '/ask' },
  ];
}

function officeTrayKey(
  pathname: string,
  homeTab?: string,
): 'feed' | 'classes' | 'people' | 'manage' | 'ask' | null {
  if (pathname === '/ask') return 'ask';
  if (pathname === '/activity' || pathname === '/admin/matrix' || pathname.startsWith('/admin/ride') || pathname.startsWith('/ride')) return 'manage';
  if (pathname.startsWith('/admin/people') || pathname === '/admin') return 'people';
  if (pathname.startsWith('/admin/class')) return 'classes';
  if (pathname === '/' || pathname === '') {
    if (homeTab === 'feed') return 'feed';
    if (homeTab === 'people') return 'people';
    if (homeTab === 'manage' || homeTab === 'school') return 'manage';
    if (homeTab === 'new') return null;
    return 'classes';
  }
  return null;
}
