import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Heatmap } from '@/components/Heatmap';
import { Avatar } from '@/components/ui/Avatar';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton } from '@/components/ui/Button';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { Screen } from '@/components/ui/Screen';
import { StickyTable } from '@/components/ui/StickyTable';
import { studentHead } from '@/constants/table';
import { radius, type } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { loadClassOverview, type ClassOverview } from '@/lib/classes/overview';
import { cellTone, formatCell, gradeCell, loadGradebook, type Gradebook } from '@/lib/gradebook/api';
import { deleteAssignment, deleteSubmission } from '@/lib/practice/delete';
import {
  buildAssignmentTree,
  defaultExpandedIds,
  flattenBookTree,
  type BookNode,
} from '@/lib/assignments/tree';
import { firstName } from '@/lib/format';
import { exportGradebookCsv } from '@/lib/gradebook/csv';
import { useFocusEffect } from 'expo-router';
import { WorkingLine } from '@/components/ui/WorkingMark';

export default function GradebookScreen() {
  const { colors, scheme } = useTheme();
  const layout = useLayout();
  const { contextTab, className } = useChrome();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Gradebook | null>(null);
  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [pendingColumn, setPendingColumn] = useState<{ id: string; title: string } | null>(null);
  const [headerMenu, setHeaderMenu] = useState<{ id: string; title: string } | null>(null);
  const [pendingCell, setPendingCell] = useState<{
    submissionId: string;
    title: string;
    studentName: string;
  } | null>(null);
  const [cellSheet, setCellSheet] = useState<{
    submissionId: string;
    title: string;
    studentName: string;
    mark: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['class']));

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void loadGradebook(id)
        .then(setBook)
        .catch((err) => {
          setStatus(err instanceof Error ? err.message : 'Could not load grade book');
        });
      void loadClassOverview(id)
        .then(setOverview)
        .catch(() => setOverview(null));
    }, [id]),
  );

  const heatmap = contextTab === 'heatmap';
  const frozenWidth = layout.breakpoint === 'tablet' ? 200 : layout.breakpoint === 'phone-landscape' ? 176 : 156;
  const colWidth = studentHead.colWidth;
  const tree = useMemo(
    () => (book ? buildAssignmentTree(className ?? 'Class', book.assignments) : []),
    [book, className],
  );
  const visibleRows = useMemo(() => flattenBookTree(tree, expanded), [tree, expanded]);

  useEffect(() => {
    if (!tree.length) return;
    setExpanded((current) => {
      const next = new Set(current);
      for (const id of defaultExpandedIds(tree)) next.add(id);
      return next;
    });
  }, [tree]);

  const toggleNode = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toolbar =
    book && book.assignments.length > 0 && !heatmap ? (
      <View style={[styles.intro, layout.showTopBar && styles.introWide]}>
        <GhostButton
          align={layout.showTopBar ? 'left' : 'center'}
          label="Export CSV"
          onPress={() => {
            void exportGradebookCsv(book, 'class')
              .then(() => setExportMessage('Exported.'))
              .catch((err) => {
                setStatus(err instanceof Error ? err.message : 'Could not export');
              });
          }}
        />
        {exportMessage ? <Text style={[type.meta, { color: colors.mute }]}>{exportMessage}</Text> : null}
      </View>
    ) : exportMessage ? (
      <Text style={[type.meta, { color: colors.mute }]}>{exportMessage}</Text>
    ) : null;
  const phase = (
    <PhaseBanner
      phase={3}
      compact
      detail={
        heatmap
          ? 'Students are columns. Gaps are rows. Names stay put while you scan.'
          : 'Students are columns. Assignments nest under class, unit, and section. Pass/Fail never averages with numbers.'
      }
    />
  );

  return (
    <Screen maxWidth={1100} scroll={false}>
      {heatmap ? (
        overview?.heatmapSkills.length && overview.heatmapStudents.length ? (
          <Heatmap
            classId={id!}
            skills={overview.heatmapSkills}
            students={overview.heatmapStudents}
            marks={overview.heatmap}
            leading={toolbar}
            trailing={phase}
          />
        ) : (
          <View>
            {toolbar}
            <Text style={[styles.empty, { color: colors.mute }]}>Approve a gap to see who else has it.</Text>
            {phase}
          </View>
        )
      ) : !book ? (
        <View>
          {toolbar}
          {status ? (
            <Text style={[type.meta, { color: colors.danger }]}>{status}</Text>
          ) : (
            <WorkingLine />
          )}
          {phase}
        </View>
      ) : book.assignments.length === 0 ? (
        <View>
          {toolbar}
          <Text style={[styles.empty, { color: colors.mute }]}>No columns yet. Approve work or assign practice.</Text>
          {phase}
        </View>
      ) : (
          <StickyTable<BookNode>
            leading={toolbar}
            trailing={phase}
            rows={visibleRows}
            rowKey={(row) => row.id}
            frozenTitle="Assignment"
            frozenWidth={frozenWidth}
            headHeight={studentHead.height}
            empty="No students yet."
            rowTone={(row) => (row.kind === 'assignment' ? 'stripe' : 'group')}
            renderFrozen={(row) => (
              <Pressable
                onPress={() => {
                  if (row.expandable) toggleNode(row.id);
                  else if (row.assignment) setHeaderMenu({ id: row.assignment.id, title: row.assignment.title });
                }}
                style={[styles.treeCell, { paddingLeft: 6 + row.indent * 12 }]}
              >
                <Text style={[styles.chevron, { color: colors.mute }]}>
                  {row.expandable ? (expanded.has(row.id) ? '▾' : '▸') : ' '}
                </Text>
                <Text
                  style={[
                    styles.name,
                    { color: colors.ink, fontWeight: row.kind === 'assignment' ? '500' : '700' },
                  ]}
                  numberOfLines={2}
                >
                  {row.title}
                </Text>
              </Pressable>
            )}
            columns={book.students.map((student) => ({
              key: student.id,
              title: firstName(student.display_name),
              width: colWidth,
              renderTitle: () => (
                <Link
                  href={`/class/${id}/student/${student.id}`}
                  accessibilityLabel={firstName(student.display_name)}
                >
                  <View style={styles.headStudent}>
                    <Avatar name={student.display_name} photoUrl={student.photoUrl} size={studentHead.avatar} />
                    <MarqueeText
                      text={firstName(student.display_name)}
                      align="center"
                      fadeColor={colors.wash}
                      style={[styles.headName, { color: colors.ink }]}
                    />
                  </View>
                </Link>
              ),
              render: (row) => {
                if (row.kind !== 'assignment' || !row.assignment) return null;
                const cell = gradeCell(book, row.assignment.id, student.id);
                const tone = cellTone(cell);
                const color =
                  tone === 'mute'
                    ? colors.mute
                    : tone === 'warn'
                      ? colors.warn
                      : tone === 'good'
                        ? colors.good
                        : colors.ink;
                return (
                  <Pressable
                    onPress={() => {
                      if (!cell.submissionId) return;
                      setCellSheet({
                        submissionId: cell.submissionId,
                        title: row.assignment!.title,
                        studentName: student.display_name,
                        mark: formatCell(cell),
                      });
                    }}
                  >
                    <Text
                      style={[styles.mark, { color, fontWeight: tone === 'inkBold' ? '600' : '600' }]}
                      numberOfLines={1}
                    >
                      {formatCell(cell)}
                    </Text>
                  </Pressable>
                );
              },
            }))}
          />
      )}

      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}

      <Modal visible={Boolean(headerMenu)} transparent animationType="fade" onRequestClose={() => setHeaderMenu(null)}>
        <View
          style={[
            styles.cellRoot,
            Platform.OS === 'web' && styles.cellCenter,
            { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
          ]}
        >
          <Pressable style={styles.cellScrim} onPress={() => setHeaderMenu(null)} accessibilityLabel="Close" />
          <View
            pointerEvents="auto"
            style={[
              styles.cellSheet,
              Platform.OS === 'web' ? styles.cellCard : styles.cellBottom,
              { backgroundColor: colors.elevated, borderColor: colors.line },
            ]}
          >
            <Text style={[type.rowTitle, { color: colors.ink }]}>{headerMenu?.title}</Text>
            <GhostButton
              align="left"
              label="Delete assignment"
              onPress={() => {
                if (!headerMenu) return;
                setPendingColumn(headerMenu);
                setHeaderMenu(null);
              }}
            />
            <GhostButton label="Cancel" onPress={() => setHeaderMenu(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(cellSheet)} transparent animationType="fade" onRequestClose={() => setCellSheet(null)}>
        <View
          style={[
            styles.cellRoot,
            Platform.OS === 'web' && styles.cellCenter,
            { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
          ]}
        >
          <Pressable style={styles.cellScrim} onPress={() => setCellSheet(null)} accessibilityLabel="Close" />
          <View
            pointerEvents="auto"
            style={[
              styles.cellSheet,
              Platform.OS === 'web' ? styles.cellCard : styles.cellBottom,
              { backgroundColor: colors.elevated, borderColor: colors.line },
            ]}
          >
            <Text style={[type.rowTitle, { color: colors.ink }]}>{cellSheet?.studentName}</Text>
            <Text style={[type.meta, { color: colors.mute }]}>
              {cellSheet?.title} · {cellSheet?.mark}
            </Text>
            <GhostButton
              align="left"
              label="Remove"
              onPress={() => {
                if (!cellSheet) return;
                setPendingCell({
                  submissionId: cellSheet.submissionId,
                  title: cellSheet.title,
                  studentName: cellSheet.studentName,
                });
                setCellSheet(null);
              }}
            />
            <GhostButton label="Cancel" onPress={() => setCellSheet(null)} />
          </View>
        </View>
      </Modal>

      <ConfirmSheet
        visible={Boolean(pendingColumn)}
        title={`Delete ${pendingColumn?.title ?? 'this assignment'}?`}
        body="Every mark in this row goes away. This cannot be undone."
        confirmLabel="Delete assignment"
        busy={busy}
        onCancel={() => setPendingColumn(null)}
        onConfirm={() => {
          if (!pendingColumn || !id) return;
          setBusy(true);
          void deleteAssignment(pendingColumn.id)
            .then(() => loadGradebook(id).then(setBook))
            .then(() => setPendingColumn(null))
            .catch((err) => setStatus(err instanceof Error ? err.message : 'Could not delete column'))
            .finally(() => setBusy(false));
        }}
      />
      <ConfirmSheet
        visible={Boolean(pendingCell)}
        title={`Remove ${pendingCell ? firstName(pendingCell.studentName) : ''} from ${pendingCell?.title ?? ''}?`}
        body="This cannot be undone."
        confirmLabel="Remove"
        busy={busy}
        onCancel={() => setPendingCell(null)}
        onConfirm={() => {
          if (!pendingCell || !id) return;
          setBusy(true);
          void deleteSubmission(pendingCell.submissionId)
            .then(() => loadGradebook(id).then(setBook))
            .then(() => setPendingCell(null))
            .catch((err) => setStatus(err instanceof Error ? err.message : 'Could not remove'))
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: 8,
    marginBottom: 12,
  },
  introWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empty: {
    ...type.body,
    marginBottom: 16,
  },
  grid: {
    marginBottom: 16,
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  treeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    flex: 1,
  },
  chevron: {
    width: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  headStudent: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  headName: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  name: {
    ...type.cell,
    flex: 1,
    minWidth: 0,
  },
  mark: {
    ...type.cell,
    textAlign: 'center',
  },
  cellRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cellCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cellScrim: {
    flex: 1,
    minHeight: 48,
  },
  cellSheet: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cellCard: {
    borderRadius: radius.lg,
    alignSelf: 'center',
  },
  cellBottom: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxWidth: '100%',
  },
  heat: {
    marginBottom: 16,
  },
  error: {
    ...type.body,
    marginTop: 12,
  },
});
