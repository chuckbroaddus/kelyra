import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AgendaList } from '@/components/calendar/AgendaList';
import { CalendarConfirm } from '@/components/calendar/CalendarConfirm';
import { CalendarsSheet } from '@/components/calendar/CalendarsSheet';
import { DayColumn } from '@/components/calendar/DayColumn';
import { EventComposer } from '@/components/calendar/EventComposer';
import { takePendingCalendarDraft, type PendingCalendarDraft } from '@/lib/calendar/askDraft';
import { EventMenu } from '@/components/calendar/EventMenu';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { MultiDayStepper } from '@/components/calendar/MultiDayStepper';
import { TeacherWeekGrid } from '@/components/calendar/TeacherWeekGrid';
import { YearGrid } from '@/components/calendar/YearGrid';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
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
import { canCreateOnSeat } from '@/lib/calendar/eventActions';
import {
  applyPreset,
  CATEGORY_CHIPS,
  categoriesForChips,
  FILTER_PRESETS,
  toggleChip,
  toggleLayerEnabled,
  type FilterPresetId,
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

const VIEW_CHIPS: Array<{ id: CalendarViewId; label: string }> = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'multiday', label: 'Days' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

/**
 * CAL-R4 L-C + C-B: phone Year-first; tap-zoom Year→Month→Day; hierarchical back;
 * quiet view chips (LF-A category chips stay primary); header + / search / customizer;
 * Month Compact|List; Day Single|List; Agenda chip stays. No tray chrome.
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
  // Today ISO — week still resolves Sunday via weekRangeContaining; multiday 3/5 starts here.
  const [gridAnchor, setGridAnchor] = useState(() => multidayTodayAnchor());
  const [dayAnchor, setDayAnchor] = useState(() => dayRangeContaining().day);
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
  const monthRange = useMemo(() => monthContaining(monthAnchor), [monthAnchor]);
  const year = yearAnchor;

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
  useEffect(() => {
    if (!seat || !profileId) {
      setViewPrefsReady(true);
      return;
    }
    if (seat === 'parent' && !childrenLoaded) {
      setViewPrefsReady(false);
      return;
    }
    let cancelled = false;
    setViewPrefsReady(false);
    void (async () => {
      const prefs = await loadCalViewPrefs(
        profileId,
        seat,
        deviceClass,
        seat === 'parent' ? parentChildId : null,
      );
      if (cancelled) return;
      setActiveView(prefs.view);
      setDayCount(prefs.days);
      setMonthMode(prefs.monthMode);
      setDayMode(prefs.dayMode);
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
        // 3/5 windows start at anchor — use today so Today is never omitted mid-week.
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

  // Platform / chrome back pops Year←Month←Day hierarchy before leaving Calendar.
  useEffect(() => {
    if (!canZoomUp(activeView) && zoomStack.length === 0) {
      chrome.setPushedBackHandler?.(null);
      return;
    }
    chrome.setPushedBackHandler?.(() => zoomUp());
    return () => {
      chrome.setPushedBackHandler?.(null);
    };
  }, [chrome, activeView, zoomStack, zoomUp]);

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

  const onPreset = (preset: FilterPresetId) => {
    const next = applyPreset(preset, layers);
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
      setLoaded(false);
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
        categories: categoryFilter && categoryFilter.length ? categoryFilter : null,
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
    weekRange.fromIso,
    weekRange.toIso,
    multiRange.fromIso,
    multiRange.toIso,
    dayRange.fromIso,
    dayRange.toIso,
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
      setLoaded(false);
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
      // 3/5 starts at anchor — must be today, not week Sunday (omits Wed–Sat).
      setGridAnchor(multidayTodayAnchor(today));
    } else if (activeView === 'day') {
      setDayAnchor(today);
    } else if (activeView === 'agenda') {
      setAgendaAnchor(today);
    } else if (activeView === 'month') {
      setMonthAnchor(today);
      setMonthSelectedDay(today);
    } else if (activeView === 'year') {
      setYearAnchor(yearContaining(today));
    }
  };

  const filtersNarrowed =
    chipIds.length > 0 &&
    (chipIds.length < CATEGORY_CHIPS.length ||
      (layers.length > 0 && enabledIds.length < layers.length));
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
  const allowPinch = !reduceMotion && (activeView === 'week' || activeView === 'multiday');
  const stepperCount: MultidayCount =
    activeView === 'week' ? 7 : dayCount === 7 ? 5 : dayCount;

  if (!seat) {
    return (
      <Screen>
        <Text style={[styles.empty, { color: colors.mute }]}>Sign in to view Calendar.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {parentNeedsChild ? (
        <View style={styles.childBlock}>
          <Text style={[styles.filterLabel, { color: colors.mute }]}>Child</Text>
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
                }}
              />
            ))}
          </ChipRow>
        </View>
      ) : null}

      {/* CAL-R4 C-B header trio: + · search · view customizer (no tray). */}
      <View style={styles.headerTrio}>
        {canCreate ? (
          <IconButton
            name="plus"
            label="Add event"
            onPress={() => setComposer({ mode: 'create' })}
          />
        ) : (
          <View style={styles.headerTrioSpacer} />
        )}
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

      {/* Hierarchical Up — Year ← Month ← Day (platform back also wired). */}
      {canZoomUp(activeView) || zoomStack.length > 0 ? (
        <View style={styles.upRow}>
          <GhostButton
            label={
              activeView === 'day'
                ? 'Month'
                : activeView === 'month'
                  ? 'Year'
                  : 'Up'
            }
            onPress={() => {
              void zoomUp();
            }}
          />
        </View>
      ) : null}

      {/* In-Calendar view switcher (CAL-36 / R4) — quieter secondary; not tray. */}
      <ChipRow compact>
        {VIEW_CHIPS.map((chip) => (
          <Chip
            key={chip.id}
            label={chip.label}
            quiet
            selected={activeView === chip.id}
            onPress={() => selectView(chip.id)}
          />
        ))}
      </ChipRow>

      {/* LF-A category chips (multi-select) — stay primary (CAL-32). */}
      <View style={styles.filterBlock}>
        <Text style={[styles.filterLabel, { color: colors.mute }]}>Show</Text>
        <ChipRow>
          {CATEGORY_CHIPS.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              selected={chipIds.includes(chip.id)}
              onPress={() => onToggleChip(chip.id)}
            />
          ))}
          <Chip label="Calendars" selected={calendarsOpen} onPress={() => setCalendarsOpen(true)} />
        </ChipRow>
        <ChipRow compact>
          {FILTER_PRESETS.map((p) => (
            <Chip key={p.id} label={p.label} selected={false} onPress={() => onPreset(p.id)} />
          ))}
        </ChipRow>
      </View>

      {canCreate && seat === 'parent' && parentChildMissing ? (
        <Text style={[styles.hint, { color: colors.mute, marginTop: 8 }]}>
          Pick a child to add an absence for that child only.
        </Text>
      ) : null}

      {activeView === 'week' || activeView === 'multiday' ? (
        <>
          <MultiDayStepper value={stepperCount} onChange={onChangeDayCount} />
          <View style={styles.toolbar}>
            <GhostButton
              label="Previous"
              onPress={() =>
                setGridAnchor(
                  activeView === 'week'
                    ? shiftWeek(weekRange.fromIso, -1)
                    : shiftMultiday(multiRange.fromIso, stepperCount, -1),
                )
              }
            />
            <Pressable
              onPress={jumpToday}
              accessibilityRole="button"
              accessibilityLabel="Go to today"
            >
              <Text style={[styles.rangeLabel, { color: colors.ink }]}>
                {activeView === 'week'
                  ? `${weekRange.fromIso.slice(5)} – ${weekRange.toIso.slice(5)}`
                  : `${multiRange.fromIso.slice(5)} – ${multiRange.toIso.slice(5)}`}
              </Text>
            </Pressable>
            <GhostButton
              label="Next"
              onPress={() =>
                setGridAnchor(
                  activeView === 'week'
                    ? shiftWeek(weekRange.fromIso, 1)
                    : shiftMultiday(multiRange.fromIso, stepperCount, 1),
                )
              }
            />
          </View>
        </>
      ) : null}

      {activeView === 'day' ? (
        <View style={styles.toolbar}>
          <GhostButton label="Previous" onPress={() => setDayAnchor(shiftDay(dayRange.day, -1))} />
          <Pressable
            onPress={jumpToday}
            accessibilityRole="button"
            accessibilityLabel="Go to today"
          >
            <Text style={[styles.rangeLabel, { color: colors.ink }]}>{dayRange.day}</Text>
          </Pressable>
          <GhostButton label="Next" onPress={() => setDayAnchor(shiftDay(dayRange.day, 1))} />
        </View>
      ) : null}

      {activeView === 'agenda' ? (
        <View style={styles.toolbar}>
          <GhostButton
            label="Earlier"
            onPress={() => setAgendaAnchor(shiftDay(agendaRange.fromIso, -7))}
          />
          <Pressable
            onPress={jumpToday}
            accessibilityRole="button"
            accessibilityLabel="Reset agenda to today"
          >
            <Text style={[styles.rangeLabel, { color: colors.ink }]}>Next 2 weeks</Text>
          </Pressable>
          <GhostButton
            label="Later"
            onPress={() => setAgendaAnchor(shiftDay(agendaRange.fromIso, 7))}
          />
        </View>
      ) : null}

      {activeView === 'month' ? (
        <View style={styles.toolbar}>
          <GhostButton
            label="Previous"
            onPress={() => {
              setMonthAnchor(shiftMonth(monthRange.fromIso, -1));
              setMonthSelectedDay(null);
            }}
          />
          <Pressable
            onPress={jumpToday}
            accessibilityRole="button"
            accessibilityLabel="Go to this month"
          >
            <Text style={[styles.rangeLabel, { color: colors.ink }]}>{monthRange.label}</Text>
          </Pressable>
          <GhostButton
            label="Next"
            onPress={() => {
              setMonthAnchor(shiftMonth(monthRange.fromIso, 1));
              setMonthSelectedDay(null);
            }}
          />
        </View>
      ) : null}

      {activeView === 'year' ? (
        <View style={styles.toolbar}>
          <GhostButton label="Previous" onPress={() => setYearAnchor(year - 1)} />
          <Pressable
            onPress={jumpToday}
            accessibilityRole="button"
            accessibilityLabel="Go to this year"
          >
            <Text style={[styles.rangeLabel, { color: colors.ink }]}>{year}</Text>
          </Pressable>
          <GhostButton label="Next" onPress={() => setYearAnchor(year + 1)} />
        </View>
      ) : null}

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
          <GhostButton label="Clear filters" onPress={() => onPreset('reset')} />
        </View>
      ) : null}

      {naturallyEmpty ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          Nothing on the calendar in this range.
        </Text>
      ) : null}

      {loaded && !error && !parentChildMissing && !filteredEmpty ? (
        activeView === 'week' || activeView === 'multiday' ? (
          <TeacherWeekGrid
            days={gridDays}
            items={visibleItems}
            showHiddenBadge={showHiddenBadge}
            onPressItem={openItem}
            dayCount={stepperCount}
            onChangeDayCount={onChangeDayCount}
            allowPinch={allowPinch}
          />
        ) : activeView === 'day' ? (
          dayMode === 'list' ? (
            <AgendaList
              days={[dayRange.day]}
              items={visibleItems}
              showHiddenBadge={showHiddenBadge}
              onPressItem={openItem}
            />
          ) : (
            <DayColumn
              day={dayRange.day}
              items={visibleItems}
              showHiddenBadge={showHiddenBadge}
              onPressItem={openItem}
            />
          )
        ) : activeView === 'month' ? (
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
              setMonthSelectedDay(iso);
              zoomTo('day');
            }}
            onPressItem={openItem}
          />
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
            onPressDay={(iso) => {
              setDayAnchor(iso);
              setMonthAnchor(iso);
              zoomTo('day');
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

      {seat === 'teacher' ? (
        <Text style={[styles.hint, { color: colors.mute }]}>
          Hidden quizzes and tests show a Hidden badge until you publish them for families from the
          assignment or Needs. School events are managed by office. Disable homework in Calendars
          without hiding class events.
        </Text>
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

      <CalendarsSheet
        visible={calendarsOpen}
        layers={layers}
        enabledIds={enabledIds}
        onToggle={onToggleLayer}
        onUnsubscribe={handleUnsubscribe}
        onClose={() => setCalendarsOpen(false)}
      />

      <ViewCustomizeSheet
        visible={customizeOpen}
        monthMode={monthMode}
        dayMode={dayMode}
        onChangeMonthMode={(mode) => {
          setMonthMode(mode);
          persistViewPrefs(activeView, dayCount, mode, dayMode);
        }}
        onChangeDayMode={(mode) => {
          setDayMode(mode);
          persistViewPrefs(activeView, dayCount, monthMode, mode);
        }}
        onClose={() => setCustomizeOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
    gap: 8,
  },
  rangeLabel: {
    ...type.section,
    textAlign: 'center',
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
  filterBlock: {
    marginTop: 8,
    marginBottom: 4,
    gap: 4,
  },
  filterLabel: {
    ...type.meta,
    textTransform: 'uppercase',
  },
  headerTrio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  headerTrioSpacer: { width: 44, height: 44 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    ...type.body,
  },
  upRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
});
