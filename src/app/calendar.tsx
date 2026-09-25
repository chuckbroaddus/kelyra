import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { useSharedValue } from 'react-native-reanimated';

import { AgendaList } from '@/components/calendar/AgendaList';
import { DayListPane } from '@/components/calendar/DayListPane';
import { CalendarConfirm } from '@/components/calendar/CalendarConfirm';
import { CalendarsSheet } from '@/components/calendar/CalendarsSheet';
import { DayColumn } from '@/components/calendar/DayColumn';
import { EventComposer } from '@/components/calendar/EventComposer';
import { takePendingCalendarDraft, type PendingCalendarDraft } from '@/lib/calendar/askDraft';
import { EventMenu } from '@/components/calendar/EventMenu';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { PeriodPager } from '@/components/calendar/PeriodPager';
import { TeacherWeekGrid } from '@/components/calendar/TeacherWeekGrid';
import { CalendarZoomDrill } from '@/components/calendar/CalendarZoomDrill';
import { CalendarPeriodTitle } from '@/components/calendar/CalendarPeriodTitle';
import { CalendarWeekdayRow } from '@/components/calendar/CalendarWeekdayRow';
import { hasTimedInRange } from '@/lib/calendar/timeline';
import { YearGrid } from '@/components/calendar/YearGrid';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { GhostButton } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  deleteCalendarEvent,
  listCalendarItems,
  listCalendars,
  unsubscribeTeam,
} from '@/lib/calendar/api';
import {
  calendarSessionKey,
  loadCalendarSession,
  saveCalendarSession,
} from '@/lib/calendar/calendarSession';
import {
  CAL_P6_3A_HIERARCHY,
  CAL_P6_5C_LIST_ANCHOR,
  CAL_P6_8A_PIN_DRUM,
  CAL_P6_9A_STACK_RESTORE,
  CAL_P6_10B_SLOT_CREATE,
} from '@/lib/calendar/p6Laws';
import {
  periodKindForView,
  showsPeriodPager,
} from '@/lib/calendar/periodPager';
import { canCreateOnSeat } from '@/lib/calendar/eventActions';
import {
  areFiltersNarrowed,
  categoriesForChips,
  clearFilters,
  toggleChip,
  toggleLayerEnabled,
} from '@/lib/calendar/filters';
import {
  agendaRangeFrom,
  dayRangeContaining,
  dayRpcBounds,
  shiftDay,
} from '@/lib/calendar/day';
import { monthContaining, shiftMonth } from '@/lib/calendar/month';
import { monthYearTitleParts } from '@/lib/calendar/periodTitle';
import {
  multidayRangeContaining,
  multidayTodayAnchor,
  shiftMultiday,
  type MultidayCount,
} from '@/lib/calendar/multiday';
import {
  CAL_PREFS_VERSION,
  resolveCategoryChipIds,
  resolveEnabledCalendarIds,
} from '@/lib/calendar/prefs';
import { loadCalPrefs, saveCalPrefs } from '@/lib/calendar/prefsStorage';
import { calendarSeatForChrome } from '@/lib/calendar/seat';
import { slotCreateDraft } from '@/lib/calendar/slotCreate';
import type { CalendarItem, CalendarLayer } from '@/lib/calendar/types';
import {
  CAL_VIEW_PREFS_VERSION,
  type CalendarViewId,
  type DayMode,
  type MonthMode,
  canZoomUp,
  defaultViewFor,
  loadCalViewPrefs,
  saveCalViewPrefs,
  zoomParentView,
} from '@/lib/calendar/viewPrefs';
import { ViewCustomizeSheet } from '@/components/calendar/ViewCustomizeSheet';
import { IconButton } from '@/components/ui/IconButton';
import {
  dayNumber,
  shiftWeek,
  weekdayShort,
  weekRangeContaining,
  weekRpcBounds,
} from '@/lib/calendar/week';
import { yearContaining, yearRpcBounds } from '@/lib/calendar/year';
import {
  isValidZoomRect,
  reverseDrillKind,
  type ZoomDrillCacheEntry,
  type ZoomDrillKind,
  type ZoomDrillRequest,
  type ZoomSourceRect,
} from '@/lib/calendar/zoomDrill';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { listParentLinkedChildren } from '@/lib/diary/api';
import { firstName } from '@/lib/format';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

void CAL_P6_3A_HIERARCHY;
void CAL_P6_5C_LIST_ANCHOR;
void CAL_P6_8A_PIN_DRUM;
void CAL_P6_9A_STACK_RESTORE;
void CAL_P6_10B_SLOT_CREATE;

function touchDistance(e: GestureResponderEvent): number {
  const touches = e.nativeEvent.touches;
  if (!touches || touches.length < 2) return 0;
  const a = touches[0]!;
  const b = touches[1]!;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/**
 * Calendar chrome: `<` climbs Day→Week→Month→Year; Today jumps to today in-view;
 * + · search · gear on the right. Modes / Show / Calendars under gear. No Y/M/W/D tabs.
 */
export default function CalendarScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const layout = useLayout();
  const router = useRouter();
  const { profile } = useAuth();
  const reduceMotion = useReducedMotion();
  usePushedTitle('Calendar');

  const seat = calendarSeatForChrome(chrome.role);
  const isPhone = layout.isPhone;
  const deviceClass = isPhone ? 'phone' : 'web';
  const showHiddenBadge = seat === 'teacher';
  const profileId = profile?.id ?? null;

  const [activeView, setActiveView] = useState<CalendarViewId>(() =>
    defaultViewFor(isPhone ? 'phone' : 'web', seat ?? 'teacher'),
  );
  const [viewPrefsReady, setViewPrefsReady] = useState(false);
  const [dayCount, setDayCount] = useState<MultidayCount>(5);
  // Today ISO — week Sunday via weekRangeContaining; 3 = Tue–Thu; 5 = Mon–Fri (CAL-R5-04).
  const [gridAnchor, setGridAnchor] = useState(() => multidayTodayAnchor());
  const [dayAnchor, setDayAnchor] = useState(() => dayRangeContaining().day);
  /** Day List: bump to scroll the list to dayAnchor (drum snap / Today). */
  const [dayListJump, setDayListJump] = useState(0);
  /** Day List: bump when load() runs so the list refetches its rolling range. */
  const [dayListReloadKey, setDayListReloadKey] = useState(0);
  const [agendaAnchor, setAgendaAnchor] = useState(() => dayRangeContaining().day);
  const [monthAnchor, setMonthAnchor] = useState(() => dayRangeContaining().day);
  const [yearAnchor, setYearAnchor] = useState(() => yearContaining());
  /** Today→Year: scroll YearGrid to today’s month row (nonce re-fires same month). */
  const [yearTodayFocus, setYearTodayFocus] = useState<{ monthIndex0: number; nonce: number } | null>(
    null,
  );
  const yearHostYRef = useRef(0);
  const yearFocusNonceRef = useRef(0);
  const bodyHostRef = useRef<View>(null);
  const drillThenRef = useRef<(() => void) | null>(null);
  /** Per-kind inbound source so climb can reverse-morph to the tapped cell. */
  const lastDrillByKindRef = useRef<Partial<Record<ZoomDrillKind, ZoomDrillCacheEntry>>>({});
  const [zoomDrill, setZoomDrill] = useState<ZoomDrillRequest | null>(null);
  /** Shared with CalendarZoomDrill + MonthGrid/TeacherWeekGrid sibling fades. */
  const drillProgress = useSharedValue(0);
  const [monthSelectedDay, setMonthSelectedDay] = useState<string | null>(null);
  /** Year→Month: MonthGrid chrome fade-in after swap (kills end snap). */
  const [monthEnterChrome, setMonthEnterChrome] = useState(false);
  /**
   * Week→Day: tapped day for the sticky title morph while the drill runs
   * ("February 2026" → "February 4, 2026, Wednesday"). Month→Week has no title
   * fade/remount — the sticky CalendarPeriodTitle string is continuous.
   */
  const [morphDayIso, setMorphDayIso] = useState<string | null>(null);
  /** Week→Day: DayColumn timeslot enter / reverse exit. */
  const [dayEnterAnim, setDayEnterAnim] = useState(false);
  const [dayExitAnim, setDayExitAnim] = useState(false);
  const pendingZoomUpRef = useRef<(() => void) | null>(null);

  const [monthMode, setMonthMode] = useState<MonthMode>('compact');
  const [dayMode, setDayMode] = useState<DayMode>('single');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  /** In-route zoom stack for Year→Month→Day (platform back / Up chrome). */
  const [zoomStack, setZoomStack] = useState<CalendarViewId[]>([]);
  /** Apply stored view once per prefs key — never snap zoomTo(month) back to Year. */
  const viewPrefsHydratedKeyRef = useRef<string | null>(null);
  /** CAL-P6-8A: body scroller (Day/Month List own their scrollers). */
  const screenScrollRef = useRef<ScrollView>(null);
  const hierarchyPinchRef = useRef({ startDist: 0, armed: false, fired: false });

  const [children, setChildren] = useState<Array<{ id: string; display_name: string }>>([]);
  const [focusedChildId, setFocusedChildId] = useState<string | null>(null);
  const [childrenLoaded, setChildrenLoaded] = useState(false);

  const [layers, setLayers] = useState<CalendarLayer[]>([]);
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [chipIds, setChipIds] = useState<string[]>(() => resolveCategoryChipIds(null));
  const [prefsReady, setPrefsReady] = useState(false);
  const [calendarsOpen, setCalendarsOpen] = useState(false);

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [composer, setComposer] = useState<{
    mode: 'create' | 'edit' | 'view';
    eventId?: string | null;
    initialDraft?: PendingCalendarDraft | null;
  } | null>(null);
  const [askDraft, setAskDraft] = useState<PendingCalendarDraft | null>(null);
  const [menuItem, setMenuItem] = useState<CalendarItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CalendarItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const weekRange = useMemo(() => weekRangeContaining(gridAnchor), [gridAnchor]);
  const weekMonth = useMemo(() => monthContaining(gridAnchor), [gridAnchor]);
  const weekMonthTitle = useMemo(() => monthContaining(gridAnchor).label, [gridAnchor]);
  const multiRange = useMemo(
    () => multidayRangeContaining(dayCount === 7 ? 5 : dayCount, gridAnchor),
    [dayCount, gridAnchor],
  );
  const dayRange = useMemo(() => dayRangeContaining(dayAnchor), [dayAnchor]);
  const agendaRange = useMemo(() => agendaRangeFrom(agendaAnchor, 14), [agendaAnchor]);
  const monthRange = useMemo(() => monthContaining(monthAnchor), [monthAnchor]);
  const year = yearAnchor;
  const monthListMode = activeView === 'month' && monthMode === 'list';
  /** Day List — Month List twin: own scroller + soft day edge (CEO 2026-09-24). */
  const dayListMode = activeView === 'day' && dayMode === 'list';
  /**
   * Day List keeps dayAnchor = pinned header day (drum center) on every scroll, so the
   * screen fetch must not key on it there; the list fetches its own rolling range.
   */
  const dayFetchKey = dayListMode ? 'day-list' : `${dayRange.fromIso}|${dayRange.toIso}`;

  // Phase E: Ask calendar_draft_event parks CR-A draft — open Review on Calendar.
  useEffect(() => {
    if (!profileId || !seat) return;
    let cancelled = false;
    void (async () => {
      const pending = await takePendingCalendarDraft(profileId);
      if (cancelled || !pending) return;
      setAskDraft(pending);
      if (pending.childStudentId) setFocusedChildId(pending.childStudentId);
      setComposer({ mode: 'create', initialDraft: pending });
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, seat]);

  useEffect(() => {
    if (seat !== 'parent') {
      setChildren([]);
      setFocusedChildId(null);
      setChildrenLoaded(true);
      return;
    }
    let cancelled = false;
    setChildrenLoaded(false);
    void (async () => {
      try {
        const kids = await listParentLinkedChildren();
        if (cancelled) return;
        setChildren(kids);
        setFocusedChildId((prev) => {
          if (prev && kids.some((k) => k.id === prev)) return prev;
          return kids.length === 1 ? kids[0]!.id : null;
        });
      } catch {
        if (!cancelled) {
          setChildren([]);
          setFocusedChildId(null);
        }
      } finally {
        if (!cancelled) setChildrenLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seat]);

  const parentNeedsChild = seat === 'parent' && children.length >= 2;
  const parentChildMissing = parentNeedsChild && !focusedChildId;
  const parentChildId =
    seat === 'parent'
      ? focusedChildId ?? (children.length === 1 ? children[0]!.id : null)
      : null;

  // Last view + multiday days per seat + device class (CAL-36 / viewPrefs).
  // Hydrate once per prefs key so an in-flight reload cannot snap activeView back to Year
  // after zoomTo('month'), and so viewPrefsReady flicker does not leave loaded=false.
  useEffect(() => {
    if (!seat || !profileId) {
      viewPrefsHydratedKeyRef.current = null;
      setViewPrefsReady(true);
      return;
    }
    if (seat === 'parent' && !childrenLoaded) {
      setViewPrefsReady(false);
      return;
    }
    const prefsKey = `${profileId}:${seat}:${deviceClass}:${seat === 'parent' ? parentChildId ?? 'none' : 'none'}`;
    const freshKey = viewPrefsHydratedKeyRef.current !== prefsKey;
    let cancelled = false;
    // Only blank ready on a new prefs key (cold start / child switch) — not on every re-entry.
    if (freshKey) setViewPrefsReady(false);
    void (async () => {
      const prefs = await loadCalViewPrefs(
        profileId,
        seat,
        deviceClass,
        seat === 'parent' ? parentChildId : null,
      );
      if (cancelled) return;
      if (viewPrefsHydratedKeyRef.current !== prefsKey) {
        setActiveView(prefs.view);
        setDayCount(prefs.days);
        setMonthMode(prefs.monthMode);
        setDayMode(prefs.dayMode);
        setZoomStack([]);
        // CAL-P6-9A: remount / forward restore rehydrates anchors when session matches view.
        const session = loadCalendarSession(
          calendarSessionKey(profileId, seat, seat === 'parent' ? parentChildId : null),
        );
        if (session) {
          setDayAnchor(session.dayAnchor);
          setGridAnchor(session.gridAnchor);
          setMonthAnchor(session.monthAnchor);
          setYearAnchor(session.yearAnchor);
          setAgendaAnchor(session.agendaAnchor);
          setMonthSelectedDay(session.monthSelectedDay);
          if (session.activeView === prefs.view) {
            setZoomStack(session.zoomStack);
            setDayCount(session.dayCount);
            setMonthMode(session.monthMode);
            setDayMode(session.dayMode);
          }
        }
        viewPrefsHydratedKeyRef.current = prefsKey;
      }
      setViewPrefsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [seat, profileId, deviceClass, parentChildId, childrenLoaded]);

  const persistViewPrefs = useCallback(
    (
      view: CalendarViewId,
      days: MultidayCount,
      nextMonthMode: MonthMode = monthMode,
      nextDayMode: DayMode = dayMode,
    ) => {
      if (!profileId || !seat) return;
      void saveCalViewPrefs(
        profileId,
        seat,
        deviceClass,
        seat === 'parent' ? parentChildId : null,
        {
          version: CAL_VIEW_PREFS_VERSION,
          view,
          days,
          monthMode: nextMonthMode,
          dayMode: nextDayMode,
        },
      );
    },
    [profileId, seat, deviceClass, parentChildId, monthMode, dayMode],
  );

  const selectView = useCallback(
    (view: CalendarViewId, opts?: { fromZoom?: boolean }) => {
      if (!opts?.fromZoom) setZoomStack([]);
      setActiveView(view);
      const nextDays = view === 'week' ? 7 : view === 'multiday' ? (dayCount === 7 ? 5 : dayCount) : dayCount;
      if (view === 'week') setDayCount(7);
      else if (view === 'multiday') {
        if (dayCount === 7) setDayCount(5);
        // 3 centers on today; 5 = Mon–Fri containing today — keep today visible.
        setGridAnchor(multidayTodayAnchor());
      }
      persistViewPrefs(view, view === 'week' ? 7 : nextDays);
    },
    [dayCount, persistViewPrefs],
  );

  const zoomTo = useCallback(
    (view: CalendarViewId) => {
      setZoomStack((stack) => [...stack, activeView]);
      selectView(view, { fromZoom: true });
    },
    [activeView, selectView],
  );

  const startZoomDrill = useCallback(
    (opts: {
      kind: ZoomDrillKind;
      source: ZoomSourceRect;
      label: string;
      then: () => void;
      focusIndex?: number;
    }) => {
      const { kind, source, label, then, focusIndex } = opts;
      if (reduceMotion || !isValidZoomRect(source)) {
        then();
        return;
      }
      const node = bodyHostRef.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        then();
        return;
      }
      node.measureInWindow((x, y, width, height) => {
        const dest = { x, y, width, height };
        if (!isValidZoomRect(dest)) {
          then();
          return;
        }
        // Host = body; live transform anchors on tapped source relative to host.
        const host = dest;
        lastDrillByKindRef.current[kind] = { kind, source, dest, host, label, focusIndex };
        drillThenRef.current = then;
        setZoomDrill({
          kind,
          direction: 'in',
          source,
          label,
          dest,
          host,
          focusIndex,
        });
      });
    },
    [reduceMotion],
  );

  const onZoomDrillFinished = useCallback(() => {
    const then = drillThenRef.current;
    drillThenRef.current = null;
    setZoomDrill(null);
    then?.();
  }, []);

  const applyZoomUp = useCallback(() => {
    const parent = zoomStack.length > 0 ? zoomStack[zoomStack.length - 1]! : zoomParentView(activeView);
    if (!parent) return false;
    setZoomStack((stack) => (stack.length ? stack.slice(0, -1) : []));
    setActiveView(parent);
    const nextDays = parent === 'week' ? 7 : dayCount;
    if (parent === 'week') setDayCount(7);
    persistViewPrefs(parent, nextDays);
    return true;
  }, [zoomStack, activeView, dayCount, persistViewPrefs]);

  const continueZoomUpOut = useCallback(
    (kind: NonNullable<ReturnType<typeof reverseDrillKind>>, cached: NonNullable<
      (typeof lastDrillByKindRef.current)[ZoomDrillKind]
    >) => {
      // Apple pattern: switch to parent immediately at expanded transform, spring to identity.
      drillThenRef.current = null;
      applyZoomUp();
      setZoomDrill({
        kind,
        direction: 'out',
        source: cached.source,
        label: cached.label,
        dest: cached.dest,
        host: cached.host,
        focusIndex: cached.focusIndex,
      });
    },
    [applyZoomUp],
  );

  const onDayExitDone = useCallback(() => {
    setDayExitAnim(false);
    const cont = pendingZoomUpRef.current;
    pendingZoomUpRef.current = null;
    cont?.();
  }, []);

  const zoomUp = useCallback(() => {
    const parent = zoomStack.length > 0 ? zoomStack[zoomStack.length - 1]! : zoomParentView(activeView);
    if (!parent) return false;

    const kind = reverseDrillKind(activeView);
    const cached = kind ? lastDrillByKindRef.current[kind] : undefined;
    if (reduceMotion || zoomDrill || !kind || !cached || !isValidZoomRect(cached.source)) {
      return applyZoomUp();
    }
    if (!isValidZoomRect(cached.host) || !isValidZoomRect(cached.dest)) {
      return applyZoomUp();
    }

    // Week←Day: fade timeslots out before reverse transform so hours don't snap away.
    if (kind === 'week-day' && activeView === 'day' && !dayExitAnim) {
      pendingZoomUpRef.current = () => continueZoomUpOut(kind, cached);
      setDayExitAnim(true);
      setDayEnterAnim(false);
      return true;
    }

    continueZoomUpOut(kind, cached);
    return true;
  }, [
    zoomStack,
    activeView,
    reduceMotion,
    zoomDrill,
    applyZoomUp,
    continueZoomUpOut,
    dayExitAnim,
  ]);

  const canClimb = canZoomUp(activeView) || zoomStack.length > 0;

  // Clear one-shot enter flags once the destination view is left.
  useEffect(() => {
    if (activeView !== 'month') setMonthEnterChrome(false);
    if (activeView !== 'day') {
      setDayEnterAnim(false);
      if (!dayExitAnim) setDayExitAnim(false);
    }
  }, [activeView, dayExitAnim]);

  // CAL-P6-9A: persist surface anchors for stack-honest forward restore.
  useEffect(() => {
    if (!profileId || !seat || !viewPrefsReady) return;
    saveCalendarSession(calendarSessionKey(profileId, seat, parentChildId), {
      activeView,
      dayMode,
      monthMode,
      dayCount,
      dayAnchor,
      gridAnchor,
      monthAnchor,
      yearAnchor,
      agendaAnchor,
      monthSelectedDay,
      zoomStack,
    });
  }, [
    profileId,
    seat,
    parentChildId,
    viewPrefsReady,
    activeView,
    dayMode,
    monthMode,
    dayCount,
    dayAnchor,
    gridAnchor,
    monthAnchor,
    yearAnchor,
    agendaAnchor,
    monthSelectedDay,
    zoomStack,
  ]);

  // Platform / chrome back pops Year←Month←Day hierarchy before leaving Calendar.
  useEffect(() => {
    if (!canClimb) {
      chrome.setPushedBackHandler?.(null);
      return;
    }
    chrome.setPushedBackHandler?.(() => zoomUp());
    return () => {
      chrome.setPushedBackHandler?.(null);
    };
  }, [chrome, canClimb, zoomUp]);

  // CAL-P6-3A: phone pinch-out on chrome climb zone (not multi-day body pinch).
  const hierarchyPinch = useMemo(() => {
    if (!isPhone || reduceMotion || !canClimb) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: (e) => (e.nativeEvent.touches?.length ?? 0) >= 2,
      onMoveShouldSetPanResponder: (e) => (e.nativeEvent.touches?.length ?? 0) >= 2,
      onPanResponderGrant: (e) => {
        const dist = touchDistance(e);
        hierarchyPinchRef.current = { startDist: dist, armed: dist > 0, fired: false };
      },
      onPanResponderMove: (e) => {
        if (!hierarchyPinchRef.current.armed || hierarchyPinchRef.current.fired) return;
        const dist = touchDistance(e);
        if (!(hierarchyPinchRef.current.startDist > 0) || !(dist > 0)) return;
        const scale = dist / hierarchyPinchRef.current.startDist;
        if (scale > 1.25) {
          hierarchyPinchRef.current.fired = true;
          zoomUp();
        }
      },
      onPanResponderRelease: () => {
        hierarchyPinchRef.current = { startDist: 0, armed: false, fired: false };
      },
      onPanResponderTerminate: () => {
        hierarchyPinchRef.current = { startDist: 0, armed: false, fired: false };
      },
    });
  }, [canClimb, isPhone, reduceMotion, zoomUp]);

  const applyDayListDrumShift = useCallback(
    (steps: number) => {
      // CAL-P6-5C: drum snap moves dayAnchor; the list scrolls to that day's header.
      setDayAnchor((prev) => shiftDay(prev, steps));
      setDayListJump((n) => n + 1);
    },
    [],
  );

  /** Pinned sticky header day while scrolling the list → drum center (CEO 2026-09-24 v2). */
  const onDayListTopDay = useCallback((day: string) => {
    setDayAnchor(day);
  }, []);

  const onChangeDayCount = useCallback(
    (count: MultidayCount) => {
      if (count === 7) {
        setDayCount(7);
        setActiveView('week');
        persistViewPrefs('week', 7);
        return;
      }
      const today = multidayTodayAnchor();
      // If the visible week/range includes today, keep today as anchor (3→Tue–Thu / 5→Mon–Fri of that week).
      const visible = activeView === 'week' ? weekRange.days : multiRange.days;
      setGridAnchor(visible.includes(today) ? today : multiRange.fromIso);
      setDayCount(count);
      setActiveView('multiday');
      persistViewPrefs('multiday', count);
    },
    [persistViewPrefs, activeView, weekRange.days, multiRange.days, multiRange.fromIso],
  );

  // Load layers + prefs (per profile · seat · focused child). Sport off until enabled.
  useEffect(() => {
    if (!seat || !profileId) {
      setLayers([]);
      setEnabledIds([]);
      setChipIds(resolveCategoryChipIds(null));
      setPrefsReady(true);
      return;
    }
    if (seat === 'parent' && !childrenLoaded) {
      setPrefsReady(false);
      return;
    }
    if (seat === 'parent' && parentChildMissing) {
      setLayers([]);
      setEnabledIds([]);
      setChipIds(resolveCategoryChipIds(null));
      setPrefsReady(true);
      return;
    }

    let cancelled = false;
    setPrefsReady(false);
    void (async () => {
      try {
        const [layerRows, prefs] = await Promise.all([
          listCalendars({
            seat,
            childStudentId: seat === 'parent' ? parentChildId : null,
          }),
          loadCalPrefs(profileId, seat, seat === 'parent' ? parentChildId : null),
        ]);
        if (cancelled) return;
        setLayers(layerRows);
        setEnabledIds(resolveEnabledCalendarIds(prefs, layerRows));
        setChipIds(resolveCategoryChipIds(prefs));
      } catch {
        if (!cancelled) {
          setLayers([]);
          setEnabledIds([]);
          setChipIds(resolveCategoryChipIds(null));
        }
      } finally {
        if (!cancelled) setPrefsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seat, profileId, parentChildId, parentChildMissing, childrenLoaded]);

  const persistPrefs = useCallback(
    async (nextEnabled: string[], nextChips: string[]) => {
      if (!profileId || !seat) return;
      await saveCalPrefs(profileId, seat, seat === 'parent' ? parentChildId : null, {
        version: CAL_PREFS_VERSION,
        enabledCalendarIds: nextEnabled,
        categoryChipIds: nextChips,
      });
    },
    [profileId, seat, parentChildId],
  );

  const onToggleChip = (chipId: string) => {
    const next = toggleChip(chipIds, chipId);
    setChipIds(next);
    void persistPrefs(enabledIds, next);
  };

  const onToggleLayer = (layerId: string) => {
    const next = toggleLayerEnabled(enabledIds, layerId);
    setEnabledIds(next);
    void persistPrefs(next, chipIds);
  };

  /** CAL-R5-08 Clear Filters — none selected (not reset-to-defaults multi-select). */
  const onClearFilters = () => {
    const next = clearFilters(layers);
    const nextEnabled = next.enabledCalendarIds ?? [];
    const nextChips = next.categoryChipIds ?? [];
    setEnabledIds(nextEnabled);
    setChipIds(nextChips);
    void persistPrefs(nextEnabled, nextChips);
  };

  const categoryFilter = useMemo(() => categoriesForChips(chipIds), [chipIds]);

  const load = useCallback(async () => {
    if (!seat) {
      setItems([]);
      setLoaded(true);
      return;
    }
    if (seat === 'parent' && childrenLoaded && parentChildMissing) {
      setItems([]);
      setError(null);
      setLoaded(true);
      return;
    }
    if (seat === 'parent' && !childrenLoaded) {
      setLoaded(false);
      return;
    }
    if (!prefsReady || !viewPrefsReady) {
      // Keep prior paint — clearing loaded here blanks MonthGrid after Year→Month zoom.
      return;
    }
    if (activeView === 'day' && dayMode === 'list') {
      // Day List fetches its own rolling range (fetchDayListRange); signal a refresh.
      setError(null);
      setDayListReloadKey((k) => k + 1);
      setLoaded(true);
      return;
    }

    setError(null);
    try {
      let from: string;
      let to: string;
      if (activeView === 'week') {
        const bounds = weekRpcBounds(weekRange.fromIso, weekRange.toIso);
        from = bounds.from;
        to = bounds.to;
      } else if (activeView === 'multiday') {
        const bounds = dayRpcBounds(multiRange.fromIso, multiRange.toIso);
        from = bounds.from;
        to = bounds.to;
      } else if (activeView === 'day') {
        const bounds = dayRpcBounds(dayRange.fromIso, dayRange.toIso);
        from = bounds.from;
        to = bounds.to;
      } else if (activeView === 'month') {
        const bounds = dayRpcBounds(monthRange.fromIso, monthRange.toIso);
        from = bounds.from;
        to = bounds.to;
      } else if (activeView === 'year') {
        const yb = yearRpcBounds(year);
        const bounds = dayRpcBounds(yb.fromIso, yb.toIso);
        from = bounds.from;
        to = bounds.to;
      } else {
        const bounds = dayRpcBounds(agendaRange.fromIso, agendaRange.toIso);
        from = bounds.from;
        to = bounds.to;
      }

      // UX filters only — server still enforces hat walls (filters ≠ security).
      const rows = await listCalendarItems({
        from,
        to,
        seat,
        classId: seat === 'teacher' ? chrome.classId : null,
        childStudentId: seat === 'parent' ? parentChildId : null,
        categories: categoryFilter,
        calendarIds: enabledIds.length ? enabledIds : null,
      });
      setItems(rows);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Could not load calendar');
    } finally {
      setLoaded(true);
    }
  }, [
    seat,
    activeView,
    dayMode,
    weekRange.fromIso,
    weekRange.toIso,
    multiRange.fromIso,
    multiRange.toIso,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dayRange via dayFetchKey (not in Day List)
    dayFetchKey,
    agendaRange.fromIso,
    agendaRange.toIso,
    monthRange.fromIso,
    monthRange.toIso,
    year,
    chrome.classId,
    parentChildId,
    parentChildMissing,
    childrenLoaded,
    prefsReady,
    viewPrefsReady,
    categoryFilter,
    enabledIds,
  ]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Day List rolling fetch — same seat walls + UX filters as load(). */
  const fetchDayListRange = useCallback(
    async (fromIso: string, toIso: string): Promise<CalendarItem[]> => {
      if (!seat) return [];
      const bounds = dayRpcBounds(fromIso, toIso);
      return listCalendarItems({
        from: bounds.from,
        to: bounds.to,
        seat,
        classId: seat === 'teacher' ? chrome.classId : null,
        childStudentId: seat === 'parent' ? parentChildId : null,
        categories: categoryFilter,
        calendarIds: enabledIds.length ? enabledIds : null,
      });
    },
    [seat, chrome.classId, parentChildId, categoryFilter, enabledIds],
  );

  const openItem = (item: CalendarItem) => {
    if (item.source === 'assignment') {
      if (item.deepLink) router.push(item.deepLink as never);
      return;
    }
    setMenuItem(item);
  };

  const canCreate = canCreateOnSeat(seat);

  const confirmDelete = async () => {
    if (!deleteItem || !seat) return;
    setDeleteBusy(true);
    try {
      await deleteCalendarEvent({ seat, id: deleteItem.id });
      setDeleteItem(null);
      setMenuItem(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
      setDeleteItem(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleUnsubscribe = async (layer: CalendarLayer) => {
    if (!seat) return;
    await unsubscribeTeam({
      seat,
      calendarId: layer.id,
      childStudentId: seat === 'parent' ? parentChildId : null,
    });
    const nextLayers = layers.filter((l) => l.id !== layer.id);
    setLayers(nextLayers);
    const nextEnabled = enabledIds.filter((id) => id !== layer.id);
    setEnabledIds(nextEnabled);
    void persistPrefs(nextEnabled, chipIds);
    await load();
  };

  const jumpToday = () => {
    const today = dayRangeContaining().day;
    if (activeView === 'week') {
      setGridAnchor(weekRangeContaining(today).fromIso);
    } else if (activeView === 'multiday') {
      // 3 = Tue–Thu of today's week; 5 = Mon–Fri containing today — not week Sunday.
      setGridAnchor(multidayTodayAnchor(today));
    } else if (activeView === 'day') {
      setDayAnchor(today);
      if (dayMode === 'list') setDayListJump((n) => n + 1);

    } else if (activeView === 'agenda') {
      setAgendaAnchor(today);
    } else if (activeView === 'month') {
      setMonthAnchor(today);
      setMonthSelectedDay(today);
    } else if (activeView === 'year') {
      setYearAnchor(yearContaining(today));
      // Scroll Year body to today’s month (e.g. September when Jan–Apr were on screen).
      const monthIndex0 = Math.max(0, Math.min(11, Number(today.slice(5, 7)) - 1));
      yearFocusNonceRef.current += 1;
      setYearTodayFocus({ monthIndex0, nonce: yearFocusNonceRef.current });
    }
  };

  // Defaults keep Sport off — that is NOT narrowed (empty month still mounts MonthGrid).
  const filtersNarrowed = areFiltersNarrowed(chipIds, enabledIds, layers);
  const filteredEmpty =
    loaded && !error && !parentChildMissing && items.length === 0 && filtersNarrowed;
  const naturallyEmpty =
    loaded &&
    !error &&
    !parentChildMissing &&
    items.length === 0 &&
    !filtersNarrowed &&
    activeView === 'agenda';

  /** Search scopes to seat-visible loaded items only (server already hat-walled). */
  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.title.toLowerCase().includes(q));
  }, [items, searchQuery]);


  const gridDays =
    activeView === 'week' ? weekRange.days : activeView === 'multiday' ? multiRange.days : [];
  const allowPinch = !reduceMotion && activeView === 'week';
  const stepperCount: MultidayCount =
    activeView === 'week' ? 7 : dayCount === 7 ? 5 : dayCount;

  if (!seat) {
    return (
      <Screen pageChromeHosted>
        <Text style={[styles.empty, { color: colors.mute }]}>Sign in to view Calendar.</Text>
      </Screen>
    );
  }

  const collapsingChrome = (
    <>
      {parentNeedsChild ? (
        <View style={styles.childBlock}>
          <Text style={[styles.childLabel, { color: colors.mute }]}>Child</Text>
          <ChipRow>
            {children.map((child) => (
              <Chip
                key={child.id}
                label={firstName(child.display_name)}
                selected={focusedChildId === child.id}
                onPress={() => {
                  setFocusedChildId(child.id);
                  setLoaded(false);
                  setPrefsReady(false);
                  setViewPrefsReady(false);
                  viewPrefsHydratedKeyRef.current = null;
                }}
              />
            ))}
          </ChipRow>
        </View>
      ) : null}

    </>
  );

  // CEO 2026-09-24: nav row (`<` Today · + search gear) is PINNED — never scrolls or
  // collapses with the body; only sub-menus (composer / customize sheet) cover it.
  const pinnedChrome = (
    <>
      {/* `<` + Today ····· + · search · gear (CEO 2026-09-24 — no Y/M/W/D tabs). */}
      <View style={styles.navRow}>
        <View style={styles.navLeading}>
          {canClimb ? (
            <GhostButton
              label="<"
              accessibilityLabel="Zoom up one level"
              onPress={() => {
                zoomUp();
              }}
            />
          ) : null}
          <GhostButton label="Today" accessibilityLabel="Jump to today" onPress={jumpToday} />
        </View>
        <View style={styles.chromeCluster}>
          {canCreate ? (
            <IconButton
              name="plus"
              label="Add event"
              onPress={() => setComposer({ mode: 'create' })}
            />
          ) : null}
          <IconButton
            name="search"
            label={searchOpen ? 'Close search' : 'Search calendar'}
            onPress={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setSearchQuery('');
            }}
          />
          <IconButton
            name="settings"
            label="Customize views"
            onPress={() => setCustomizeOpen(true)}
          />
        </View>
      </View>

      {searchOpen ? (
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search seat-visible items"
          placeholderTextColor={colors.mute}
          style={[
            styles.searchInput,
            { color: colors.ink, borderColor: colors.line, backgroundColor: colors.elevated },
          ]}
          accessibilityLabel="Search seat-visible calendar items"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      ) : null}
    <View {...(hierarchyPinch?.panHandlers ?? {})}>
      {canCreate && seat === 'parent' && parentChildMissing ? (
        <Text style={[styles.hint, { color: colors.mute, marginTop: 8 }]}>
          Pick a child to add an absence for that child only.
        </Text>
      ) : null}

      {/* CAL-P6-8A: period drum pinned while nav row collapses with tray. */}
      {showsPeriodPager(activeView, dayMode) && periodKindForView(activeView) ? (
        <PeriodPager
          kind={periodKindForView(activeView)!}
          anchor={
            activeView === 'year'
              ? String(year)
              : activeView === 'month'
                ? monthAnchor
                : activeView === 'week'
                  ? weekRange.fromIso
                  : activeView === 'multiday'
                    ? gridAnchor
                    : activeView === 'day'
                      ? dayRange.day
                      : agendaRange.fromIso
          }
          dayCount={stepperCount}
          onJumpToday={jumpToday}
          accessibilityPrevLabel={activeView === 'agenda' ? 'Earlier' : 'Previous'}
          accessibilityNextLabel={activeView === 'agenda' ? 'Later' : 'Next'}
          onShift={(steps) => {
            if (!steps) return;
            if (activeView === 'year') {
              setYearAnchor(year + steps);
              return;
            }
            if (activeView === 'month') {
              setMonthAnchor(shiftMonth(monthRange.fromIso, steps));
              setMonthSelectedDay(null);
              return;
            }
            if (activeView === 'week') {
              setGridAnchor(shiftWeek(weekRange.fromIso, steps));
              return;
            }
            if (activeView === 'multiday') {
              let next = gridAnchor;
              const dir: -1 | 1 = steps > 0 ? 1 : -1;
              for (let i = 0; i < Math.abs(steps); i += 1) {
                next = shiftMultiday(next, stepperCount, dir);
              }
              setGridAnchor(next);
              return;
            }
            if (activeView === 'day') {
              // CAL-P6-5C: drum snap writes listAnchorDay; list projects (stable window).
              if (dayMode === 'list') {
                applyDayListDrumShift(steps);
                return;
              }
              setDayAnchor(shiftDay(dayRange.day, steps));
              return;
            }
            if (activeView === 'agenda') {
              setAgendaAnchor(shiftDay(agendaRange.fromIso, steps * 7));
            }
          }}
        />
      ) : null}
    </View>
    </>
  );

  // CAL-R5-12: pageChromeHosted drops Screen pad+contextReserve band so Y/M/W/D sit tight under header.
  // CAL-P6-8A: nav row collapses with tray; drum stays in pin band.
  // CAL-P6-6B: Month List owns a flex-bounded scroller — disable page scroll so soft-edge can fire.

  const zoomDrillKind = zoomDrill?.kind ?? null;
  const zoomDrillFocus = zoomDrill?.focusIndex ?? null;

  const renderCalendarBody = () =>
(loaded || activeView === 'month' || activeView === 'year' || activeView === 'day') &&
      !error &&
      !parentChildMissing ? (
        activeView === 'week' || activeView === 'multiday' ? (
          <TeacherWeekGrid
            days={gridDays}
            items={visibleItems}
            showHiddenBadge={showHiddenBadge}
            onPressItem={openItem}
            monthTitle={weekMonthTitle}
            hideTitle
            hideWeekdayLabels={activeView === 'week'}
            onPressDay={(iso, source, focusIndex) => {
              // Sticky title morphs to the tapped day alongside the drill.
              setMorphDayIso(iso);
              startZoomDrill({
                kind: 'week-day',
                source: source ?? { x: 0, y: 0, width: 0, height: 0 },
                label: `${weekdayShort(iso)} ${dayNumber(iso)}`,
                focusIndex,
                then: () => {
                  setDayAnchor(iso);
                  setDayEnterAnim(!reduceMotion);
                  setDayExitAnim(false);
                  zoomTo('day');
                },
              });
            }}
            dayCount={stepperCount}
            onChangeDayCount={onChangeDayCount}
            allowPinch={allowPinch}
            drillProgress={zoomDrillKind === 'week-day' ? drillProgress : null}
            drillFocusDayIndex={zoomDrillKind === 'week-day' ? zoomDrillFocus : null}
          />
        ) : activeView === 'day' ? (
          dayMode === 'list' ? (
            <View style={styles.dayListHost}>
              <DayListPane
                day={dayAnchor}
                jumpNonce={dayListJump}
                fetchRange={fetchDayListRange}
                reloadKey={dayListReloadKey}
                query={searchQuery}
                showHiddenBadge={showHiddenBadge}
                onPressItem={openItem}
                onTopDayChange={onDayListTopDay}
              />
            </View>
          ) : (
            <DayColumn
              day={dayRange.day}
              items={visibleItems}
              showHiddenBadge={showHiddenBadge}
              onPressItem={openItem}
              enterAnim={dayEnterAnim}
              exitAnim={dayExitAnim}
              onExitDone={onDayExitDone}
              hideTitle
              onPressSlot={
                canCreate
                  ? (day, hour) => {
                      setComposer({
                        mode: 'create',
                        initialDraft: slotCreateDraft(day, hour),
                      });
                    }
                  : undefined
              }
            />
          )
        ) : activeView === 'month' ? (
          <View style={monthListMode ? styles.monthListHost : undefined}>
            <MonthGrid
              year={monthRange.year}
              monthIndex0={monthRange.monthIndex0}
              label={monthRange.label}
              hideTitle
              hideWeekdays
              items={visibleItems}
              selectedDay={monthSelectedDay}
              showHiddenBadge={showHiddenBadge}
              mode={monthMode}
              onSelectDay={(iso) => {
                setMonthSelectedDay(iso);
              }}
              onZoomDay={(iso, source, focusIndex) => {
                // Month ladder: day cell / week row → Week (Day only from Week).
                const week = weekRangeContaining(iso);
                // Pre-set week anchor so Week title string is ready at handoff.
                setDayAnchor(iso);
                setMonthSelectedDay(iso);
                setGridAnchor(week.fromIso);
                startZoomDrill({
                  kind: 'month-week',
                  source,
                  label: `Week of ${week.fromIso}`,
                  focusIndex,
                  then: () => {
                    // Title is sticky outside the drill — no fade-out / remount fade-in.
                    zoomTo('week');
                  },
                });
              }}
              drillProgress={zoomDrillKind === 'month-week' ? drillProgress : null}
              drillFocusWeekIndex={zoomDrillKind === 'month-week' ? zoomDrillFocus : null}
              enterChromeAnim={monthEnterChrome}
              onCommitAdjacentMonth={(dir) => {
                setMonthAnchor(shiftMonth(monthRange.fromIso, dir));
                setMonthSelectedDay(null);
              }}
              onPressItem={openItem}
            />
          </View>
        ) : activeView === 'year' ? (
          <View
            onLayout={(event) => {
              yearHostYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <YearGrid
              year={year}
              items={visibleItems}
              focusMonthIndex0={yearTodayFocus?.monthIndex0 ?? null}
              focusNonce={yearTodayFocus?.nonce ?? 0}
              onFocusMonthY={(localY) => {
                screenScrollRef.current?.scrollTo({
                  y: Math.max(0, yearHostYRef.current + localY - 8),
                  animated: true,
                });
              }}
              onPressMonth={(y, m0, source) => {
                const iso = `${y}-${String(m0 + 1).padStart(2, '0')}-01`;
                const label = new Date(y, m0, 1, 12, 0, 0, 0).toLocaleDateString(undefined, {
                  month: 'long',
                });
                // Pre-set month anchors so Month can mount ready; fade kills end snap.
                setMonthAnchor(iso);
                setMonthSelectedDay(null);
                startZoomDrill({
                  kind: 'year-month',
                  source,
                  label,
                  then: () => {
                    setMonthEnterChrome(!reduceMotion);
                    zoomTo('month');
                  },
                });
              }}
            />
          </View>
        ) : items.length > 0 ? (
          <AgendaList
            days={agendaRange.days}
            items={visibleItems}
            showHiddenBadge={showHiddenBadge}
            onPressItem={openItem}
          />
        ) : null
      ) : null;

  const stickyTitleView =
    activeView === 'month' ||
    activeView === 'week' ||
    activeView === 'multiday' ||
    (activeView === 'day' && dayMode !== 'list');
  /** Expanded = Day title; inbound Week→Day drill starts the morph immediately. */
  const titleInboundDay =
    zoomDrill?.kind === 'week-day' && zoomDrill.direction === 'in' && morphDayIso != null;
  const titleExpanded = (activeView === 'day' && !dayExitAnim) || titleInboundDay;
  const titleDayIso =
    activeView === 'day' ? dayRange.day : titleInboundDay ? morphDayIso : null;

  const renderStickyTitle = () => {
    if (!stickyTitleView || error || parentChildMissing) return null;
    const collapsed =
      activeView === 'month'
        ? monthYearTitleParts(monthRange.year, monthRange.monthIndex0)
        : activeView === 'day'
          ? (() => {
              // Day→Week reverse: collapse to the day's month/year, then Week keeps it.
              const m = monthContaining(dayRange.day);
              return monthYearTitleParts(m.year, m.monthIndex0);
            })()
          : monthYearTitleParts(weekMonth.year, weekMonth.monthIndex0);
    return (
      <CalendarPeriodTitle
        month={collapsed.month}
        year={collapsed.year}
        dayIso={titleDayIso}
        expanded={titleExpanded}
        reduceMotion={reduceMotion}
        enterFade={activeView === 'month' && monthEnterChrome}
      />
    );
  };

  /** Sun…Sat header row stays put across Month↔Week (7-day Week only; not Month List). */
  const stickyWeekdayView = (activeView === 'month' && !monthListMode) || activeView === 'week';
  const renderStickyWeekdays = () => {
    if (!stickyWeekdayView || error || parentChildMissing) return null;
    const isWeek = activeView === 'week';
    const todayIdx = isWeek ? gridDays.indexOf(dayRangeContaining().day) : -1;
    return (
      <CalendarWeekdayRow
        gutter={isWeek && hasTimedInRange(visibleItems, gridDays) ? 44 : 0}
        gap={isWeek ? 2 : 0}
        todayIndex={todayIdx >= 0 ? todayIdx : null}
        reduceMotion={reduceMotion}
        enterFade={activeView === 'month' && monthEnterChrome}
        fadeProgress={zoomDrillKind === 'week-day' ? drillProgress : null}
      />
    );
  };

  return (
    <View style={styles.screenRoot}>
    <Screen
      pageChromeHosted
      collapse={collapsingChrome}
      pin={pinnedChrome}
      scroll={!monthListMode && !dayListMode}
      scrollRef={screenScrollRef}
    >
      {!loaded || !prefsReady || !viewPrefsReady ? <WorkingLine /> : null}

      {error ? (
        <View style={styles.stateBlock}>
          <Text style={[styles.empty, { color: colors.danger }]}>{error}</Text>
          <GhostButton label="Retry" onPress={() => void load()} />
        </View>
      ) : null}

      {loaded && !error && parentChildMissing ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          Pick a child to open that calendar. Twin calendars never mix.
        </Text>
      ) : null}

      {filteredEmpty ? (
        <View style={styles.stateBlock}>
          <Text style={[styles.empty, { color: colors.mute }]}>
            Nothing matches these filters.
          </Text>
          <GhostButton label="Clear filters" onPress={onClearFilters} />
        </View>
      ) : null}

      {naturallyEmpty ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          Nothing on the calendar in this range.
        </Text>
      ) : null}

      {/*
        Sticky period title — OUTSIDE CalendarZoomDrill so drill transforms never move/fade it.
        Month→Week keeps the same string; Week↔Day morphs text at the same 22pt size.
      */}
      {renderStickyTitle()}
      {/* Sticky Sun…Sat row — also OUTSIDE CalendarZoomDrill (Month→Week keeps it in place). */}
      {renderStickyWeekdays()}

      {/* Month/Year/Day mount even when !loaded / filteredEmpty so empty month keeps MonthGrid. */}
      <View
        ref={bodyHostRef}
        collapsable={false}
        style={styles.bodyHost}
      >
        {zoomDrill ? (
          <CalendarZoomDrill
            kind={zoomDrill.kind}
            direction={zoomDrill.direction}
            host={zoomDrill.host}
            source={zoomDrill.source}
            dest={zoomDrill.dest}
            progress={drillProgress}
            onFinished={onZoomDrillFinished}
          >
            {renderCalendarBody()}
          </CalendarZoomDrill>
        ) : (
          renderCalendarBody()
        )}
      </View>

      {seat ? (
        <EventComposer
          visible={composer != null}
          mode={composer?.mode ?? 'create'}
          seat={seat}
          eventId={composer?.eventId}
          classId={
            seat === 'teacher'
              ? composer?.initialDraft?.classId ?? chrome.classId
              : null
          }
          childStudentId={
            seat === 'parent'
              ? composer?.initialDraft?.childStudentId ?? parentChildId
              : null
          }
          initialDraft={composer?.initialDraft ?? askDraft}
          onClose={() => {
            setComposer(null);
            setAskDraft(null);
          }}
          onSaved={() => {
            setComposer(null);
            setAskDraft(null);
            void load();
          }}
        />
      ) : null}

      {seat ? (
        <EventMenu
          visible={menuItem != null}
          seat={seat}
          item={menuItem}
          onClose={() => setMenuItem(null)}
          onView={(item) => {
            setMenuItem(null);
            setComposer({ mode: 'view', eventId: item.id });
          }}
          onEdit={(item) => {
            setMenuItem(null);
            setComposer({ mode: 'edit', eventId: item.id });
          }}
          onDelete={(item) => {
            setMenuItem(null);
            setDeleteItem(item);
          }}
          onOpenAssignment={(item) => {
            setMenuItem(null);
            if (item.deepLink) router.push(item.deepLink as never);
          }}
        />
      ) : null}

      <CalendarConfirm
        visible={deleteItem != null}
        title="Delete event?"
        body="This removes it for everyone who could see it."
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
      />

      <ViewCustomizeSheet
        visible={customizeOpen && !calendarsOpen}
        monthMode={monthMode}
        dayMode={dayMode}
        dayCount={stepperCount}
        onChangeMonthMode={(mode) => {
          setMonthMode(mode);
          persistViewPrefs(activeView, dayCount, mode, dayMode);
        }}
        onChangeDayMode={(mode) => {
          setDayMode(mode);
          persistViewPrefs(activeView, dayCount, monthMode, mode);
        }}
        onChangeDayCount={onChangeDayCount}
        chipIds={chipIds}
        onToggleChip={onToggleChip}
        onClearFilters={onClearFilters}
        onOpenCalendars={() => setCalendarsOpen(true)}
        onClose={() => {
          setCustomizeOpen(false);
          setCalendarsOpen(false);
        }}
      />

      {/* CAL-R5-09: Calendars stacks above Settings; Done pops one level (Settings stays open). */}
      <CalendarsSheet
        visible={calendarsOpen}
        layers={layers}
        enabledIds={enabledIds}
        onToggle={onToggleLayer}
        onUnsubscribe={handleUnsubscribe}
        onClose={() => setCalendarsOpen(false)}
      />
    </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  bodyHost: {
    flexGrow: 1,
  },
  empty: {
    ...type.body,
    marginVertical: 12,
  },
  hint: {
    ...type.meta,
    marginTop: 16,
  },
  stateBlock: {
    gap: 8,
    marginBottom: 12,
  },
  addRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  childBlock: {
    marginBottom: 8,
    gap: 4,
  },
  childLabel: {
    ...type.meta,
    textTransform: 'uppercase',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minHeight: 44,
  },
  navLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  chromeCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 2,
  },
  monthListHost: {
    flex: 1,
    minHeight: 0,
  },
  dayListHost: {
    flex: 1,
    minHeight: 0,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    ...type.body,
  },
});
