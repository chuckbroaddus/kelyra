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
  Easing,
  Keyboard,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { chrome } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { countNeedsYou } from '@/lib/captures/api';
import { listClasses, resolveCaptureClass } from '@/lib/classes/api';
import { transcribeAudioDirect } from '@/lib/matching/captureSpeech';
import { startLiveRecording, type LiveRecording } from '@/lib/media/recorder';
import { pickNormalizedPhoto } from '@/lib/media/pickPhoto';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import { signedProfileUrlForAssetId } from '@/lib/people/photos';
import { listParentTokens, parentBellCount, type StoredParentChild } from '@/lib/parents/session';
import { setProposalDraft } from '@/lib/proposal/session';
import { loadStudentSession, type StudentSession } from '@/lib/student-session/api';
import type { ClassRow } from '@/lib/supabase/types';
import { useLayout } from '@/lib/theme/layout';

export type ChromeRole = 'teacher' | 'student' | 'parent' | 'none';

type ChromeValue = {
  role: ChromeRole;
  visible: boolean;
  setForceHidden: (hidden: boolean) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showChrome: () => void;
  trayTranslate: Animated.Value;
  contextTranslate: Animated.Value;
  trayOpacity: Animated.Value;
  contextOpacity: Animated.Value;
  trayPadding: number;
  contextReserve: number;
  headerHeight: number;
  trayRest: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchFrom: string;
  setSearchFrom: (path: string) => void;
  pushedTitle: string | null;
  setPushedTitle: (title: string | null) => void;
  setPushedBackHandler: (handler: (() => boolean) | null) => void;
  requestPushedBack: () => boolean;
  badgeCount: number;
  classId: string | null;
  className: string | null;
  classes: ClassRow[];
  studentSession: StudentSession | null;
  parentTokens: StoredParentChild[];
  teacherPhotoUrl: string | null;
  refreshChrome: () => void;
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
};

export function defaultContextTab(pathname: string): string {
  if (pathname === '/inbox') return 'all';
  if (pathname === '/capture') return 'photo';
  if (pathname === '/todo') return 'todo';
  if (pathname.includes('/gradebook')) return 'book';
  if (/^\/class\/[^/]+$/.test(pathname)) return 'today';
  return '';
}

const ChromeContext = createContext<ChromeValue | null>(null);

function isPushedPath(pathname: string): boolean {
  return (
    pathname.includes('/student/') ||
    pathname.includes('/parent/') ||
    pathname.includes('/assignment/') ||
    pathname === '/search' ||
    pathname === '/notifications' ||
    pathname === '/proposal' ||
    pathname.endsWith('/family')
  );
}

export function ChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { teacher } = useAuth();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;

  const [forceHidden, setForceHidden] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFrom, setSearchFrom] = useState('/');
  const [pushedTitle, setPushedTitle] = useState<string | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [classId, setClassId] = useState<string | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [parentTokens, setParentTokens] = useState<StoredParentChild[]>([]);
  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string | null>(null);
  const [headerCameraOpen, setHeaderCameraOpen] = useState(false);
  const [headerListenOpen, setHeaderListenOpen] = useState(false);
  const [headerListening, setHeaderListening] = useState(false);
  const [tick, setTick] = useState(0);
  const [contextByPath, setContextByPath] = useState<Record<string, string>>({});

  const trayTranslate = useRef(new Animated.Value(0)).current;
  const contextTranslate = useRef(new Animated.Value(0)).current;
  const trayOpacity = useRef(new Animated.Value(1)).current;
  const contextOpacity = useRef(new Animated.Value(1)).current;
  const lastY = useRef(0);
  const acc = useRef(0);
  const lastDir = useRef<1 | -1 | 0>(0);
  const visibleRef = useRef(true);
  const headerVoice = useRef<LiveRecording | null>(null);
  const pushedBackHandler = useRef<(() => boolean) | null>(null);
  const setPushedBackHandler = useCallback((handler: (() => boolean) | null) => {
    pushedBackHandler.current = handler;
  }, []);
  const requestPushedBack = useCallback(() => {
    return pushedBackHandler.current ? pushedBackHandler.current() : false;
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
  const trayPadding = trayRest + 12;

  const role: ChromeRole = useMemo(() => {
    if (pathname === '/sign-in' || pathname === '/join') return 'none';
    if (pathname === '/parent' || pathname.startsWith('/parent')) {
      return parentTokens.length || pathname.includes('t=') ? 'parent' : 'none';
    }
    if (pathname === '/todo') return studentSession ? 'student' : 'none';
    if (teacher) return 'teacher';
    if (studentSession) return 'student';
    if (parentTokens.length) return 'parent';
    return 'none';
  }, [pathname, teacher, studentSession, parentTokens.length]);

  const contextReserve = useMemo(() => {
    if (role === 'none') return 0;
    if (isPushedPath(pathname)) return 0;
    if (pathname === '/ask' || pathname === '/profile') return 0;
    return contextH;
  }, [role, pathname, contextH]);

  const contextTab = contextByPath[pathname] ?? defaultContextTab(pathname);
  const setContextTab = useCallback((tab: string, path?: string) => {
    const key = path ?? pathname;
    setContextByPath((current) => (current[key] === tab ? current : { ...current, [key]: tab }));
  }, [pathname]);

  const hideDistance = trayHeight + bottomInset + 12;

  const animate = useCallback(
    (show: boolean) => {
      visibleRef.current = show;
      setVisible(show);
      Animated.parallel([
        Animated.timing(trayTranslate, {
          toValue: show ? 0 : hideDistance,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contextTranslate, {
          toValue: show ? 0 : -contextH,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(trayOpacity, {
          toValue: show ? 1 : 0.85,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contextOpacity, {
          toValue: show ? 1 : 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [contextH, contextOpacity, contextTranslate, hideDistance, trayOpacity, trayTranslate],
  );

  const showChrome = useCallback(() => animate(true), [animate]);

  useEffect(() => {
    if (forceHidden || drawerOpen || headerCameraOpen) {
      animate(false);
    } else {
      animate(true);
    }
  }, [forceHidden, drawerOpen, headerCameraOpen, animate]);

  useEffect(() => {
    let live = true;
    if (!teacher?.photo_asset_id) {
      setTeacherPhotoUrl(null);
      return;
    }
    void signedProfileUrlForAssetId(teacher.photo_asset_id).then((url) => {
      if (live) setTeacherPhotoUrl(url);
    });
    return () => {
      live = false;
    };
  }, [teacher?.photo_asset_id]);

  useEffect(() => {
    if (pathname !== '/search') return;
    const show = Keyboard.addListener('keyboardDidShow', () => animate(false));
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      if (!forceHidden && !drawerOpen) animate(true);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [pathname, animate, forceHidden, drawerOpen]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (forceHidden || drawerOpen || headerCameraOpen) return;
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
    [animate, drawerOpen, forceHidden, headerCameraOpen],
  );

  const refreshChrome = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [session, tokens] = await Promise.all([loadStudentSession(), listParentTokens()]);
      if (cancelled) return;
      setStudentSession(session);
      setParentTokens(tokens);
      if (teacher) {
        try {
          const all = await listClasses();
          if (cancelled) return;
          setClasses(all);
          const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id);
          if (cancelled) return;
          setClassId(klass.id);
          setClassName(klass.name);
          setBadgeCount(await countNeedsYou(klass.id));
        } catch {
          if (!cancelled) {
            setClassId(null);
            setClassName(null);
            setBadgeCount(0);
          }
        }
        return;
      }
      if (session) {
        const assigned = 0;
        setBadgeCount(assigned);
        return;
      }
      setBadgeCount(await parentBellCount(tokens));
    })();
    return () => {
      cancelled = true;
    };
  }, [teacher, pathname, tick]);

  useEffect(() => {
    if (!studentSession || role !== 'student') return;
    let cancelled = false;
    void (async () => {
      try {
        const { listStudentTodo } = await import('@/lib/student-session/api');
        const items = await listStudentTodo(studentSession.joinCode, studentSession.studentId);
        if (!cancelled) {
          setBadgeCount(items.filter((item) => item.status === 'assigned').length);
        }
      } catch {
        if (!cancelled) setBadgeCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentSession, role, pathname, tick]);

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
      visible,
      setForceHidden,
      drawerOpen,
      setDrawerOpen,
      onScroll,
      showChrome,
      trayTranslate,
      contextTranslate,
      trayOpacity,
      contextOpacity,
      trayPadding: role === 'none' ? 24 : trayPadding,
      contextReserve: role === 'none' ? 0 : contextReserve,
      headerHeight,
      trayRest: role === 'none' ? Math.max(insets.bottom, 12) : trayRest,
      searchQuery,
      setSearchQuery,
      searchFrom,
      setSearchFrom,
      pushedTitle,
      setPushedTitle,
      setPushedBackHandler,
      requestPushedBack,
      badgeCount,
      classId,
      className,
      classes,
      studentSession,
      parentTokens,
      teacherPhotoUrl,
      refreshChrome,
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
    }),
    [
      role,
      visible,
      drawerOpen,
      onScroll,
      showChrome,
      trayTranslate,
      contextTranslate,
      trayOpacity,
      contextOpacity,
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
      badgeCount,
      classId,
      className,
      classes,
      studentSession,
      parentTokens,
      teacherPhotoUrl,
      refreshChrome,
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
