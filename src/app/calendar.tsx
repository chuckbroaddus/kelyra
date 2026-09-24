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
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { AgendaList } from '@/components/calendar/AgendaList';
import { CalendarConfirm } from '@/components/calendar/CalendarConfirm';
import { CalendarsSheet } from '@/components/calendar/CalendarsSheet';
import { DayColumn } from '@/components/calendar/DayColumn';
import { EventComposer } from '@/components/calendar/EventComposer';
import { takePendingCalendarDraft, type PendingCalendarDraft } from '@/lib/calendar/askDraft';
import { EventMenu } from '@/components/calendar/EventMenu';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { PeriodPager } from '@/components/calendar/PeriodPager';
import { MultiDayStepper } from '@/components/calendar/MultiDayStepper';
import { TeacherWeekGrid } from '@/components/calendar/TeacherWeekGrid';
import { YearGrid } from '@/components/calendar/YearGrid';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { GhostButton } from '@/components/ui/Button';
import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
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
  DAY_LIST_WINDOW_DAYS,
  dayListOriginForTarget,
  listAnchorDayFromScroll,
  planDayListDrumShift,
  planDayListScrollSettle,
  scrollYForListAnchorDay,
  type DaySectionOffset,
} from '@/lib/calendar/listAnchorDay';
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
  shiftWeek,
  weekRangeContaining,
  weekRpcBounds,
} from '@/lib/calendar/week';
import { yearContaining, yearRpcBounds } from '@/lib/calendar/year';
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

/** CR-CalTabs PersonTabs row — Year·Month·Week·Day only (no Agenda/Days tab). */
const VIEW_TABS: PersonTab[] = [
  { key: 'year', label: 'Year', icon: 'calYear' },
  { key: 'month', label: 'Month', icon: 'calMonth' },
  { key: 'week', label: 'Week', icon: 'calWeek' },
  { key: 'day', label: 'Day', icon: 'calDay' },
];

/**
 * CR-CalTabs + R4 L-C: phone Year-first; tap-zoom Year→Month→Day; hierarchical back;
 * one-row PersonTabs Y/M/W/D + +·search·gear; modes/Show/Calendars/Clear under gear.
 * No tray chrome. PersonTabs opt-in on /calendar only — no §32.2 flip.
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
  // Today ISO — week Sunday via weekRangeContaining; 3 = center; 5 = Mon–Fri (CAL-R5-04).
  const [gridAnchor, setGridAnchor] = useState(() => multidayTodayAnchor());
  const [dayAnchor, setDayAnchor] = useState(() => dayRangeContaining().day);
  /** CAL-P6-5C: painted Day List window origin — separate from listAnchorDay (dayAnchor). */
  const [dayListOrigin, setDayListOrigin] = useState(() => dayRangeContaining().day);
  const [agendaAnchor, setAgendaAnchor] = useState(() => dayRangeContaining().day);
  const [monthAnchor, setMonthAnchor] = useState(() => dayRangeContaining().day);
  const [yearAnchor, setYearAnchor] = useState(() => yearContaining());
  const [monthSelectedDay, setMonthSelectedDay] = useState<string | null>(null);

  const [monthMode, setMonthMode] = useState<MonthMode>('compact');
  const [dayMode, setDayMode] = useState<DayMode>('single');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  /** In-route zoom stack for Year→Month→Day (platform back / Up chrome). */
  const [zoomStack, setZoomStack] = useState<CalendarViewId[]>([]);
  /** Apply stored view once per prefs key — never snap zoomTo(month) back to Year. */
  const viewPrefsHydratedKeyRef = useRef<string | null>(null);
  /** CAL-P6-8A / 5C: body scroller + Day List↔drum lockstep. */
  const screenScrollRef = useRef<ScrollView>(null);
  const dayListSectionsRef = useRef<DaySectionOffset[]>([]);
  const dayListOriginYRef = useRef(0);
  const dayListScrollYRef = useRef(0);
  const dayListSyncFromDrumRef = useRef(false);
  const dayListSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** After window rebase, scroll this day to top once sections remeasure. */
  const pendingDayListScrollRef = useRef<string | null>(null);
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
  const multiRange = useMemo(
    () => multidayRangeContaining(dayCount === 7 ? 5 : dayCount, gridAnchor),
    [dayCount, gridAnchor],
  );
  const dayRange = useMemo(() => dayRangeContaining(dayAnchor), [dayAnchor]);
  const agendaRange = useMemo(() => agendaRangeFrom(agendaAnchor, 14), [agendaAnchor]);
  /**
   * CAL-R5-11 / CAL-P6-5C Day List — continuous window from dayListOrigin.
   * dayAnchor is listAnchorDay (drum center); origin stays stable on settle.
   */
  const dayListRange = useMemo(
    () => agendaRangeFrom(dayListOrigin, DAY_LIST_WINDOW_DAYS),
    [dayListOrigin],
  );
  const monthRange = useMemo(() => monthContaining(monthAnchor), [monthAnchor]);
  const year = yearAnchor;
  const monthListMode = activeView === 'month' && monthMode === 'list';

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
          setDayListOrigin(dayListOriginForTarget(session.dayAnchor, session.dayAnchor));
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

  const zoomUp = useCallback(() => {
    const parent = zoomStack.length > 0 ? zoomStack[zoomStack.length - 1]! : zoomParentView(activeView);
    if (!parent) return false;
    setZoomStack((stack) => (stack.length ? stack.slice(0, -1) : []));
    setActiveView(parent);
    persistViewPrefs(parent, dayCount);
    return true;
  }, [zoomStack, activeView, dayCount, persistViewPrefs]);

  const canClimb = canZoomUp(activeView) || zoomStack.length > 0;
  /** CAL-P6-3A: web / RM climb control — not Ghost strip above PersonTabs. */
  const showClimbControl = canClimb && (!isPhone || reduceMotion);

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

  const scrollDayListToAnchor = useCallback(
    (day: string, opts?: { forceZero?: boolean }) => {
      const sectionY = opts?.forceZero
        ? 0
        : scrollYForListAnchorDay(dayListSectionsRef.current, day);
      if (sectionY == null) return;
      const y = Math.max(0, dayListOriginYRef.current + sectionY);
      dayListSyncFromDrumRef.current = true;
      dayListScrollYRef.current = y;
      screenScrollRef.current?.scrollTo({ y, animated: !reduceMotion });
      if (dayListSettleTimerRef.current) clearTimeout(dayListSettleTimerRef.current);
      dayListSettleTimerRef.current = setTimeout(() => {
        dayListSyncFromDrumRef.current = false;
      }, 320);
    },
    [reduceMotion],
  );

  const onDayListSectionsChange = useCallback(
    (sections: DaySectionOffset[]) => {
      dayListSectionsRef.current = sections;
      const pending = pendingDayListScrollRef.current;
      if (!pending) return;
      if (!sections.some((s) => s.day === pending)) return;
      pendingDayListScrollRef.current = null;
      scrollDayListToAnchor(pending, { forceZero: pending === dayListOrigin });
    },
    [dayListOrigin, scrollDayListToAnchor],
  );

  const settleDayListAnchorFromScroll = useCallback(() => {
    if (activeView !== 'day' || dayMode !== 'list') return;
    if (dayListSyncFromDrumRef.current) return;
    const localY = Math.max(0, dayListScrollYRef.current - dayListOriginYRef.current);
    const day = listAnchorDayFromScroll(dayListSectionsRef.current, localY);
    if (!day || day === dayAnchor) return;
    // CAL-P6-5C-03: settle writes SoT only — do not rebase painted window.
    const plan = planDayListScrollSettle({
      origin: dayListOrigin,
      currentAnchor: dayAnchor,
      topDay: day,
    });
    setDayAnchor(plan.nextAnchor);
  }, [activeView, dayMode, dayAnchor, dayListOrigin]);

  const onScreenScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      dayListScrollYRef.current = event.nativeEvent.contentOffset.y;
      if (activeView !== 'day' || dayMode !== 'list') return;
      if (dayListSyncFromDrumRef.current) return;
      if (dayListSettleTimerRef.current) clearTimeout(dayListSettleTimerRef.current);
      dayListSettleTimerRef.current = setTimeout(() => {
        settleDayListAnchorFromScroll();
      }, 140);
    },
    [activeView, dayMode, settleDayListAnchorFromScroll],
  );

  const applyDayListDrumShift = useCallback(
    (steps: number) => {
      const plan = planDayListDrumShift({
        origin: dayListOrigin,
        anchor: dayAnchor,
        steps,
        windowDays: DAY_LIST_WINDOW_DAYS,
      });
      setDayAnchor(plan.nextAnchor);
      if (plan.scroll === 'zero') {
        pendingDayListScrollRef.current = plan.nextAnchor;
        setDayListOrigin(plan.nextOrigin);
        return;
      }
      scrollDayListToAnchor(plan.nextAnchor);
    },
    [dayAnchor, dayListOrigin, scrollDayListToAnchor],
  );

  const onChangeDayCount = useCallback(
    (count: MultidayCount) => {
      if (count === 7) {
        setDayCount(7);
        setActiveView('week');
        persistViewPrefs('week', 7);
        return;
      }
      const today = multidayTodayAnchor();
      // If the visible week/range includes today, keep today in the 3/5 window.
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
        // List mode loads the continuous multi-day window (CAL-R5-11).
        const range = dayMode === 'list' ? dayListRange : dayRange;
        const bounds = dayRpcBounds(range.fromIso, range.toIso);
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
    dayRange.fromIso,
    dayRange.toIso,
    dayListRange.fromIso,
    dayListRange.toIso,
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
      // 3 centers on today; 5 = Mon–Fri containing today — not week Sunday.
      setGridAnchor(multidayTodayAnchor(today));
    } else if (activeView === 'day') {
      setDayAnchor(today);
      if (dayMode === 'list') {
        pendingDayListScrollRef.current = today;
        setDayListOrigin(today);
      }
    } else if (activeView === 'agenda') {
      setAgendaAnchor(today);
    } else if (activeView === 'month') {
      setMonthAnchor(today);
      setMonthSelectedDay(today);
    } else if (activeView === 'year') {
      setYearAnchor(yearContaining(today));
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

      {/* CR-CalTabs one-row: PersonTabs Y/M/W/D + + · search · gear (no headerTrio above). */}
      <PersonTabs
        tabs={VIEW_TABS}
        value={
          activeView === 'year' ||
          activeView === 'month' ||
          activeView === 'week' ||
          activeView === 'day'
            ? activeView
            : ''
        }
        onChange={(key) => selectView(key as CalendarViewId)}
        motionPack="cm-linear"
        trailing={
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
        }
      />

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
    </>
  );

  const pinnedChrome = (
    <View {...(hierarchyPinch?.panHandlers ?? {})}>
      {/* CAL-P6-3A: web/RM `<` under tabs in pin band — not Ghost above PersonTabs. */}
      {showClimbControl ? (
        <View style={styles.climbRow}>
          <GhostButton
            label="<"
            accessibilityLabel="Zoom up one level"
            onPress={() => {
              zoomUp();
            }}
          />
        </View>
      ) : null}

      {canCreate && seat === 'parent' && parentChildMissing ? (
        <Text style={[styles.hint, { color: colors.mute, marginTop: 8 }]}>
          Pick a child to add an absence for that child only.
        </Text>
      ) : null}

      {activeView === 'week' || activeView === 'multiday' ? (
        <MultiDayStepper value={stepperCount} onChange={onChangeDayCount} />
      ) : null}

      {/* CAL-P6-8A: period drum pinned while PersonTabs hide with tray. */}
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
  );

  // CAL-R5-12: pageChromeHosted drops Screen pad+contextReserve band so Y/M/W/D sit tight under header.
  // CAL-P6-8A: PersonTabs collapse with tray; drum stays in pin band.
  // CAL-P6-6B: Month List owns a flex-bounded scroller — disable page scroll so soft-edge can fire.
  return (
    <Screen
      pageChromeHosted
      collapse={collapsingChrome}
      pin={pinnedChrome}
      scroll={!monthListMode}
      scrollRef={screenScrollRef}
      onScroll={onScreenScroll}
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

      {/* Month/Year/Day mount even when !loaded / filteredEmpty so empty month keeps MonthGrid. */}
      {(loaded || activeView === 'month' || activeView === 'year' || activeView === 'day') &&
      !error &&
      !parentChildMissing ? (
        activeView === 'week' || activeView === 'multiday' ? (
          <TeacherWeekGrid
            days={gridDays}
            items={visibleItems}
            showHiddenBadge={showHiddenBadge}
            onPressItem={openItem}
            onPressDay={(iso) => {
              setDayAnchor(iso);
              setDayListOrigin(iso);
              zoomTo('day');
            }}
            dayCount={stepperCount}
            onChangeDayCount={onChangeDayCount}
            allowPinch={allowPinch}
          />
        ) : activeView === 'day' ? (
          dayMode === 'list' ? (
            <View
              onLayout={(event) => {
                dayListOriginYRef.current = event.nativeEvent.layout.y;
              }}
            >
              <AgendaList
                days={dayListRange.days}
                items={visibleItems}
                showHiddenBadge={showHiddenBadge}
                onPressItem={openItem}
                includeEmptyDays
                onSectionOffsetsChange={onDayListSectionsChange}
              />
            </View>
          ) : (
            <DayColumn
              day={dayRange.day}
              items={visibleItems}
              showHiddenBadge={showHiddenBadge}
              onPressItem={openItem}
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
              items={visibleItems}
              selectedDay={monthSelectedDay}
              showHiddenBadge={showHiddenBadge}
              mode={monthMode}
              onSelectDay={(iso) => {
                setMonthSelectedDay(iso);
              }}
              onZoomDay={(iso) => {
                setDayAnchor(iso);
                setDayListOrigin(iso);
                setMonthSelectedDay(iso);
                zoomTo('day');
              }}
              onZoomWeek={(iso) => {
                setGridAnchor(weekRangeContaining(iso).fromIso);
                zoomTo('week');
              }}
              onCommitAdjacentMonth={(dir) => {
                setMonthAnchor(shiftMonth(monthRange.fromIso, dir));
                setMonthSelectedDay(null);
              }}
              onPressItem={openItem}
            />
          </View>
        ) : activeView === 'year' ? (
          <YearGrid
            year={year}
            items={visibleItems}
            onPressMonth={(y, m0) => {
              const iso = `${y}-${String(m0 + 1).padStart(2, '0')}-01`;
              setMonthAnchor(iso);
              setMonthSelectedDay(null);
              zoomTo('month');
            }}
          />
        ) : items.length > 0 ? (
          <AgendaList
            days={agendaRange.days}
            items={visibleItems}
            showHiddenBadge={showHiddenBadge}
            onPressItem={openItem}
          />
        ) : null
      ) : null}

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
        onChangeMonthMode={(mode) => {
          setMonthMode(mode);
          persistViewPrefs(activeView, dayCount, mode, dayMode);
        }}
        onChangeDayMode={(mode) => {
          setDayMode(mode);
          // Entering List: paint window from current listAnchorDay (stable until drum leaves range).
          if (mode === 'list') {
            setDayListOrigin(dayAnchor);
            pendingDayListScrollRef.current = dayAnchor;
          }
          persistViewPrefs(activeView, dayCount, monthMode, mode);
        }}
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
  );
}

const styles = StyleSheet.create({
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
  chromeCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 2,
  },
  climbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 0,
  },
  monthListHost: {
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
