import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgendaList } from '@/components/calendar/AgendaList';
import { CalendarConfirm } from '@/components/calendar/CalendarConfirm';
import { DayColumn } from '@/components/calendar/DayColumn';
import { EventComposer } from '@/components/calendar/EventComposer';
import { EventMenu } from '@/components/calendar/EventMenu';
import { TeacherWeekGrid } from '@/components/calendar/TeacherWeekGrid';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { deleteCalendarEvent, listCalendarItems } from '@/lib/calendar/api';
import { canCreateOnSeat } from '@/lib/calendar/eventActions';
import {
  agendaRangeFrom,
  dayRangeContaining,
  dayRpcBounds,
  shiftDay,
} from '@/lib/calendar/day';
import { calendarSeatForChrome } from '@/lib/calendar/seat';
import type { CalendarItem } from '@/lib/calendar/types';
import {
  shiftWeek,
  weekRangeContaining,
  weekRpcBounds,
} from '@/lib/calendar/week';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { listParentLinkedChildren } from '@/lib/diary/api';
import { firstName } from '@/lib/format';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type PhoneView = 'agenda' | 'day';
type WebView = 'week' | 'agenda' | 'day';

/**
 * CAL-R2 Phase C: CR-A create/edit + MG-A menus + hat-scoped events/absence.
 * Phase B family read + phone Agenda/Day + CH-A + DP-A retained.
 * Own chrome — not FullCalendar / Wix Agenda. No 6th tray tab.
 */
export default function CalendarScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const layout = useLayout();
  const router = useRouter();
  usePushedTitle('Calendar');

  const seat = calendarSeatForChrome(chrome.role);
  const isPhone = layout.isPhone;
  const showHiddenBadge = seat === 'teacher';

  const [phoneView, setPhoneView] = useState<PhoneView>('agenda');
  const [webView, setWebView] = useState<WebView>('week');
  const [weekAnchor, setWeekAnchor] = useState(() => weekRangeContaining().fromIso);
  const [dayAnchor, setDayAnchor] = useState(() => dayRangeContaining().day);
  const [agendaAnchor, setAgendaAnchor] = useState(() => dayRangeContaining().day);

  const [children, setChildren] = useState<Array<{ id: string; display_name: string }>>([]);
  const [focusedChildId, setFocusedChildId] = useState<string | null>(null);
  const [childrenLoaded, setChildrenLoaded] = useState(false);

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [composer, setComposer] = useState<{
    mode: 'create' | 'edit' | 'view';
    eventId?: string | null;
  } | null>(null);
  const [menuItem, setMenuItem] = useState<CalendarItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CalendarItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const weekRange = useMemo(() => weekRangeContaining(weekAnchor), [weekAnchor]);
  const dayRange = useMemo(() => dayRangeContaining(dayAnchor), [dayAnchor]);
  const agendaRange = useMemo(() => agendaRangeFrom(agendaAnchor, 14), [agendaAnchor]);

  const activeView: PhoneView | WebView = isPhone
    ? phoneView
    : seat === 'teacher' || seat === 'office'
      ? webView
      : webView === 'week'
        ? 'agenda'
        : webView;

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

  const load = useCallback(async () => {
    if (!seat) {
      setItems([]);
      setLoaded(true);
      return;
    }
    // CH-A: parent 2+ children without focus → empty (fail-closed), never twin merge.
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

    setError(null);
    try {
      let from: string;
      let to: string;
      if (activeView === 'week') {
        const bounds = weekRpcBounds(weekRange.fromIso, weekRange.toIso);
        from = bounds.from;
        to = bounds.to;
      } else if (activeView === 'day') {
        const bounds = dayRpcBounds(dayRange.fromIso, dayRange.toIso);
        from = bounds.from;
        to = bounds.to;
      } else {
        const bounds = dayRpcBounds(agendaRange.fromIso, agendaRange.toIso);
        from = bounds.from;
        to = bounds.to;
      }

      const rows = await listCalendarItems({
        from,
        to,
        seat,
        classId: seat === 'teacher' ? chrome.classId : null,
        childStudentId: seat === 'parent' ? parentChildId : null,
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
    dayRange.fromIso,
    dayRange.toIso,
    agendaRange.fromIso,
    agendaRange.toIso,
    chrome.classId,
    parentChildId,
    parentChildMissing,
    childrenLoaded,
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
                }}
              />
            ))}
          </ChipRow>
        </View>
      ) : null}

      {isPhone ? (
        <ChipRow>
          <Chip
            label="Agenda"
            selected={phoneView === 'agenda'}
            onPress={() => setPhoneView('agenda')}
          />
          <Chip label="Day" selected={phoneView === 'day'} onPress={() => setPhoneView('day')} />
        </ChipRow>
      ) : (
        <ChipRow>
          {(seat === 'teacher' || seat === 'office') && (
            <Chip label="Week" selected={webView === 'week'} onPress={() => setWebView('week')} />
          )}
          <Chip
            label="Agenda"
            selected={activeView === 'agenda'}
            onPress={() => setWebView('agenda')}
          />
          <Chip label="Day" selected={activeView === 'day'} onPress={() => setWebView('day')} />
        </ChipRow>
      )}

      {canCreate ? (
        <View style={styles.addRow}>
          <PrimaryButton
            label="Add event"
            onPress={() => setComposer({ mode: 'create' })}
          />
          {seat === 'parent' && parentChildMissing ? (
            <Text style={[styles.hint, { color: colors.mute, marginTop: 8 }]}>
              Pick a child to add an absence for that child only.
            </Text>
          ) : null}
        </View>
      ) : null}

      {activeView === 'week' ? (
        <View style={styles.toolbar}>
          <GhostButton label="Previous" onPress={() => setWeekAnchor(shiftWeek(weekRange.fromIso, -1))} />
          <Pressable
            onPress={() => setWeekAnchor(weekRangeContaining().fromIso)}
            accessibilityRole="button"
            accessibilityLabel="Go to this week"
          >
            <Text style={[styles.rangeLabel, { color: colors.ink }]}>
              {weekRange.fromIso.slice(5)} – {weekRange.toIso.slice(5)}
            </Text>
          </Pressable>
          <GhostButton label="Next" onPress={() => setWeekAnchor(shiftWeek(weekRange.fromIso, 1))} />
        </View>
      ) : null}

      {activeView === 'day' ? (
        <View style={styles.toolbar}>
          <GhostButton label="Previous" onPress={() => setDayAnchor(shiftDay(dayRange.day, -1))} />
          <Pressable
            onPress={() => setDayAnchor(dayRangeContaining().day)}
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
            onPress={() => setAgendaAnchor(dayRangeContaining().day)}
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

      {!loaded ? <WorkingLine /> : null}

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

      {loaded && !error && !parentChildMissing && items.length === 0 && activeView === 'week' ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          Nothing on the calendar this week.
        </Text>
      ) : null}

      {loaded && !error && !parentChildMissing ? (
        activeView === 'week' ? (
          <TeacherWeekGrid days={weekRange.days} items={items} onPressItem={openItem} />
        ) : activeView === 'day' ? (
          <DayColumn
            day={dayRange.day}
            items={items}
            showHiddenBadge={showHiddenBadge}
            onPressItem={openItem}
          />
        ) : (
          <AgendaList
            days={agendaRange.days}
            items={items}
            showHiddenBadge={showHiddenBadge}
            onPressItem={openItem}
          />
        )
      ) : null}

      {seat === 'teacher' ? (
        <Text style={[styles.hint, { color: colors.mute }]}>
          Hidden quizzes and tests show a Hidden badge until you publish them for families from the
          assignment or Needs. School events are managed by office.
        </Text>
      ) : null}

      {seat ? (
        <EventComposer
          visible={composer != null}
          mode={composer?.mode ?? 'create'}
          seat={seat}
          eventId={composer?.eventId}
          classId={seat === 'teacher' ? chrome.classId : null}
          childStudentId={seat === 'parent' ? parentChildId : null}
          onClose={() => setComposer(null)}
          onSaved={() => {
            setComposer(null);
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
  filterLabel: {
    ...type.meta,
    textTransform: 'uppercase',
  },
});
