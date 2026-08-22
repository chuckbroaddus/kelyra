import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { AssignmentMark } from '@/components/ui/AssignmentMark';
import { ClassTabs } from '@/components/ui/ClassTabs';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { PrimaryButton } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { Screen } from '@/components/ui/Screen';
import { WorkRow } from '@/components/ui/WorkRow';
import { type } from '@/constants/theme';
import { assignmentSubtitle, dueLabel, listClassAssignments } from '@/lib/assignments/api';
import { GRADE_KINDS, gradeKindLabel, weightSummary } from '@/lib/grade/marks';
import { deleteAssignment } from '@/lib/practice/delete';
import type { AssignmentRow } from '@/lib/supabase/types';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { WorkingLine } from '@/components/ui/WorkingMark';

export default function AssignmentsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { className } = useChrome();
  usePushedTitle(className ?? 'Class');
  const [rows, setRows] = useState<AssignmentRow[] | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<AssignmentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    void listClassAssignments(id)
      .then(setRows)
      .catch((err) => setStatus(err instanceof Error ? err.message : 'Could not load assignments'));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(() => {
    if (!rows) return [];
    if (filter === 'all') return rows;
    return rows.filter((row) => (row.category ?? 'homework') === filter);
  }, [filter, rows]);

  const soon = useMemo(() => {
    if (!rows) return [];
    const now = Date.now();
    return rows
      .filter((row) => row.due_at && new Date(row.due_at).getTime() >= now)
      .slice(0, 8);
  }, [rows]);

  return (
    <Screen
      maxWidth={720}
      sticky={<PrimaryButton label="New assignment" onPress={() => router.push(`/class/${id}/assignment/new` as never)} />}
    >
      {id ? <ClassTabs classId={id} /> : null}
      {soon.length ? (
        <>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Coming due</Text>
          <ChipRow>
            {soon.map((row) => (
              <Chip
                key={row.id}
                label={`${row.title} · ${row.due_at ? dueLabel(row.due_at) : ''}`}
                onPress={() => router.push(`/class/${id}/assignment/${row.id}` as never)}
              />
            ))}
          </ChipRow>
        </>
      ) : null}
      <ChipRow>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {GRADE_KINDS.map((kind) => (
          <Chip key={kind.key} label={kind.label} selected={filter === kind.key} onPress={() => setFilter(kind.key)} />
        ))}
      </ChipRow>
      {rows == null ? <WorkingLine /> : null}
      {rows && visible.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          {filter === 'all' ? 'No assignments yet. Create one — the column shows up empty until work is in.' : `No ${gradeKindLabel(filter)} yet.`}
        </Text>
      ) : null}
      {visible.map((row) => {
        const weight = weightSummary(row);
        return (
          <WorkRow
            key={row.id}
            title={row.title}
            status={assignmentSubtitle(row)}
            meta={weight || undefined}
            lead={<AssignmentMark category={row.category} size={48} />}
            badge="assigned"
            onPress={() => router.push(`/class/${id}/assignment/${row.id}` as never)}
            pills={[
              {
                key: 'open',
                label: 'Open',
                kind: 'primary',
                onPress: () => router.push(`/class/${id}/assignment/${row.id}` as never),
              },
              {
                key: 'book',
                label: 'Grade book',
                kind: 'secondary',
                onPress: () => router.push(`/class/${id}/gradebook` as never),
              },
              {
                key: 'delete',
                label: 'Delete',
                kind: 'ghost',
                onPress: () => setPending(row),
              },
            ]}
            trailing={[
              {
                key: 'open',
                label: 'Open',
                tone: 'brand',
                autoCommit: false,
                onPress: () => router.push(`/class/${id}/assignment/${row.id}` as never),
              },
            ]}
            leading={[
              {
                key: 'delete',
                label: 'Delete',
                tone: 'danger',
                autoCommit: false,
                onPress: () => setPending(row),
              },
            ]}
          />
        );
      })}
      {status ? <Text style={[type.body, { color: colors.danger }]}>{status}</Text> : null}
      <PhaseBanner
        phase={3}
        compact
        detail="Swipe a row to delete. Tap to edit. The grade book already has the column."
      />
      <ConfirmSheet
        visible={Boolean(pending)}
        title={`Delete ${pending?.title ?? 'this assignment'}?`}
        body="Every mark in this column goes away. This cannot be undone."
        confirmLabel="Delete assignment"
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          setBusy(true);
          void deleteAssignment(pending.id)
            .then(() => {
              setPending(null);
              load();
            })
            .catch((err) => setStatus(err instanceof Error ? err.message : 'Could not delete'))
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...type.body,
    marginTop: 8,
  },
});
