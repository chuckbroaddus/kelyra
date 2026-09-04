import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Heatmap } from '@/components/Heatmap';
import { ClassTabs, hrefForClassTab } from '@/components/ui/ClassTabs';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { GradebookCellMark } from '@/components/ui/GradebookCellMark';
import { GradebookStudentHead } from '@/components/ui/GradebookStudentHead';
import { GradebookTreeLabel } from '@/components/ui/GradebookTreeLabel';
import { GradeTermTabs } from '@/components/ui/GradeTermTabs';
import { Screen } from '@/components/ui/Screen';
import { StickyTable } from '@/components/ui/StickyTable';
import { studentHead } from '@/constants/table';
import { chrome, radius, shadows, type } from '@/constants/theme';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { loadClassOverview, type ClassOverview } from '@/lib/classes/overview';
import { formatCell, gradeCell, loadGradebook, type Gradebook } from '@/lib/gradebook/api';
import { submissionReviewPath } from '@/lib/practice/review';
import { deleteAssignment, deleteSubmission } from '@/lib/practice/delete';
import {
  buildAssignmentTree,
  defaultExpandedIds,
  visibleBookRows,
  type BookNode,
} from '@/lib/assignments/tree';
import { isAwaitingGrade, isGraded } from '@/lib/assignments/status';
import { gradeTermLabel, matchesGradeTermFilter } from '@/lib/grade/marks';
import { firstName } from '@/lib/format';
import { exportGradebookCsv } from '@/lib/gradebook/csv';
import { useFocusEffect } from 'expo-router';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/Button';
import { getClassSyllabus } from '@/lib/syllabus/api';

export default function GradebookScreen() {
  const { colors, scheme } = useTheme();
  const layout = useLayout();
  const router = useRouter();
  const {
    className,
    trayTranslate,
    trayHideDistance,
    trayRest,
    visible: chromeVisible,
  } = useChrome();
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  usePushedTitle(className ?? 'Class');
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
    status: string | null;
    kind: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['class']));
  const [termFilter, setTermFilter] = useState('all');
  const [syllabusBanner, setSyllabusBanner] = useState<'none' | 'draft' | 'published'>('none');

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
      void getClassSyllabus(id)
        .then((bundle) => {
          if (!bundle.exists || !bundle.syllabus) setSyllabusBanner('none');
          else if (bundle.syllabus.status === 'published') setSyllabusBanner('published');
          else setSyllabusBanner('draft');
        })
        .catch(() => setSyllabusBanner('none'));
    }, [id]),
  );

  const paneRaw = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  const heatmap = paneRaw === 'heatmap';
  const frozenWidth = layout.breakpoint === 'tablet' ? 200 : layout.breakpoint === 'phone-landscape' ? 176 : 156;
  const colWidth = studentHead.colWidth;
  const assignments = useMemo(
    () => (book ? book.assignments.filter((row) => matchesGradeTermFilter(row, termFilter)) : []),
    [book, termFilter],
  );
  const tree = useMemo(
    () => (book ? buildAssignmentTree(className ?? 'Class', assignments) : []),
    [assignments, book, className],
  );
  const visibleRows = useMemo(() => visibleBookRows(tree, expanded), [tree, expanded]);
  const columns = useMemo(() => {
    if (!book) return [];
    return book.students.map((student) => ({
      key: student.id,
      title: firstName(student.display_name),
      width: colWidth,
      renderTitle: () => (
        <GradebookStudentHead
          name={student.display_name}
          photoUrl={student.photoUrl}
          href={id ? `/class/${id}/student/${student.id}` : undefined}
        />
      ),
      render: (row: BookNode) => {
        if (row.kind !== 'assignment' || !row.assignment) return null;
        const cell = gradeCell(book, row.assignment.id, student.id);
        return (
          <Pressable
            onPress={() => {
              if (!cell.submissionId) return;
              const waiting = isAwaitingGrade(cell.status);
              if (waiting) {
                router.push(submissionReviewPath(id!, cell.submissionId) as never);
                return;
              }
              if (row.assignment?.kind === 'lesson') {
                router.push(`/class/${id}/lesson-result/${cell.submissionId}` as never);
                return;
              }
              setCellSheet({
                submissionId: cell.submissionId,
                title: row.assignment!.title,
                studentName: student.display_name,
                mark: formatCell(cell),
                status: cell.status,
                kind: row.assignment?.kind ?? null,
              });
            }}
          >
            <GradebookCellMark cell={cell} />
          </Pressable>
        );
      },
    }));
  }, [book, colWidth, id, router]);

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

  useEffect(() => {
    setTermFilter('all');
  }, [id]);

  const exportTravel = Math.max(trayHideDistance, 1) + 72;
  const exportTranslate = trayTranslate.interpolate({
    inputRange: [0, Math.max(trayHideDistance, 1)],
    outputRange: [0, exportTravel],
  });
  const exportOpacity = trayTranslate.interpolate({
    inputRange: [0, Math.max(trayHideDistance, 1)],
    outputRange: [1, 0],
  });
  const showExport = Boolean(book && book.assignments.length > 0 && !heatmap) || Boolean(exportMessage);
  const exportBar = showExport ? (
    <Animated.View
      pointerEvents={chromeVisible ? 'box-none' : 'none'}
      style={[
        styles.exportDock,
        {
          bottom: layout.showTopBar ? 16 : trayRest + 8,
          transform: [{ translateY: exportTranslate }],
          opacity: exportOpacity,
        },
      ]}
    >
      <View
        style={[
          styles.exportPlate,
          {
            backgroundColor: colors.elevated,
            borderColor: colors.line,
            ...(scheme === 'light' ? shadows.light : null),
          },
          layout.showTopBar && styles.exportBarWide,
        ]}
      >
        {book && book.assignments.length > 0 && !heatmap ? (
          <>
            <GhostButton
              align="center"
              label="Export CSV"
              onPress={() => {
                void exportGradebookCsv({ ...book, assignments }, 'class')
                  .then(() => setExportMessage('Exported.'))
                  .catch((err) => {
                    setStatus(err instanceof Error ? err.message : 'Could not export');
                  });
              }}
            />
            {exportMessage ? <Text style={[type.meta, { color: colors.mute }]}>{exportMessage}</Text> : null}
          </>
        ) : (
          <Text style={[type.meta, { color: colors.mute }]}>{exportMessage}</Text>
        )}
      </View>
    </Animated.View>
  ) : null;

  const termTabs =
    !heatmap && book && book.assignments.length > 0 ? (
      <GradeTermTabs value={termFilter} onChange={setTermFilter} />
    ) : null;

  return (
    <View style={styles.shell}>
    <Screen maxWidth={1100} scroll={false}>
      {id ? <ClassTabs classId={id} stacked={Boolean(termTabs)} /> : null}
      {id ? (
        <ChipRow>
          <Chip
            label="Gradebook"
            selected={!heatmap}
            onPress={() => router.replace(hrefForClassTab(id, 'gradebook') as never)}
          />
          <Chip
            label="Heatmap"
            selected={heatmap}
            onPress={() => router.replace(hrefForClassTab(id, 'heatmap') as never)}
          />
        </ChipRow>
      ) : null}
      {syllabusBanner !== 'published' && id && !heatmap ? (
        <Card>
          <Text style={[type.meta, { color: colors.mute }]}>
            {syllabusBanner === 'draft'
              ? 'Draft syllabus saved — not live.'
              : 'Syllabus weights not set. Averages won’t use category weights until you publish.'}
          </Text>
          <PrimaryButton
            label={syllabusBanner === 'draft' ? 'Continue' : 'Set up syllabus'}
            onPress={() => router.push(`/class/${id}/syllabus`)}
          />
        </Card>
      ) : null}
      {termTabs}
      <View style={styles.pane}>
      {heatmap ? (
        overview?.heatmapSkills.length && overview.heatmapStudents.length ? (
          <Heatmap
            classId={id!}
            skills={overview.heatmapSkills}
            students={overview.heatmapStudents}
            marks={overview.heatmap}
          />
        ) : (
          <Text style={[styles.empty, { color: colors.mute }]}>Approve a gap to see who else has it.</Text>
        )
      ) : !book ? (
        status ? (
          <Text style={[type.meta, { color: colors.danger }]}>{status}</Text>
        ) : (
          <WorkingLine />
        )
      ) : book.assignments.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>No columns yet. Approve work or assign practice.</Text>
      ) : assignments.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          No {gradeTermLabel(termFilter)} columns yet.
        </Text>
      ) : (
          <StickyTable<BookNode>
            rows={visibleRows}
            rowKey={(row) => row.id}
            frozenTitle="Assignment"
            frozenWidth={frozenWidth}
            headHeight={studentHead.height}
            empty="No students yet."
            rowTone={(row) => (row.kind === 'assignment' ? 'stripe' : 'group')}
            renderFrozen={(row) => (
              <GradebookTreeLabel
                row={row}
                expanded={expanded}
                onToggle={toggleNode}
                onAssignmentPress={
                  row.assignment
                    ? () => setHeaderMenu({ id: row.assignment!.id, title: row.assignment!.title })
                    : undefined
                }
              />
            )}
            columns={columns}
          />
      )}

      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}
      </View>

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
            {isGraded(cellSheet?.status) || isAwaitingGrade(cellSheet?.status) || cellSheet?.kind === 'lesson' ? (
              <GhostButton
                align="left"
                label="Review"
                onPress={() => {
                  if (!cellSheet || !id) return;
                  const href =
                    cellSheet.kind === 'lesson' && !isGraded(cellSheet.status)
                      ? `/class/${id}/lesson-result/${cellSheet.submissionId}`
                      : submissionReviewPath(id, cellSheet.submissionId);
                  setCellSheet(null);
                  router.push(href as never);
                }}
              />
            ) : null}
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
    {exportBar}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  pane: {
    flex: 1,
    minHeight: 0,
  },
  exportDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
  },
  exportPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: chrome.trayRadius,
    borderWidth: 1,
  },
  exportBarWide: {
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
  treeName: {
    flex: 1,
    minWidth: 8,
    fontSize: 13,
    lineHeight: 16,
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
