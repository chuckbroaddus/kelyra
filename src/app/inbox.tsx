import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { captureBadge } from '@/components/ui/Badge';
import { SecondaryButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { WorkRow } from '@/components/ui/WorkRow';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { FormSheet } from '@/components/ui/FormSheet';
import { useAuth } from '@/lib/auth/AuthProvider';
import { attachCapture, listInbox, type InboxItem } from '@/lib/captures/api';
import { deleteCapture } from '@/lib/captures/delete';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { resolveCaptureClass } from '@/lib/classes/api';
import { formatWhen } from '@/lib/format';
import { markNoteOnly, processQueuedDrafts } from '@/lib/gaps/api';
import { listRoster, type RosterStudent } from '@/lib/students/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function InboxScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { contextTab } = useChrome();
  const { teacher } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [pending, setPending] = useState<InboxItem | null>(null);
  const [notePending, setNotePending] = useState<InboxItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const load = useCallback(async () => {
    if (!teacher) return;
    try {
      const klass = await resolveCaptureClass(teacher.id, teacher.active_class_id);
      setClassId(klass.id);
      setRoster(await listRoster(klass.id));
      setItems(await listInbox(klass.id));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load inbox');
    } finally {
      setLoaded(true);
    }
  }, [teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const queued = items.filter((item) => item.ai_status === 'pending' || (item.model_draft as { pending?: boolean } | null)?.pending).length;

  const onDraftQueued = async () => {
    setDrafting(true);
    setStatus(null);
    try {
      const result = await processQueuedDrafts();
      setStatus(result.processed ? `Drafted ${result.processed} queued page${result.processed === 1 ? '' : 's'}.` : 'Nothing queued.');
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
      if (classId) router.push(`/class/${classId}/student/${studentId}`);
      else await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not assign student');
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
      {!loaded ? <WorkingLine /> : null}
      {loaded && items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          Nothing waiting. Work without a clear name lands here.
        </Text>
      ) : null}
      {visible.map((item) => {
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
                ? router.push(`/class/${item.class_id}/student/${item.student_id}`)
                : setPicking(item.id)
            }
            pills={
              unassigned
                ? [
                    { key: 'assign', label: 'Assign name', kind: 'primary', onPress: () => setPicking(item.id) },
                    { key: 'delete', label: 'Delete', kind: 'ghost', onPress: () => setPending(item) },
                  ]
                : [
                    {
                      key: 'review',
                      label: 'Review',
                      kind: 'primary',
                      onPress: () => router.push(`/class/${item.class_id}/student/${item.student_id}`),
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
                    { key: 'assign', label: 'Assign', tone: 'brand', onPress: () => setPicking(item.id), autoCommit: false },
                  ]
                : [
                    {
                      key: 'review',
                      label: 'Review',
                      tone: 'brand',
                      autoCommit: false,
                      onPress: () => router.push(`/class/${item.class_id}/student/${item.student_id}`),
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
      <PhaseBanner
        phase={2}
        compact
        detail="Work without a clear name waits here. Matching never creates a student."
      />

      <FormSheet visible={Boolean(picking)} title="Who is this?" onClose={() => setPicking(null)}>
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
            {roster.length > 8 && visibleRoster.length === 0 ? (
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
              return load();
            })
            .catch((err) => {
              setStatus(err instanceof Error ? err.message : 'Could not delete');
            })
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

function mediaLabel(item: InboxItem): string {
  if (item.pageCount > 1) return `${item.pageCount} pages`;
  if (item.pageCount === 1) return '1 page';
  return 'Voice note';
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
