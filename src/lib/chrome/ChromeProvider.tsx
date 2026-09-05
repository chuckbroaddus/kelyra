import { usePathname, useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Alert,
  Animated,
  AppState,
  Easing,
  Keyboard,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { chrome } from '@/constants/theme';
import { isOpenWork } from '@/lib/assignments/status';
import { useAuth } from '@/lib/auth/AuthProvider';
import { unreadCount } from '@/lib/messages/api';
import { isStaffRole } from '@/lib/school/roles';
import {
  canChooseChromeSeat,
  loadChromeSeatPreference,
  resolveStaffChromeRole,
  saveChromeSeatPreference,
  type ChromeSeatPreference,
} from '@/lib/chrome/seat';
import { countNeedsYou } from '@/lib/captures/api';
import { countAlertsForMe, markAlertRead, subscribeAlertBell } from '@/lib/posts/api';
import { listClasses, resolveCaptureClass } from '@/lib/classes/api';
import { transcribeAudioDirect } from '@/lib/matching/captureSpeech';
import { startLiveRecording, type LiveRecording } from '@/lib/media/recorder';
import { pickNormalizedPhoto } from '@/lib/media/pickPhoto';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import { photoUrlsForProfiles, signedProfileUrlForAssetId } from '@/lib/people/photos';
import { getSchoolIdentity } from '@/lib/school/identity';
import { listParentTokens, parentBellCount, type StoredParentChild } from '@/lib/parents/session';
import { setProposalDraft } from '@/lib/proposal/session';
import { loadStudentSession, type StudentSession } from '@/lib/student-session/api';
import type { ClassRow } from '@/lib/supabase/types';
import { useLayout } from '@/lib/theme/layout';

export type ChromeRole = 'superintendent' | 'administrator' | 'teacher' | 'student' | 'parent' | 'none';

export type HeaderChrome = {
  hideBack?: boolean;
  hideBackOnNative?: boolean;
  /** Keep AppHeader < on iOS even when edge-swipe can pop (dirty discard). */
  forceBackChevron?: boolean;
  hideMenu?: boolean;
  hideSearch?: boolean;
  hideMail?: boolean;
  hideCapture?: boolean;
  showClose?: boolean;
};

type ChromeValue = {
  role: ChromeRole;
  /** Dual-hat only: switch Office ↔ Teacher chrome. No-op when the profile cannot choose. */
  setChromeSeat: (seat: ChromeSeatPreference) => void;
  canChooseSeat: boolean;
  visible: boolean;
  forceHidden: boolean;
  setForceHidden: (hidden: boolean) => void;
  headerChrome: HeaderChrome;
  setHeaderChrome: (next: HeaderChrome | null) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showChrome: () => void;
  trayTranslate: Animated.Value;
  /** Distance the tray travels when it hides. Overlay chrome (Export CSV) should travel at least this far plus its own height. */
  trayHideDistance: number;
  contextTranslate: Animated.Value;
  trayOpacity: Animated.Value;
  contextOpacity: Animated.Value;
  localTrayTranslate: Animated.Value;
  localTrayOpacity: Animated.Value;
  trayPadding: number;
  contextReserve: number;
  headerHeight: number;
  trayRest: number;
  localTray: boolean;
  setLocalTray: (on: boolean) => void;
  keepLocalTray: boolean;
  setKeepLocalTray: (on: boolean) => void;
  keyboardHeight: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchFrom: string;
  setSearchFrom: (path: string) => void;
  pushedTitle: string | null;
  setPushedTitle: (title: string | null, path?: string) => void;
  setPushedBackHandler: (handler: (() => boolean) | null) => void;
  requestPushedBack: () => boolean;
  setHeaderCloseHandler: (handler: (() => void) | null) => void;
  requestHeaderClose: () => boolean;
  badgeCount: number;
  /** Teacher Needs tray badge: unassigned + draft-ready count only (no names/scores). */
  needsCount: number;
  messageCount: number;
  classId: string | null;
  className: string | null;
  schoolName: string | null;
  schoolLogoUrl: string | null;
  classes: ClassRow[];
  studentSession: StudentSession | null;
  parentTokens: StoredParentChild[];
  /** Signed face for the signed-in person (teacher, student, or parent). */
  teacherPhotoUrl: string | null;
  refreshChrome: () => void;
  /** Drop this alert from the bell without removing it from the inbox. */
  acknowledgeAlert: (postId: string) => void;
  openHeaderCamera: () => void;
  headerCameraOpen: boolean;
  headerListenOpen: boolean;
  headerListening: boolean;
  setHeaderCameraOpen: (open: boolean) => void;
  onHeaderPhoto: (uri: string, mimeType: string) => void;
  onHeaderTakePhoto: () => void;
  onHeaderVoiceOnly: () => void;
  cancelHeaderListen: () => void;
  contextTab: string;
  setContextTab: (tab: string, path?: string) => void;
  keyboardVisible: boolean;
};

export function defaultContextTab(pathname: string): string {
  if (pathname === '/inbox') return 'all';
  if (pathname === '/capture') return 'photo';
  if (pathname === '/todo') return 'todo';
  return '';
}

const ChromeContext = createContext<ChromeValue | null>(null);

function isPushedPath(pathname: string): boolean {
  // Tray roots (/parent, /parent/ride, class desk cluster) are not pushes.
  // Class person cards and other stack screens are.
  if (pathname === '/parent' || pathname === '/parent/ride' || pathname.startsWith('/parent/vehicles')) {
    return false;
  }
  if (pathname === '/messages' || pathname === '/ask' || pathname === '/capture' || pathname === '/inbox') {
    return false;
  }
  // Class cluster tray destinations (setup / gradebook / parents / family) — not a push.
  if (
    /^\/class\/[^/]+\/(setup|gradebook|parents|family)(?:\/|$)/.test(pathname) ||
    /^\/class\/[^/]+$/.test(pathname)
  ) {
    return false;
  }
  return (
    /\/class\/[^/]+\/student\//.test(pathname) ||
    /\/class\/[^/]+\/parent\//.test(pathname) ||
    pathname.includes('/assignment/') ||
    pathname.includes('/lesson') ||
    pathname === '/search' ||
    pathname === '/feed' ||
    /^\/todo\/[^/]+/.test(pathname) ||
    pathname === '/notifications' ||
    pathname.startsWith('/notifications/') ||
    pathname === '/proposal' ||
    pathname.startsWith('/messages/') ||
    pathname === '/activity' ||
    pathname === '/diary' ||
    pathname.startsWith('/admin') ||
    pathname === '/password'
  );
}

export function ChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { teacher, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;

  const [forceHidden, setForceHidden] = useState(false);
  const [headerChrome, setHeaderChromeState] = useState<HeaderChrome>({});
  const setHeaderChrome = useCallback((next: HeaderChrome | null) => {
    setHeaderChromeState(next ?? {});
  }, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFrom, setSearchFrom] = useState('/');
  const [pushedTitleState, setPushedTitleState] = useState<{ path: string; title: string } | null>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const setPushedTitle = useCallback((title: string | null, path?: string) => {
    const key = path ?? pathnameRef.current;
    setPushedTitleState((current) => {
      if (title == null || !title.trim()) {
        return current?.path === key ? null : current;
      }
      return { path: key, title: title.trim() };
    });
  }, []);
  const pushedTitle = pushedTitleState?.path === pathname ? pushedTitleState.title : null;
  const [badgeCount, setBadgeCount] = useState(0);
  const [needsCount, setNeedsCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [classId, setClassId] = useState<string | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [parentTokens, setParentTokens] = useState<StoredParentChild[]>([]);
  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string | null>(null);
  const [headerCameraOpen, setHeaderCameraOpen] = useState(false);
  const [headerListenOpen, setHeaderListenOpen] = useState(false);
  const [headerListening, setHeaderListening] = useState(false);
  const [tick, setTick] = useState(0);
  const [contextByPath, setContextByPath] = useState<Record<string, string>>({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [localTray, setLocalTrayState] = useState(false);
  const [keepLocalTray, setKeepLocalTrayState] = useState(false);
  const localTrayRef = useRef(false);
  const keepLocalRef = useRef(false);
  const [seatPreference, setSeatPreference] = useState<ChromeSeatPreference | null>(null);
  const canChooseSeat = canChooseChromeSeat(profile);

  useEffect(() => {
    let live = true;
    if (!profile?.id || !canChooseChromeSeat(profile)) {
      setSeatPreference(null);
      return;
    }
    void loadChromeSeatPreference(profile.id).then((stored) => {
      if (live) setSeatPreference(stored);
    });
    return () => {
      live = false;
    };
  }, [profile?.id, profile?.role, profile?.also_teacher]);

  const setChromeSeat = useCallback(
    (seat: ChromeSeatPreference) => {
      if (!profile?.id || !canChooseChromeSeat(profile)) return;
      setSeatPreference(seat);
      void saveChromeSeatPreference(profile.id, seat);
    },
    [profile],
  );

  const trayTranslate = useRef(new Animated.Value(0)).current;
  const contextTranslate = useRef(new Animated.Value(0)).current;
  const trayOpacity = useRef(new Animated.Value(1)).current;
  const contextOpacity = useRef(new Animated.Value(1)).current;
  const localTrayTranslate = useRef(new Animated.Value(0)).current;
  const localTrayOpacity = useRef(new Animated.Value(1)).current;
  const lastY = useRef(0);
  const acc = useRef(0);
  const lastDir = useRef<1 | -1 | 0>(0);
  const visibleRef = useRef(true);
  const ignoreScrollUntil = useRef(0);
  const headerVoice = useRef<LiveRecording | null>(null);
  const pushedBackHandler = useRef<(() => boolean) | null>(null);
  const setPushedBackHandler = useCallback((handler: (() => boolean) | null) => {
    pushedBackHandler.current = handler;
  }, []);
  const requestPushedBack = useCallback(() => {
    return pushedBackHandler.current ? pushedBackHandler.current() : false;
  }, []);
  const headerCloseHandler = useRef<(() => void) | null>(null);
  const setHeaderCloseHandler = useCallback((handler: (() => void) | null) => {
    headerCloseHandler.current = handler;
  }, []);
  const requestHeaderClose = useCallback(() => {
    if (!headerCloseHandler.current) return false;
    headerCloseHandler.current();
    return true;
  }, []);

  const headerHeight =
    (landscape ? chrome.headerHeightLandscape : chrome.headerHeight) + insets.top;
  const trayHeight = landscape ? chrome.trayHeightLandscape : chrome.trayHeight;
  const contextH = landscape ? chrome.contextHeightLandscape : chrome.contextHeight;
  const bottomInset = layout.showTopBar
    ? 0
    : landscape
      ? 6 + Math.max(insets.bottom, 6)
      : 8 + Math.max(insets.bottom, 8);
  const trayRest = layout.showTopBar ? 12 : trayHeight + bottomInset;
  const localExtra = localTray ? trayHeight + 8 : 0;
  const trayPadding = trayRest + localExtra + 12;

  const setLocalTray = useCallback((on: boolean) => {
    localTrayRef.current = on;
    setLocalTrayState(on);
    if (!on) {
      keepLocalRef.current = false;
      setKeepLocalTrayState(false);
    }
  }, []);
  const setKeepLocalTray = useCallback((on: boolean) => {
    keepLocalRef.current = on;
    setKeepLocalTrayState(on);
  }, []);

  const role: ChromeRole = useMemo(() => {
    if (pathname === '/sign-in' || pathname === '/join' || pathname === '/password') return 'none';
    // Explicit seat for dual-hat office+teacher. Do not let also_teacher force teacher tray.
    const staffRole = resolveStaffChromeRole(profile, seatPreference);
    if (staffRole) return staffRole;
    if (profile?.role === 'parent') return 'parent';
    if (profile?.role === 'student') return 'student';
    if (pathname === '/parent' || pathname.startsWith('/parent')) {
      return parentTokens.length || pathname.includes('t=') ? 'parent' : 'none';
    }
    if (pathname === '/todo') return studentSession ? 'student' : 'none';
    if (teacher && isStaffRole(profile)) return 'teacher';
    if (teacher && !profile) return 'teacher';
    if (studentSession) return 'student';
    if (parentTokens.length) return 'parent';
    return 'none';
  }, [pathname, teacher, profile, studentSession, parentTokens.length, seatPreference]);

  const contextReserve = useMemo(() => {
    if (role === 'none') return 0;
    if (isPushedPath(pathname)) return 0;
    if (pathname === '/ask' || pathname === '/profile' || pathname === '/messages' || pathname === '/activity') return 0;
    // School home and class desk use in-page PersonTabs, not the Amazon context row.
    if (role === 'student') return 0;
    if (pathname === '/' || pathname === '' || /^\/class\//.test(pathname) || pathname.startsWith('/student/')) return 0;
    return contextH;
  }, [role, pathname, contextH]);

  const contextTab = contextByPath[pathname] ?? defaultContextTab(pathname);
  const setContextTab = useCallback((tab: string, path?: string) => {
    const key = path ?? pathname;
    setContextByPath((current) => (current[key] === tab ? current : { ...current, [key]: tab }));
  }, [pathname]);

  const hideDistance =
    (layout.showTopBar ? 0 : trayHeight) + (localTray ? trayHeight + 8 : 0) + bottomInset + 28;

  const animate = useCallback(
    (show: boolean, opts?: { system?: boolean; local?: boolean }) => {
      const moveSystem = opts?.system ?? true;
      const moveLocal = opts?.local ?? true;
      if (moveSystem) {
        visibleRef.current = show;
        setVisible(show);
      }
      const dur = chrome.motion.tray;
      const stagger = localTrayRef.current ? chrome.motion.trayStagger : 0;
      const ease = Easing.out(Easing.cubic);
      const system = Animated.parallel([
        Animated.timing(trayTranslate, {
          toValue: show ? 0 : hideDistance,
          duration: dur,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(contextTranslate, {
          toValue: show ? 0 : -contextH,
          duration: dur,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(trayOpacity, {
          toValue: show ? 1 : 0,
          duration: dur,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(contextOpacity, {
          toValue: show ? 1 : 0,
          duration: dur,
          easing: ease,
          useNativeDriver: true,
        }),
      ]);
      const local = Animated.parallel([
        Animated.timing(localTrayTranslate, {
          toValue: show ? 0 : hideDistance,
          duration: dur,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(localTrayOpacity, {
          toValue: show ? 1 : 0,
          duration: dur,
          easing: ease,
          useNativeDriver: true,
        }),
      ]);
      if (!moveLocal) {
        if (moveSystem) system.start();
        return;
      }
      if (!moveSystem) {
        local.start();
        return;
      }
      if (show) {
        Animated.parallel([system, Animated.sequence([Animated.delay(stagger), local])]).start();
      } else {
        Animated.parallel([local, Animated.sequence([Animated.delay(stagger), system])]).start();
      }
    },
    [
      contextH,
      contextOpacity,
      contextTranslate,
      hideDistance,
      localTrayOpacity,
      localTrayTranslate,
      trayOpacity,
      trayTranslate,
    ],
  );

  const showChrome = useCallback(() => animate(true), [animate]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.visualViewport) {
      const vv = window.visualViewport;
      const sync = () => {
        const cover = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        if (cover > 80) {
          setKeyboardVisible(true);
          setKeyboardHeight(cover);
        } else {
          ignoreScrollUntil.current = Date.now() + 450;
          setKeyboardVisible(false);
          setKeyboardHeight(0);
        }
      };
      vv.addEventListener('resize', sync);
      vv.addEventListener('scroll', sync);
      return () => {
        vv.removeEventListener('resize', sync);
        vv.removeEventListener('scroll', sync);
      };
    }
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      ignoreScrollUntil.current = Date.now() + 450;
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (forceHidden || drawerOpen || headerCameraOpen) {
      animate(false);
      return;
    }
    if (keyboardVisible) {
      animate(false, { system: true, local: false });
      if (localTrayRef.current) animate(true, { system: false, local: true });
      return;
    }
    animate(true);
  }, [forceHidden, drawerOpen, headerCameraOpen, keyboardVisible, keepLocalTray, animate]);

  useEffect(() => {
    let live = true;
    void (async () => {
      if (profile) {
        const urls = await photoUrlsForProfiles([profile]);
        if (live) setTeacherPhotoUrl(urls.get(profile.id) ?? null);
        return;
      }
      if (teacher?.photo_asset_id) {
        const url = await signedProfileUrlForAssetId(teacher.photo_asset_id);
        if (live) setTeacherPhotoUrl(url);
        return;
      }
      if (live) setTeacherPhotoUrl(null);
    })();
    return () => {
      live = false;
    };
  }, [profile, teacher?.photo_asset_id, tick]);

  useEffect(() => {
    if (!profile) {
      setSchoolName(null);
      setSchoolLogoUrl(null);
      return;
    }
    let live = true;
    void getSchoolIdentity()
      .then((row) => {
        if (!live) return;
        setSchoolName(row?.name ?? null);
        setSchoolLogoUrl(row?.logoUrl ?? null);
      })
      .catch(() => {
        if (live) {
          setSchoolName(null);
          setSchoolLogoUrl(null);
        }
      });
    return () => {
      live = false;
    };
  }, [profile?.school_id, tick]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (forceHidden || drawerOpen || headerCameraOpen || keyboardVisible) return;
      if (Date.now() < ignoreScrollUntil.current) return;
      const { contentOffset, contentSize, layoutMeasurement, velocity } = event.nativeEvent;
      const y = contentOffset.y;
      const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);

      // iOS rubber-band past the end looks like a swipe-down and would
      // bring Students / Heatmap / Gradebook back. Ignore it.
      if (y > maxY) {
        lastY.current = maxY;
        acc.current = 0;
        lastDir.current = 0;
        return;
      }

      if (y < 8) {
        lastY.current = y;
        acc.current = 0;
        if (!visibleRef.current) animate(true);
        return;
      }
      const dy = y - lastY.current;
      lastY.current = y;
      const vy = velocity?.y ?? 0;
      if (vy > 1.2) {
        acc.current = 0;
        if (visibleRef.current) animate(false);
        return;
      }
      // Bounce-back near the end also reports a fast negative vy.
      if (vy < -1.2) {
        acc.current = 0;
        if (y >= maxY - 16) return;
        if (!visibleRef.current) animate(true);
        return;
      }
      const dir: 1 | -1 | 0 = dy > 0 ? 1 : dy < 0 ? -1 : 0;
      if (dir !== 0 && dir !== lastDir.current) {
        acc.current = 0;
        lastDir.current = dir;
      }
      acc.current += dy;
      if (acc.current > 12 && visibleRef.current) {
        acc.current = 0;
        animate(false);
      } else if (acc.current < -8 && !visibleRef.current) {
        if (y >= maxY - 16) {
          acc.current = 0;
          return;
        }
        acc.current = 0;
        animate(true);
      }
    },
    [animate, drawerOpen, forceHidden, headerCameraOpen, keyboardVisible],
  );

  const refreshChrome = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const tokens = await listParentTokens();
      if (cancelled) return;
      setParentTokens(tokens);
      if (profile?.role === 'student') {
        try {
          const session = await loadStudentSession();
          if (!cancelled) setStudentSession(session);
        } catch {
          if (!cancelled) setStudentSession(null);
        }
      } else if (!cancelled) {
        setStudentSession(null);
      }
      const alerts = await countAlertsForMe().catch(() => 0);
      if (teacher) {
        try {
          const all = await listClasses();
          if (cancelled) return;
          setClasses(all);
          const pathClass = pathname.match(/^\/class\/([^/]+)/)?.[1] ?? null;
          const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id, pathClass);
          if (cancelled) return;
          setClassId(klass.id);
          setClassName(klass.name);
          // Needs badge follows chrome seat, not profile hats (dual-hat Teach seat).
          const work = role === 'teacher' ? await countNeedsYou(klass.id).catch(() => 0) : 0;
          if (!cancelled) {
            setNeedsCount(work);
            setBadgeCount(alerts + work);
          }
        } catch {
          if (!cancelled) {
            setClassId(null);
            setClassName(null);
            setNeedsCount(0);
            setBadgeCount(alerts);
          }
        }
        return;
      }
      if (profile?.role === 'student') return;
      const parentNotes = await parentBellCount(tokens);
      if (!cancelled) {
        setNeedsCount(0);
        setBadgeCount(alerts + parentNotes);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teacher, profile?.role, pathname, tick, role]);

  useEffect(() => {
    if (!studentSession || role !== 'student') return;
    let cancelled = false;
    void (async () => {
      try {
        const { listStudentTodo } = await import('@/lib/student-session/api');
        const items = await listStudentTodo();
        const alerts = await countAlertsForMe().catch(() => 0);
        if (!cancelled) {
          setBadgeCount(items.filter((item) => isOpenWork(item.status)).length + alerts);
        }
      } catch {
        if (!cancelled) setBadgeCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentSession, role, pathname, tick]);

  const refreshBell = useCallback(async () => {
    if (role === 'none') {
      setNeedsCount(0);
      setBadgeCount(0);
      return;
    }
    const alerts = await countAlertsForMe().catch(() => 0);
    if (role === 'student') {
      setNeedsCount(0);
      if (!studentSession) {
        setBadgeCount(alerts);
        return;
      }
      try {
        const { listStudentTodo } = await import('@/lib/student-session/api');
        const items = await listStudentTodo();
        setBadgeCount(items.filter((item) => isOpenWork(item.status)).length + alerts);
      } catch {
        setBadgeCount(alerts);
      }
      return;
    }
    if (role === 'teacher' && teacher && classId) {
      const work = await countNeedsYou(classId).catch(() => 0);
      setNeedsCount(work);
      setBadgeCount(alerts + work);
      return;
    }
    setNeedsCount(0);
    if (role === 'parent') {
      const notes = await parentBellCount(parentTokens).catch(() => 0);
      setBadgeCount(alerts + notes);
      return;
    }
    setBadgeCount(alerts);
  }, [role, studentSession, teacher, classId, parentTokens]);

  const acknowledgeAlert = useCallback((postId: string) => {
    void markAlertRead(postId).then((fresh) => {
      if (!fresh) return;
      setBadgeCount((n) => Math.max(0, n - 1));
      void refreshBell();
    });
  }, [refreshBell]);

  useEffect(() => {
    if (role === 'none') return;
    void refreshBell();
    const interval = setInterval(() => {
      void refreshBell();
    }, 12000);
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshBell();
    });
    const stop = subscribeAlertBell(() => {
      void refreshBell();
    });
    return () => {
      clearInterval(interval);
      app.remove();
      stop();
    };
  }, [role, refreshBell]);

  useEffect(() => {
    if (!profile || role === 'none') {
      setMessageCount(0);
      return;
    }
    let cancelled = false;
    void unreadCount().then((n) => {
      if (!cancelled) setMessageCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, role, pathname, tick]);

  useEffect(() => {
    if (profile?.must_change_password && pathname !== '/password') {
      router.replace('/password');
    }
  }, [profile?.must_change_password, pathname, router]);

  const stopHeaderVoice = useCallback(async () => {
    const rec = headerVoice.current;
    headerVoice.current = null;
    if (!rec) return null;
    try {
      return await rec.stop();
    } catch {
      return null;
    }
  }, []);

  const setHeaderCameraOpenSafe = useCallback(
    (open: boolean) => {
      if (!open) void stopHeaderVoice();
      setHeaderCameraOpen(open);
    },
    [stopHeaderVoice],
  );

  const onHeaderPhoto = useCallback(
    (uri: string, mimeType: string) => {
      void (async () => {
        const spokenAudio = await stopHeaderVoice();
        setHeaderListening(false);
        setHeaderCameraOpen(false);
        const spokenPending = spokenAudio
          ? transcribeAudioDirect({ uri: spokenAudio.uri, mimeType: spokenAudio.mimeType }).catch(() => '')
          : undefined;
        try {
          if (!teacher) {
            setProposalDraft({ uri, mimeType, spokenAudio: spokenAudio ?? undefined, spokenPending });
            router.push('/proposal');
            return;
          }
          const asset = await uploadTeacherAsset({
            teacherId: teacher.id,
            kind: 'photo',
            uri,
            mimeType,
          });
          const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
          if (!imageUrl) throw new Error('Could not open that photo.');
          setProposalDraft({
            uri,
            mimeType,
            assetId: asset.id,
            imageUrl,
            spokenAudio: spokenAudio ?? undefined,
            spokenPending,
          });
          router.push('/proposal');
        } catch (err) {
          Alert.alert('Photo', err instanceof Error ? err.message : 'Could not save that photo.');
        }
      })();
    },
    [router, stopHeaderVoice, teacher],
  );

  const openHeaderCamera = useCallback(() => {
    if (pathnameRef.current.startsWith('/messages')) return;
    void (async () => {
      try {
        headerVoice.current = await startLiveRecording();
        setHeaderListening(true);
      } catch {
        headerVoice.current = null;
        setHeaderListening(false);
      }
      setHeaderListenOpen(true);
    })();
  }, []);

  const onHeaderTakePhoto = useCallback(() => {
    if (pathnameRef.current.startsWith('/messages')) {
      void stopHeaderVoice();
      setHeaderListening(false);
      setHeaderListenOpen(false);
      return;
    }
    setHeaderListenOpen(false);
    if (Platform.OS === 'web') {
      setHeaderCameraOpen(true);
      return;
    }
    void (async () => {
      try {
        const photo = await pickNormalizedPhoto(true);
        if (!photo) {
          await stopHeaderVoice();
          setHeaderListening(false);
          return;
        }
        onHeaderPhoto(photo.uri, photo.mimeType);
      } catch (err) {
        await stopHeaderVoice();
        setHeaderListening(false);
        Alert.alert('Photo', err instanceof Error ? err.message : 'Could not open the camera.');
      }
    })();
  }, [onHeaderPhoto, stopHeaderVoice]);

  const onHeaderVoiceOnly = useCallback(() => {
    void (async () => {
      const spokenAudio = await stopHeaderVoice();
      setHeaderListening(false);
      setHeaderListenOpen(false);
      const spokenPending = spokenAudio
        ? transcribeAudioDirect({ uri: spokenAudio.uri, mimeType: spokenAudio.mimeType }).catch(() => '')
        : undefined;
      setProposalDraft({
        uri: '',
        mimeType: '',
        audioOnly: true,
        spokenAudio: spokenAudio ?? undefined,
        spokenPending,
      });
      router.push('/proposal');
    })();
  }, [router, stopHeaderVoice]);

  const cancelHeaderListen = useCallback(() => {
    void stopHeaderVoice();
    setHeaderListening(false);
    setHeaderListenOpen(false);
    setHeaderCameraOpen(false);
  }, [stopHeaderVoice]);

  const value = useMemo<ChromeValue>(
    () => ({
      role,
      setChromeSeat,
      canChooseSeat,
      visible,
      forceHidden,
      setForceHidden,
      headerChrome,
      setHeaderChrome,
      drawerOpen,
      setDrawerOpen,
      onScroll,
      showChrome,
      trayTranslate,
      trayHideDistance: hideDistance,
      contextTranslate,
      trayOpacity,
      contextOpacity,
      localTrayTranslate,
      localTrayOpacity,
      trayPadding: role === 'none' ? 24 : trayPadding,
      contextReserve: role === 'none' ? 0 : contextReserve,
      headerHeight,
      trayRest: role === 'none' ? Math.max(insets.bottom, 12) : trayRest,
      localTray,
      setLocalTray,
      keepLocalTray,
      setKeepLocalTray,
      keyboardHeight,
      searchQuery,
      setSearchQuery,
      searchFrom,
      setSearchFrom,
      pushedTitle,
      setPushedTitle,
      setPushedBackHandler,
      requestPushedBack,
      setHeaderCloseHandler,
      requestHeaderClose,
      badgeCount,
      needsCount,
      messageCount,
      classId,
      className,
      schoolName,
      schoolLogoUrl,
      classes,
      studentSession,
      parentTokens,
      teacherPhotoUrl,
      refreshChrome,
      acknowledgeAlert,
      openHeaderCamera,
      headerCameraOpen,
      headerListenOpen,
      headerListening,
      setHeaderCameraOpen: setHeaderCameraOpenSafe,
      onHeaderPhoto,
      onHeaderTakePhoto,
      onHeaderVoiceOnly,
      cancelHeaderListen,
      contextTab,
      setContextTab,
      keyboardVisible,
    }),
    [
      role,
      setChromeSeat,
      canChooseSeat,
      visible,
      forceHidden,
      headerChrome,
      setHeaderChrome,
      drawerOpen,
      onScroll,
      showChrome,
      trayTranslate,
      hideDistance,
      contextTranslate,
      trayOpacity,
      contextOpacity,
      localTrayTranslate,
      localTrayOpacity,
      trayPadding,
      contextReserve,
      headerHeight,
      trayRest,
      insets.bottom,
      searchQuery,
      searchFrom,
      pushedTitle,
      setPushedBackHandler,
      requestPushedBack,
      setHeaderCloseHandler,
      requestHeaderClose,
      badgeCount,
      needsCount,
      messageCount,
      classId,
      className,
      schoolName,
      schoolLogoUrl,
      classes,
      studentSession,
      parentTokens,
      teacherPhotoUrl,
      refreshChrome,
      acknowledgeAlert,
      openHeaderCamera,
      headerCameraOpen,
      headerListenOpen,
      headerListening,
      setHeaderCameraOpenSafe,
      onHeaderTakePhoto,
      onHeaderVoiceOnly,
      cancelHeaderListen,
      onHeaderPhoto,
      contextTab,
      setContextTab,
      keyboardVisible,
      localTray,
      setLocalTray,
      keepLocalTray,
      setKeepLocalTray,
      keyboardHeight,
    ],
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useChrome(): ChromeValue {
  const value = useContext(ChromeContext);
  if (!value) throw new Error('useChrome must be used inside ChromeProvider');
  return value;
}

export function useOptionalChrome(): ChromeValue | null {
  return useContext(ChromeContext);
}

export function isChromePushed(pathname: string): boolean {
  return isPushedPath(pathname);
}

/** Homework shutter. Hidden on Messages so a group photo cannot run portrait cutout. */
export function showHeaderCapture(pathname: string, role: string): boolean {
  return role === 'teacher' && !pathname.startsWith('/messages');
}

/** Bind a header title to this screen so leaving it cannot wipe the next screen’s title. */
export function usePushedTitle(title: string | null) {
  const { setPushedTitle } = useChrome();
  const pathname = usePathname();
  useEffect(() => {
    setPushedTitle(title, pathname);
    return () => setPushedTitle(null, pathname);
  }, [setPushedTitle, title, pathname]);
}
