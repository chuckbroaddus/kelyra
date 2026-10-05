import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { captureBadge, practiceBadge } from '@/components/ui/Badge';
import { GhostButton, SecondaryButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { WorkRow } from '@/components/ui/WorkRow';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { FormSheet } from '@/components/ui/FormSheet';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  attachCapture,
  listInbox,
  listTurnedIn,
  signInboxThumbs,
  type InboxItem,
  type TurnedInItem,
} from '@/lib/captures/api';
import { deleteCapture } from '@/lib/captures/delete';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import {
  abandonIngestBatch,
  listIngestWaitingSplit,
  type WaitingSplitRow,
} from '@/lib/ingest/api';
import { INGEST_COPY, waitingSplitSourceLabel } from '@/lib/ingest/copy';
import { resolveCaptureClass } from '@/lib/classes/api';
import { formatWhen } from '@/lib/format';
import { markNoteOnly, processQueuedDrafts } from '@/lib/gaps/api';
import { practiceTitle } from '@/lib/practice/api';
import { submissionReviewPath } from '@/lib/practice/review';
import { listRoster, type RosterStudent } from '@/lib/students/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

type DeskEntry =
  | { kind: 'waiting'; row: WaitingSplitRow; at: string }
  | { kind: 'capture'; item: InboxItem; at: string }
  | { kind: 'turned'; item: TurnedInItem; at: string };

export default function InboxScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const chrome = useChrome();
  const { contextTab, classId: chromeClassId, refreshNeedsBadge } = chrome;
  const teachSeat = chrome.role === 'teacher';
  const { teacher, setActiveClassId } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [turned, setTurned] = useState<TurnedInItem[]>([]);
  const [waiting, setWaiting] = useState<WaitingSplitRow[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  /**
   * Desk settled enough to clear WorkingLine (PERF-07/08 + Back to Needs).
   * Set true as soon as teacher-wide waiting-split returns — class lists may fill later.
   */
  const [rowsReady, setRowsReady] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [pending, setPending] = useState<InboxItem | null>(null);
  const [notePending, setNotePending] = useState<InboxItem | null>(null);
  const [dismissPending, setDismissPending] = useState<WaitingSplitRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const loadGen = useRef(0);
  const rosterForClass = useRef<string | null>(null);
  /** Class that owns currently painted items/turned — soft-refresh only when unchanged (US-PERF-05). */
  const rowsClassIdRef = useRef('');

  const ensureRoster = useCallback(async (forClassId: string) => {
    if (!forClassId) return;
    if (rosterForClass.current === forClassId) return;
    setRosterLoading(true);
    try {
      const next = await listRoster(forClassId);
      setRoster(next);
      rosterForClass.current = forClassId;
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load roster');
    } finally {
      setRosterLoading(false);
    }
  }, []);

  const openAssign = useCallback(
    (captureId: string) => {
      setPicking(captureId);
      if (classId) void ensureRoster(classId);
    },
    [classId, ensureRoster],
  );

  const load = useCallback(async () => {
    // Back to Needs remounts with rowsReady=false — never leave WorkingLine stuck.
    if (!teacher) {
      setRowsReady(true);
      return;
    }
    const gen = ++loadGen.current;
    try {
      // NR-A: teacher-wide waiting-split first — desk must not wait on class resolve.
      // Do not re-fetch the auth teacher row here: a new object identity retriggers this
      // focus load callback and leaves the pencil spinning after Back to Needs.
      let waitingRows: WaitingSplitRow[] = [];
      if (teachSeat) {
        try {
          waitingRows = await listIngestWaitingSplit();
        } catch {
          waitingRows = [];
        }
      }
      if (gen !== loadGen.current) return;
      setWaiting(waitingRows);
      // Show waiting rows immediately; class-scoped inbox fills in below.
      setRowsReady(true);
      setStatus(null);

      // PERF-01/02: use existing teacher/chrome classId; do not re-fetch auth teacher on focus.
      let resolvedId = (chromeClassId || teacher.active_class_id || '').trim();
      if (!resolvedId) {
        try {
          const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id, chromeClassId);
          if (gen !== loadGen.current) return;
          resolvedId = klass.id;
          setActiveClassId(klass.id);
        } catch (classErr) {
          // Pre-split rows still show without an active class.
          setItems([]);
          setTurned([]);
          if (!waitingRows.length) {
            setStatus(classErr instanceof Error ? classErr.message : 'Could not load inbox');
          }
          return;
        }
      } else if (teacher.active_class_id !== resolvedId) {
        setActiveClassId(resolvedId);
      }

      // Class switch: drop prior-class rows before lists settle so Review cannot bind new classId to old ids.
      const classChanged = Boolean(rowsClassIdRef.current && rowsClassIdRef.current !== resolvedId);
      if (classChanged) {
        rowsClassIdRef.current = '';
        setItems([]);
        setTurned([]);
        // Waiting rows already painted — pencil stays off when waiting.length > 0.
        setRowsReady(false);
        setPicking(null);
        setPending(null);
        setNotePending(null);
      }
      setClassId(resolvedId);
      if (rosterForClass.current && rosterForClass.current !== resolvedId) {
        rosterForClass.current = null;
        setRoster([]);
      }
      // Soft refresh keeps prior rows only for the same classId (PERF-07/08); never flash empty on same-class refocus.
      const [captures, completed] = await Promise.all([
        listInbox(resolvedId, { signThumbs: false }),
        listTurnedIn(resolvedId),
      ]);
      if (gen !== loadGen.current) return;
      rowsClassIdRef.current = resolvedId;
      setItems(captures);
      setTurned(completed);
      // classChanged may have cleared rowsReady — restore once lists settle (QG-02 empty ≠ loading).
      setRowsReady(true);

      // PERF-06: thumbs after first WorkRow-capable paint.
      void signInboxThumbs(captures).then((withThumbs) => {
        if (gen !== loadGen.current) return;
        if (rowsClassIdRef.current !== resolvedId) return;
        setItems(withThumbs);
      });
    } catch (err) {
      if (gen !== loadGen.current) return;
      setStatus(err instanceof Error ? err.message : 'Could not load inbox');
      setRowsReady(true);
    }
  }, [teacher, chromeClassId, teachSeat, setActiveClassId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const queued = items.filter(
    (item) =>
      item.ai_status === 'pending' ||
      item.ai_status === 'running' ||
      (item.model_draft as { pending?: boolean } | null)?.pending,
  ).length;

  const onDraftQueued = async () => {
    setDrafting(true);
    setStatus(null);
    try {
      const result = await processQueuedDrafts();
      setStatus(result.processed ? `Drafted ${result.processed} queued page${result.processed === 1 ? '' : 's'}.` : 'Nothing queued.');
      refreshNeedsBadge();
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not draft queued pages');
    } finally {
      setDrafting(false);
    }
  };

  const needsName = items.filter((item) => !item.student_id);
  const toReview = items.filter((item) => Boolean(item.student_id));
  const chip = contextTab === 'name' || contextTab === 'review' ? contextTab : 'all';
  const visible = chip === 'name' ? needsName : chip === 'review' ? toReview : items;
  const visibleTurned = chip === 'name' ? [] : turned;

  const visibleRoster = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter((student) => student.display_name.toLowerCase().includes(needle));
  }, [filter, roster]);

  const onAssign = async (captureId: string, studentId: string) => {
    setStatus(null);
    try {
      await attachCapture(captureId, studentId);
      setPicking(null);
      refreshNeedsBadge();
      if (classId) router.push(`/class/${classId}/student/${studentId}`);
      else await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not assign student');
    }
  };

  const visibleWaiting = teachSeat && (chip === 'all' || !chip) ? waiting : [];
  const deskEntries = useMemo((): DeskEntry[] => {
    const entries: DeskEntry[] = [
      ...visibleWaiting.map((row) => ({ kind: 'waiting' as const, row, at: row.created_at })),
      ...visible.map((item) => ({ kind: 'capture' as const, item, at: item.created_at })),
      ...visibleTurned.map((item) => ({
        kind: 'turned' as const,
        item,
        at: item.submittedAt,
      })),
    ];
    entries.sort((a, b) => {
      const byTime = b.at.localeCompare(a.at);
      if (byTime !== 0) return byTime;
      const aId = a.kind === 'waiting' ? a.row.id : a.item.id;
      const bId = b.kind === 'waiting' ? b.row.id : b.item.id;
      return aId.localeCompare(bId);
    });
    return entries;
  }, [visibleWaiting, visible, visibleTurned]);

  const showWorking =
    !rowsReady && waiting.length === 0 && items.length === 0 && turned.length === 0;
  const showEmpty =
    rowsReady &&
    !status &&
    waiting.length === 0 &&
    items.length === 0 &&
    turned.length === 0;

  const photoFor = (studentId: string) => roster.find((row) => row.id === studentId)?.photoUrl;
  const turnedCopy = (item: TurnedInItem) => {
    const work = item.kind === 'lesson' ? item.title : practiceTitle(item.title);
    return `Completed ${work}`;
  };
  const waitingMeta = (row: WaitingSplitRow): string => {
    const parts = [waitingSplitSourceLabel(row.source_kind)];
    if (row.page_count != null && row.page_count > 0) {
      parts.push(INGEST_COPY.pagesCount(row.page_count));
    }
    parts.push(formatWhen(row.created_at));
    return parts.join(' · ');
  };

  const onDismissWaiting = async (row: WaitingSplitRow) => {
    setBusy(true);
    setStatus(null);
    try {
      await abandonIngestBatch(row.id);
      setDismissPending(null);
      setWaiting((prev) => prev.filter((b) => b.id !== row.id));
      refreshNeedsBadge();
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not dismiss stack');
    } finally {
      setBusy(false);
    }
  };

  if (!teacher) {
    return (
      <Screen>
        <Text style={[type.body, { color: colors.mute }]}>Sign in to see work that still needs a name.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {queued ? (
        <SecondaryButton
          label={drafting ? 'Drafting queued…' : `Draft queued (${queued})`}
          disabled={drafting}
          onPress={() => void onDraftQueued()}
        />
      ) : null}
      {showWorking ? <WorkingLine /> : null}
      {showEmpty ? (
        <View>
          <Text style={[styles.empty, { color: colors.mute }]}>
            Nothing waiting. Capture work, review it in Needs Attention, then Approve on the student page on web.
          </Text>
          {teachSeat ? (
            <GhostButton
              align="left"
              label={INGEST_COPY.entryNeeds}
              onPress={() => router.push('/capture')}
            />
          ) : null}
        </View>
      ) : null}
      {deskEntries.map((entry) => {
        if (entry.kind === 'waiting') {
          const row = entry.row;
          return (
            <WorkRow
              key={`waiting:${row.id}`}
              title={row.filename?.trim() || INGEST_COPY.stackFallbackTitle}
              meta={waitingMeta(row)}
              avatarName="?"
              unknown
              badge="waiting_split"
              onPress={() => router.push(`/split-stack?batch=${encodeURIComponent(row.id)}`)}
              pills={[
                {
                  key: 'split',
                  label: INGEST_COPY.splitStack,
                  kind: 'primary',
                  onPress: () => router.push(`/split-stack?batch=${encodeURIComponent(row.id)}`),
                },
                {
                  key: 'dismiss',
                  label: INGEST_COPY.dismiss,
                  kind: 'ghost',
                  onPress: () => setDismissPending(row),
                },
              ]}
              trailing={[
                {
                  key: 'split',
                  label: INGEST_COPY.splitStack,
                  tone: 'brand',
                  autoCommit: false,
                  onPress: () => router.push(`/split-stack?batch=${encodeURIComponent(row.id)}`),
                },
              ]}
              leading={[
                {
                  key: 'dismiss',
                  label: INGEST_COPY.dismiss,
                  tone: 'danger',
                  autoCommit: false,
                  onPress: () => setDismissPending(row),
                },
              ]}
            />
          );
        }
        if (entry.kind === 'turned') {
          const item = entry.item;
          return (
            <WorkRow
              key={item.id}
              title={item.studentName}
              status={turnedCopy(item)}
              meta={formatWhen(item.submittedAt)}
              avatarName={item.studentName}
              photoUrl={photoFor(item.studentId)}
              badge={practiceBadge(item.status)}
              onPress={() => {
                if (!classId) return;
                router.push(submissionReviewPath(classId, item.id) as never);
              }}
              pills={[
                {
                  key: 'open',
                  label: 'Review',
                  kind: 'primary',
                  onPress: () => {
                    if (!classId) return;
                    router.push(submissionReviewPath(classId, item.id) as never);
                  },
                },
              ]}
              trailing={[
                {
                  key: 'open',
                  label: 'Review',
                  tone: 'brand',
                  autoCommit: false,
                  onPress: () => {
                    if (!classId) return;
                    router.push(submissionReviewPath(classId, item.id) as never);
                  },
                },
              ]}
            />
          );
        }
        const item = entry.item;
        const unassigned = !item.student_id;
        return (
          <WorkRow
            key={item.id}
            title={item.matchedName ?? 'Needs a name'}
            status={item.transcript ? `Heard: ${item.transcript}` : undefined}
            meta={`${formatWhen(item.created_at)} · ${mediaLabel(item)}`}
            photoUrl={item.photoUrl}
            avatarName={item.matchedName ?? '?'}
            unknown={unassigned && !item.photoUrl}
            badge={captureBadge(item.status)}
            onPress={() =>
              item.student_id
                ? router.push(
                    `/class/${item.class_id}/student/${item.student_id}?capture=${item.id}&tab=focus`,
                  )
                : openAssign(item.id)
            }
            pills={
              unassigned
                ? [
                    { key: 'assign', label: 'Assign name', kind: 'primary', onPress: () => openAssign(item.id) },
                    { key: 'delete', label: 'Delete', kind: 'ghost', onPress: () => setPending(item) },
                  ]
                : [
                    {
                      key: 'review',
                      label: 'Review',
                      kind: 'primary',
                      onPress: () =>
                        router.push(
                          `/class/${item.class_id}/student/${item.student_id}?capture=${item.id}&tab=focus`,
                        ),
                    },
                    {
                      key: 'note',
                      label: 'Note only',
                      kind: 'ghost',
                      onPress: () => setNotePending(item),
                    },
                    {
                      key: 'delete',
                      label: 'Delete',
                      kind: 'ghost',
                      onPress: () => setPending(item),
                    },
                  ]
            }
            trailing={
              unassigned
                ? [
                    { key: 'assign', label: 'Assign', tone: 'brand', onPress: () => openAssign(item.id), autoCommit: false },
                  ]
                : [
                    {
                      key: 'review',
                      label: 'Review',
                      tone: 'brand',
                      autoCommit: false,
                      onPress: () =>
                        router.push(
                          `/class/${item.class_id}/student/${item.student_id}?capture=${item.id}&tab=focus`,
                        ),
                    },
                  ]
            }
            leading={[
              ...(unassigned
                ? []
                : [
                    {
                      key: 'note',
                      label: 'Note',
                      tone: 'wash' as const,
                      autoCommit: false,
                      onPress: () => setNotePending(item),
                    },
                  ]),
              {
                key: 'delete',
                label: 'Delete',
                tone: 'danger',
                autoCommit: false,
                onPress: () => setPending(item),
              },
            ]}
          />
        );
      })}
      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}
      <FormSheet visible={Boolean(picking)} title="Who is this?" onClose={() => setPicking(null)}>
            {rosterLoading && roster.length === 0 ? <WorkingLine /> : null}
            {roster.length > 8 ? (
              <TextField placeholder="Find a student" value={filter} onChangeText={setFilter} />
            ) : null}
            {visibleRoster.map((student) => (
              <ListRow
                key={student.id}
                title={student.display_name}
                photoUrl={student.photoUrl}
                onPress={() => picking && void onAssign(picking, student.id)}
              />
            ))}
            {!rosterLoading && roster.length > 8 && visibleRoster.length === 0 ? (
              <Text style={[type.meta, { color: colors.mute }]}>No names match that search.</Text>
            ) : null}
      </FormSheet>
      <ConfirmSheet
        visible={Boolean(notePending)}
        title="Keep this as a note?"
        body="It will not be a grade."
        confirmLabel="Keep as a note"
        photoUrl={notePending?.photoUrl}
        busy={busy}
        onCancel={() => setNotePending(null)}
        onConfirm={() => {
          if (!notePending) return;
          setBusy(true);
          void markNoteOnly(notePending.id)
            .then(() => {
              setNotePending(null);
              refreshNeedsBadge();
              return load();
            })
            .catch((err) => {
              setStatus(err instanceof Error ? err.message : 'Could not save note');
            })
            .finally(() => setBusy(false));
        }}
      />
      <ConfirmSheet
        visible={Boolean(pending)}
        title="Delete this work?"
        body="This removes the photo and is not a grade. This cannot be undone."
        confirmLabel="Delete"
        photoUrl={pending?.photoUrl}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          setBusy(true);
          void deleteCapture(pending.id)
            .then(() => {
              setPending(null);
              refreshNeedsBadge();
              return load();
            })
            .catch((err) => {
              setStatus(err instanceof Error ? err.message : 'Could not delete');
            })
            .finally(() => setBusy(false));
        }}
      />
      <ConfirmSheet
        visible={Boolean(dismissPending)}
        title={INGEST_COPY.dismiss}
        body={INGEST_COPY.dismissBody}
        confirmLabel={INGEST_COPY.dismiss}
        busy={busy}
        onCancel={() => setDismissPending(null)}
        onConfirm={() => {
          if (!dismissPending) return;
          void onDismissWaiting(dismissPending);
        }}
      />
    </Screen>
  );
}

function mediaLabel(item: InboxItem): string {
  const pages =
    item.pageCount > 1 ? `${item.pageCount} pages` : item.pageCount === 1 ? '1 page' : 'Voice note';
  // Text meta only — batch packets stay on the same WorkRow chrome as camera homework.
  if (item.input_source === 'batch') {
    return item.pageCount > 0 ? `${pages} · stack` : 'stack';
  }
  return pages;
}

const styles = StyleSheet.create({
  empty: {
    ...type.body,
    marginTop: 16,
  },
  error: {
    ...type.body,
    marginTop: 16,
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
});
