import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarConfirm } from '@/components/calendar/CalendarConfirm';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { DateInput } from '@/components/ui/DateInput';
import { TextField } from '@/components/ui/TextField';
import { radius, type } from '@/constants/theme';
import {
  createCalendarEvent,
  getCalendarEvent,
  updateCalendarEvent,
} from '@/lib/calendar/api';
import type { PendingCalendarDraft } from '@/lib/calendar/askDraft';
import { REVIEW_DRAFT_BANNER } from '@/lib/calendar/askDraft';
import {
  composerTargetKey,
  composerTargets,
  type ComposerTarget,
} from '@/lib/calendar/composerTargets';
import { roleTintColor } from '@/lib/calendar/roleTint';
import type { CalendarEventKind, CalendarLayer, CalendarSeat } from '@/lib/calendar/types';
import {
  categoriesForKind,
  composeEventInstant,
  datePart,
  defaultKindForSeat,
  scopeForKind,
  timePart,
  visibilityCaption,
} from '@/lib/calendar/visibility';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

type Mode = 'create' | 'edit' | 'view';

type Props = {
  visible: boolean;
  mode: Mode;
  seat: CalendarSeat;
  eventId?: string | null;
  classId?: string | null;
  childStudentId?: string | null;
  /** Calendars the seat can see; composer offers only the ones it controls. */
  layers?: CalendarLayer[];
  /** Phase E Ask parked draft — CR-A Review, not saved until Save. */
  initialDraft?: PendingCalendarDraft | null;
  onClose: () => void;
  onSaved: () => void;
};

type Draft = {
  kind: CalendarEventKind;
  /** Class calendar target when kind === 'class'. */
  classId: string | null;
  title: string;
  startDate: string | null;
  endDate: string | null;
  allDay: boolean;
  startTime: string;
  endTime: string;
  category: string;
  body: string;
};

function emptyDraft(seat: CalendarSeat, classId?: string | null, childId?: string | null): Draft {
  const kind = defaultKindForSeat(seat, { classId, childStudentId: childId }) ?? 'personal';
  return {
    kind,
    classId: kind === 'class' ? classId ?? null : null,
    title: '',
    startDate: datePart(new Date().toISOString()),
    endDate: null,
    allDay: true,
    startTime: '09:00',
    endTime: '',
    category: categoriesForKind(kind)[0] ?? 'personal',
    body: '',
  };
}

function sameDraft(a: Draft, b: Draft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * CR-A lean (CAL-30): sheet/modal. Title, DATE-P1, all-day, kind, category, body,
 * AI draft banner, visibility, Calendar chip row (every calendar the seat controls). No Reminder/Travel/URL/
 * Attachments/Invitees/Alert/Repeat. Dirty dismiss confirms. Save commits.
 */
export function EventComposer({
  visible,
  mode,
  seat,
  eventId,
  classId,
  childStudentId,
  layers,
  initialDraft,
  onClose,
  onSaved,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const reduceMotion = useReducedMotion();
  const phone = layout.isPhone && Platform.OS !== 'web';
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(seat, classId, childStudentId));
  const [baseline, setBaseline] = useState<Draft>(() => emptyDraft(seat, classId, childStudentId));
  const [caption, setCaption] = useState('');
  const [readOnly, setReadOnly] = useState(mode === 'view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fromAsk, setFromAsk] = useState(false);
  const sheetY = useRef(new Animated.Value(phone ? 24 : 0)).current;
  const sheetOpacity = useRef(new Animated.Value(1)).current;

  const dirty = !sameDraft(draft, baseline);
  // CAL-COMPOSE-TARGETS: every calendar this seat controls (each class a teacher
  // teaches; never School for a teacher). Server re-checks on Save.
  const targets = useMemo(
    () => composerTargets(seat, layers ?? [], { classId, childStudentId }),
    [seat, layers, classId, childStudentId],
  );
  const selectedTargetKey = composerTargetKey(draft.kind, draft.classId);
  const cats = categoriesForKind(draft.kind);

  useEffect(() => {
    if (!visible) return;
    sheetY.setValue(phone ? 28 : 0);
    sheetOpacity.setValue(reduceMotion ? 0 : 1);
    if (reduceMotion) {
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (phone) {
      Animated.spring(sheetY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, phone, reduceMotion, sheetY, sheetOpacity]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setLoadError(null);
    setDiscardOpen(false);
    if (mode === 'create' || !eventId) {
      // CAL-P6-10B: slot create may pass initialDraft with empty title + day/time prefill.
      if (initialDraft) {
        const base = emptyDraft(seat, classId, childStudentId);
        const askTitle = String(initialDraft.title ?? '').trim();
        const fromAskDraft = initialDraft.source === 'ai_nl' && Boolean(askTitle);
        const next: Draft = fromAskDraft
          ? {
              kind: initialDraft.kind,
              classId:
                initialDraft.kind === 'class' ? initialDraft.classId ?? classId ?? null : null,
              title: askTitle,
              startDate: initialDraft.startDate,
              endDate: initialDraft.endDate,
              allDay: initialDraft.allDay,
              startTime: initialDraft.startTime,
              endTime: initialDraft.endTime,
              category: initialDraft.category,
              body: initialDraft.body,
            }
          : {
              ...base,
              startDate: initialDraft.startDate ?? base.startDate,
              endDate: initialDraft.endDate ?? initialDraft.startDate ?? base.endDate,
              allDay: initialDraft.allDay,
              startTime: initialDraft.startTime || base.startTime,
              endTime: initialDraft.endTime || '',
              title: '',
            };
        setDraft(next);
        setBaseline(fromAskDraft ? emptyDraft(seat, classId, childStudentId) : next);
        setReadOnly(false);
        setFromAsk(fromAskDraft);
        setCaption(visibilityCaption(scopeForKind(next.kind), next.category));
        return;
      }
      const next = emptyDraft(seat, classId, childStudentId);
      setDraft(next);
      setBaseline(next);
      setReadOnly(false);
      setFromAsk(false);
      setCaption(visibilityCaption(scopeForKind(next.kind), next.category));
      return;
    }
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        const detail = await getCalendarEvent({
          seat,
          id: eventId,
          classId,
          childStudentId,
        });
        if (cancelled) return;
        if (!detail) {
          setLoadError('Event not found.');
          return;
        }
        const kind: CalendarEventKind =
          detail.category === 'absence' || detail.visibilityScope === 'student_teachers'
            ? 'absence'
            : detail.visibilityScope === 'school'
              ? 'school'
              : detail.visibilityScope === 'class'
                ? 'class'
                : 'personal';
        const next: Draft = {
          kind,
          classId: kind === 'class' ? detail.classId ?? null : null,
          title: detail.title,
          startDate: datePart(detail.startsAt),
          endDate: datePart(detail.endsAt),
          allDay: detail.allDay,
          startTime: timePart(detail.startsAt) ?? '09:00',
          endTime: timePart(detail.endsAt) ?? '',
          category: detail.category,
          body: detail.body ?? '',
        };
        setDraft(next);
        setBaseline(next);
        setCaption(detail.visibilityCaption || visibilityCaption(detail.visibilityScope, detail.category));
        setReadOnly(mode === 'view' || !detail.canEdit);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load event');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, mode, eventId, seat, classId, childStudentId, initialDraft]);

  const heading = useMemo(() => {
    if (mode === 'create' && fromAsk) return REVIEW_DRAFT_BANNER;
    if (mode === 'create') return 'New event';
    if (readOnly) return 'Event';
    return 'Edit event';
  }, [mode, readOnly, fromAsk]);

  const requestClose = () => {
    if (dirty && !readOnly) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  const setTarget = (target: ComposerTarget) => {
    const kind = target.kind;
    const category =
      kind === draft.kind ? draft.category : categoriesForKind(kind)[0] ?? draft.category;
    setDraft((cur) => ({ ...cur, kind, classId: target.classId, category }));
    setCaption(visibilityCaption(scopeForKind(kind), category));
  };

  const save = async () => {
    if (readOnly) {
      onClose();
      return;
    }
    if (!draft.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!draft.startDate) {
      setError('Start is required');
      return;
    }
    if (draft.kind === 'absence' && !childStudentId) {
      setError('Pick a child before adding an absence');
      return;
    }
    if (draft.kind === 'class' && !draft.classId) {
      setError('Pick a class calendar for this event');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const startsAt = composeEventInstant(draft.startDate, draft.startTime, draft.allDay);
      const endsAt = draft.endDate
        ? composeEventInstant(draft.endDate, draft.endTime || draft.startTime, draft.allDay)
        : null;
      if (mode === 'edit' && eventId) {
        await updateCalendarEvent({
          seat,
          id: eventId,
          title: draft.title.trim(),
          startsAt,
          endsAt,
          allDay: draft.allDay,
          category: draft.category,
          body: draft.body,
        });
      } else {
        await createCalendarEvent({
          seat,
          kind: draft.kind,
          title: draft.title.trim(),
          startsAt,
          endsAt,
          allDay: draft.allDay,
          category: draft.category,
          body: draft.body,
          classId: draft.kind === 'class' ? draft.classId : null,
          childStudentId: draft.kind === 'absence' ? childStudentId : null,
          source: fromAsk ? 'ai_nl' : 'manual',
        });
      }
      setBaseline(draft);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const modalAnimation = reduceMotion ? 'fade' : phone ? 'slide' : 'fade';

  return (
    <>
      <Modal
        visible={visible}
        animationType={modalAnimation}
        presentationStyle={phone ? (Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen') : 'overFullScreen'}
        transparent={!phone}
        onRequestClose={requestClose}
      >
        <KeyboardAvoidingView
          style={[
            styles.root,
            !phone && styles.webRoot,
            { backgroundColor: phone ? colors.bg : 'rgba(26,22,18,0.40)' },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {!phone ? (
            <Pressable style={styles.scrim} onPress={requestClose} accessibilityLabel="Dismiss" />
          ) : null}
          <Animated.View
            style={[
              phone ? styles.sheet : styles.modal,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                paddingTop: phone && Platform.OS !== 'ios' ? insets.top : phone ? 12 : 0,
                opacity: sheetOpacity,
                transform: phone && !reduceMotion ? [{ translateY: sheetY }] : undefined,
              },
            ]}
          >
            <View style={[styles.header, { borderBottomColor: colors.line }]}>
              <Text
                style={[styles.title, { color: colors.ink }]}
                numberOfLines={1}
                accessibilityRole="header"
              >
                {heading}
              </Text>
              <GhostButton align="left" label={readOnly ? 'Close' : 'Discard'} onPress={requestClose} />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.body, { paddingBottom: 24 + insets.bottom }]}
            >
              {loadError ? (
                <Text style={[styles.error, { color: colors.danger }]}>{loadError}</Text>
              ) : null}

              {fromAsk ? (
                <Text style={[styles.askBanner, { color: colors.mute, borderColor: colors.line }]}>
                  {REVIEW_DRAFT_BANNER}. Nothing is on the calendar until you Save.
                </Text>
              ) : null}

              {/* CAL-COMPOSE-TARGETS: one chip per calendar you control, one scrollable row. */}
              {mode === 'create' && targets.length > 0 ? (
                <View style={styles.block}>
                  <Text style={[styles.label, { color: colors.mute }]}>Calendar</Text>
                  <ChipRow>
                    {targets.map((target) => {
                      const selected = selectedTargetKey === target.key;
                      const tintColor = roleTintColor(target.roleTint, colors);
                      return (
                        <Pressable
                          key={target.key}
                          disabled={readOnly}
                          onPress={() => !readOnly && setTarget(target)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`Calendar ${target.label}`}
                          style={[
                            styles.calChip,
                            {
                              borderColor: selected ? tintColor : colors.line,
                              backgroundColor: selected ? colors.wash : colors.elevated,
                            },
                          ]}
                        >
                          <View style={[styles.calDot, { backgroundColor: tintColor }]} />
                          <Text style={[styles.calLabel, { color: colors.ink }]} numberOfLines={1}>
                            {target.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ChipRow>
                </View>
              ) : null}

              <TextField
                label="Title"
                value={draft.title}
                onChangeText={(title) => setDraft((cur) => ({ ...cur, title }))}
                editable={!readOnly}
                placeholder="Event title"
              />

              <DateInput
                label="Start"
                value={draft.startDate}
                onChange={(startDate) => setDraft((cur) => ({ ...cur, startDate }))}
                required
                clearable={false}
                disabled={readOnly}
              />

              <DateInput
                label="End (optional)"
                value={draft.endDate}
                onChange={(endDate) => setDraft((cur) => ({ ...cur, endDate }))}
                clearable
                disabled={readOnly}
              />

              <View style={styles.switchRow}>
                <Text style={[type.body, { color: colors.ink, flex: 1 }]}>All day</Text>
                <Switch
                  value={draft.allDay}
                  disabled={readOnly}
                  onValueChange={(allDay) => setDraft((cur) => ({ ...cur, allDay }))}
                  accessibilityLabel="All day"
                />
              </View>

              {!draft.allDay ? (
                <>
                  <TextField
                    label="Start time"
                    value={draft.startTime}
                    onChangeText={(startTime) => setDraft((cur) => ({ ...cur, startTime }))}
                    editable={!readOnly}
                    placeholder="09:00"
                  />
                  <TextField
                    label="End time (optional)"
                    value={draft.endTime}
                    onChangeText={(endTime) => setDraft((cur) => ({ ...cur, endTime }))}
                    editable={!readOnly}
                    placeholder="10:00"
                  />
                </>
              ) : null}

              {cats.length > 1 && !readOnly ? (
                <View style={styles.block}>
                  <Text style={[styles.label, { color: colors.mute }]}>Category</Text>
                  <ChipRow>
                    {cats.map((category) => (
                      <Chip
                        key={category}
                        label={category}
                        selected={draft.category === category}
                        onPress={() => {
                          setDraft((cur) => ({ ...cur, category }));
                          setCaption(visibilityCaption(scopeForKind(draft.kind), category));
                        }}
                      />
                    ))}
                  </ChipRow>
                </View>
              ) : (
                <Text style={[type.meta, { color: colors.mute }]}>Category · {draft.category}</Text>
              )}

              <View style={[styles.caption, { borderColor: colors.line, backgroundColor: colors.wash }]}>
                <Text style={[styles.label, { color: colors.mute }]}>Who can see this</Text>
                <Text style={[type.body, { color: colors.ink }]}>{caption}</Text>
              </View>

              <TextField
                label="Notes"
                value={draft.body}
                onChangeText={(body) => setDraft((cur) => ({ ...cur, body }))}
                editable={!readOnly}
                multiline
                placeholder="Optional details"
              />

              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

              {!readOnly ? (
                <PrimaryButton
                  label={busy ? 'Saving…' : 'Save'}
                  disabled={busy}
                  onPress={() => void save()}
                />
              ) : null}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <CalendarConfirm
        visible={discardOpen}
        title="Discard draft?"
        body="This event is not saved. Discard drops the draft."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          setDraft(baseline);
          onClose();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webRoot: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrim: { ...StyleSheet.absoluteFill },
  sheet: { flex: 1 },
  modal: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 52,
    borderBottomWidth: 1,
    gap: 8,
  },
  title: { ...type.title, flex: 1, fontSize: 18 },
  body: { padding: 16, gap: 12 },
  block: { gap: 6 },
  label: { ...type.meta, textTransform: 'uppercase' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 12,
  },
  caption: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  askBanner: {
    ...type.meta,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  calChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
  },
  calDot: { width: 10, height: 10, borderRadius: 5 },
  calLabel: { ...type.meta, fontWeight: '600' },
  error: type.body,
});
