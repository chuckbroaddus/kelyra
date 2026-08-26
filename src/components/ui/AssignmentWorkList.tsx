import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AssignmentMark } from '@/components/ui/AssignmentMark';
import { practiceBadge, type BadgeVariant } from '@/components/ui/Badge';
import { GhostButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { WorkRow } from '@/components/ui/WorkRow';
import { type } from '@/constants/theme';
import { comingDueAssignments, matchesAssignmentFilter } from '@/lib/assignments/filter';
import { submissionStatusLabel } from '@/lib/assignments/status';
import {
  dueLabel,
  listClassAssignments,
  listStudentClassWork,
  workKindLabel,
} from '@/lib/assignments/api';
import { GRADE_KINDS, gradeKindLabel, weightSummary } from '@/lib/grade/marks';
import { listClassLessonCounts } from '@/lib/lessons/api';
import { lessonWorkLabel } from '@/lib/lessons/protocol';
import { deleteAssignment } from '@/lib/practice/delete';
import type { AssignmentRow, SubmissionRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  classId: string;
  studentId?: string;
  renderAfter?: (filter: string) => ReactNode;
};

/** Same cabinet on class Assignments and student Work: All + grade-kind chips, same rows. */
export function AssignmentWorkList({ classId, studentId, renderAfter }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<AssignmentRow[] | null>(null);
  const [subs, setSubs] = useState<Record<string, SubmissionRow>>({});
  const [lessonCounts, setLessonCounts] = useState<Record<string, { done: number; total: number }>>({});
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<AssignmentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void (async () => {
      if (studentId) {
        const items = await listStudentClassWork(classId, studentId);
        setRows(items.map((item) => item.assignment));
        setSubs(Object.fromEntries(items.map((item) => [item.assignment.id, item.submission])));
        setLessonCounts({});
        return;
      }
      const next = await listClassAssignments(classId);
      setRows(next);
      setSubs({});
      if (next.some((row) => row.kind === 'lesson')) {
        setLessonCounts(await listClassLessonCounts(classId).catch(() => ({})));
      } else {
        setLessonCounts({});
      }
    })().catch((err) => {
      setStatus(err instanceof Error ? err.message : 'Could not load assignments');
      setRows([]);
    });
  }, [classId, studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(() => {
    if (!rows) return [];
    return rows.filter((row) => matchesAssignmentFilter(row, filter));
  }, [filter, rows]);

  const soon = useMemo(() => (rows ? comingDueAssignments(rows) : []), [rows]);
  const extra = renderAfter?.(filter) ?? null;
  const assignHref = studentId
    ? `/class/${classId}/assignment/new?student=${studentId}`
    : `/class/${classId}/assignment/new`;

  return (
    <>
      <GhostButton align="left" label="Assign" onPress={() => router.push(assignHref as never)} />
      {soon.length ? (
        <>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Coming due</Text>
          <ChipRow>
            {soon.map((row) => (
              <Chip
                key={row.id}
                label={`${row.title} · ${row.due_at ? dueLabel(row.due_at) : ''}`}
                onPress={() => router.push(`/class/${classId}/assignment/${row.id}` as never)}
              />
            ))}
          </ChipRow>
        </>
      ) : null}
      <ChipRow>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {GRADE_KINDS.map((kind) => (
          <Chip
            key={kind.key}
            label={kind.label}
            selected={filter === kind.key}
            onPress={() => setFilter(kind.key)}
          />
        ))}
      </ChipRow>
      {rows == null ? <WorkingLine /> : null}
      {rows && visible.length === 0 && extra == null ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          {filter === 'all'
            ? 'No work assigned yet. Assign a lesson or practice — the column shows up empty until work is in.'
            : `No ${gradeKindLabel(filter)} yet.`}
        </Text>
      ) : null}
      {visible.map((row) => {
        const weight = weightSummary(row);
        const lessonCount = row.kind === 'lesson' ? lessonCounts[row.id] : null;
        const lessonStatus =
          lessonCount && lessonCount.total ? `${lessonCount.done}/${lessonCount.total} done` : null;
        const extraStatus = studentId ? studentWorkExtras(row, subs[row.id]) : null;
        const openSheet = () => router.push(`/class/${classId}/assignment/${row.id}` as never);
        const previewLesson = () => router.push(`/lesson/${row.id}?preview=1` as never);
        const kind = workKindLabel(row.kind);
        return (
          <WorkRow
            key={row.id}
            title={row.title}
            status={
              extraStatus?.status ??
              ([row.due_at ? dueLabel(row.due_at) : null, lessonStatus].filter(Boolean).join(' · ') || undefined)
            }
            meta={weight || undefined}
            lead={<AssignmentMark category={row.category} size={48} />}
            badge={extraStatus?.badge ?? 'assigned'}
            pills={[
              { key: 'kind', label: kind, kind: 'secondary', onPress: openSheet },
              ...(row.kind === 'lesson'
                ? [
                    { key: 'preview', label: 'Preview', kind: 'secondary' as const, onPress: previewLesson },
                    { key: 'open', label: 'Open', kind: 'primary' as const, onPress: previewLesson },
                  ]
                : [
                    {
                      key: 'open',
                      label: 'Open',
                      kind: 'primary' as const,
                      onPress: openSheet,
                    },
                  ]),
              {
                key: 'book',
                label: 'Grade book',
                kind: 'secondary',
                onPress: () => router.push(`/class/${classId}/gradebook` as never),
              },
              {
                key: 'delete',
                label: 'Delete',
                kind: 'ghost',
                onPress: () => setPending(row),
              },
            ]}
            trailing={[
              row.kind === 'lesson'
                ? {
                    key: 'preview',
                    label: 'Preview',
                    tone: 'brand' as const,
                    autoCommit: false,
                    onPress: previewLesson,
                  }
                : {
                    key: 'open',
                    label: 'Open',
                    tone: 'brand' as const,
                    autoCommit: false,
                    onPress: openSheet,
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
      {extra}
      {status ? <Text style={[type.body, { color: colors.danger }]}>{status}</Text> : null}
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
    </>
  );
}

function studentWorkExtras(
  row: AssignmentRow,
  submission: SubmissionRow | undefined,
): { status?: string; badge: BadgeVariant } | null {
  if (!submission) return null;
  const due = row.due_at ? dueLabel(row.due_at) : null;
  if (row.kind === 'lesson') {
    const label = lessonWorkLabel(submission.status, submission.answers);
    return {
      status: [label, due ? `Due ${due}` : null].filter(Boolean).join(' · ') || undefined,
      badge: practiceBadge(submission.status),
    };
  }
  const label = submissionStatusLabel(submission.status) || 'Assigned';
  return {
    status: [label, due].filter(Boolean).join(' · ') || undefined,
    badge: practiceBadge(submission.status),
  };
}

const styles = StyleSheet.create({
  empty: {
    ...type.body,
    marginTop: 8,
  },
});
