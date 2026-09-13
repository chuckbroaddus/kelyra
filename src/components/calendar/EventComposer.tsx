import { useEffect, useMemo, useState } from 'react';
import {
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
import type { CalendarEventKind, CalendarSeat } from '@/lib/calendar/types';
import {
  categoriesForKind,
  composeEventInstant,
  datePart,
  defaultKindForSeat,
  kindsForSeat,
  scopeForKind,
  timePart,
  visibilityCaption,
} from '@/lib/calendar/visibility';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Mode = 'create' | 'edit' | 'view';

type Props = {
  visible: boolean;
  mode: Mode;
  seat: CalendarSeat;
  eventId?: string | null;
  classId?: string | null;
  childStudentId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type Draft = {
  kind: CalendarEventKind;
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
 * CR-A: sheet on phone, modal on web. Title, start, optional end, all-day,
 * category, visibility caption, body. Dirty dismiss confirms. Save commits.
 */
export function EventComposer({
  visible,
  mode,
  seat,
  eventId,
  classId,
  childStudentId,
  onClose,
  onSaved,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const phone = layout.isPhone && Platform.OS !== 'web';
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(seat, classId, childStudentId));
  const [baseline, setBaseline] = useState<Draft>(() => emptyDraft(seat, classId, childStudentId));
  const [caption, setCaption] = useState('');
  const [readOnly, setReadOnly] = useState(mode === 'view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const dirty = !sameDraft(draft, baseline);
  const kinds = kindsForSeat(seat).filter((kind) => {
    if (kind === 'class' && !classId) return false;
    if (kind === 'absence' && !childStudentId) return false;
    return true;
  });
  const cats = categoriesForKind(draft.kind);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setLoadError(null);
    setDiscardOpen(false);
    if (mode === 'create' || !eventId) {
      const next = emptyDraft(seat, classId, childStudentId);
      setDraft(next);
      setBaseline(next);
      setReadOnly(false);
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
  }, [visible, mode, eventId, seat, classId, childStudentId]);

  const heading = useMemo(() => {
    if (mode === 'create') return 'New event';
    if (readOnly) return 'Event';
    return 'Edit event';
  }, [mode, readOnly]);

  const requestClose = () => {
    if (dirty && !readOnly) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  const setKind = (kind: CalendarEventKind) => {
    const category = categoriesForKind(kind)[0] ?? draft.category;
    setDraft((cur) => ({ ...cur, kind, category }));
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
    if (draft.kind === 'class' && !classId) {
      setError('Open a class before adding a class event');
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
          classId: draft.kind === 'class' ? classId : null,
          childStudentId: draft.kind === 'absence' ? childStudentId : null,
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

  return (
    <>
      <Modal
        visible={visible}
        animationType={phone ? 'slide' : 'fade'}
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
          <View
            style={[
              phone ? styles.sheet : styles.modal,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                paddingTop: phone && Platform.OS !== 'ios' ? insets.top : phone ? 12 : 0,
              },
            ]}
          >
            <View style={[styles.header, { borderBottomColor: colors.line }]}>
              <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
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

              {mode === 'create' && kinds.length > 1 ? (
                <View style={styles.block}>
                  <Text style={[styles.label, { color: colors.mute }]}>Type</Text>
                  <ChipRow>
                    {kinds.map((kind) => (
                      <Chip
                        key={kind}
                        label={kind === 'absence' ? 'Absence' : kind[0]!.toUpperCase() + kind.slice(1)}
                        selected={draft.kind === kind}
                        onPress={() => !readOnly && setKind(kind)}
                      />
                    ))}
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
          </View>
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
  scrim: { ...StyleSheet.absoluteFillObject },
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
  error: type.body,
});
