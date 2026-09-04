/** Header wordmark for the current route. Prefer a static label; use pushedTitle for a person, class, or thread name. */
export function headerTitleFor(input: {
  pathname: string;
  pushedTitle: string | null;
  className: string | null;
  contextTab: string;
  role: string;
  schoolName?: string | null;
  officeHome?: boolean;
}): string {
  const { pathname, pushedTitle, className, role, schoolName, officeHome } = input;
  const named = pushedTitle?.trim() || null;

  if (pathname === '/search') return 'Search';
  if (pathname.startsWith('/notifications/')) return named || 'Alert';
  if (pathname === '/notifications') return 'Alerts';
  if (pathname === '/proposal') return 'Look at this';
  if (pathname === '/feed') return named || 'Feed';
  if (pathname === '/activity') return 'Activity';
  if (pathname === '/password') return 'Password';
  if (pathname === '/messages/new') return named || 'New Message';
  if (pathname.startsWith('/messages/info/')) return named || 'Details';
  if (pathname.startsWith('/messages/') && pathname !== '/messages') return named || 'Message';
  if (pathname === '/messages' || pathname.startsWith('/messages')) return 'Messages';
  if (pathname === '/admin/matrix') return named || 'Responsibilities';
  if (pathname.startsWith('/admin/class/')) return named || 'Class';
  if (pathname.startsWith('/admin')) return 'People';
  if (pathname === '/parent') return named || 'Home';
  if (pathname === '/todo') return 'Assignments';
  if (pathname.startsWith('/todo/')) return named || 'Assignments';
  if (pathname.startsWith('/student/feed')) return 'Feeds';
  if (pathname.startsWith('/student/class')) return 'Classes';
  if (pathname.startsWith('/student/grades')) return 'Grades';
  if (pathname.startsWith('/student/people')) return 'People';
  if (/\/class\/[^/]+\/student\//.test(pathname)) return named || 'Student';
  if (pathname.includes('/parent/')) return named || 'Parent';
  if (pathname.endsWith('/assignment/new') || pathname.includes('/assignment/new')) return named || 'Assign';
  if (pathname.includes('/assignment/')) return named || 'Assign';
  if (pathname.includes('/lesson-result/')) return named || 'Lesson';
  if (pathname.includes('/review/')) return named || 'Review';
  if (pathname.startsWith('/lesson')) return named || 'Lesson';
  if (
    pathname.endsWith('/family') ||
    pathname.endsWith('/assignments') ||
    pathname.endsWith('/parents') ||
    pathname.endsWith('/setup') ||
    pathname.endsWith('/syllabus') ||
    pathname.includes('/gradebook') ||
    (pathname.startsWith('/class/') && pathname.endsWith('/feed'))
  ) {
    return named || className || 'Class';
  }
  if (pathname.endsWith('/assign')) return 'Assign';
  if (/^\/class\/[^/]+$/.test(pathname)) return named || className || 'Class';
  if (pathname === '/capture') return 'Capture';
  if (pathname === '/inbox') return 'Needs';
  if (pathname === '/ask') return 'Kelyra';
  if (pathname === '/profile') return named || 'Profile';
  if (pathname === '/join') return 'Join';
  if (pathname === '/' || pathname === '') {
    if (officeHome || role === 'superintendent' || role === 'administrator') {
      return schoolName?.trim() || 'School';
    }
    if (role === 'student') return 'Assignments';
    if (role === 'parent') return 'Home';
    return 'Kelyra';
  }
  return named || 'Kelyra';
}
