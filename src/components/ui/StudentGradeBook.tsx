import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { GradebookCellMark } from '@/components/ui/GradebookCellMark';
import { GradebookStudentHead } from '@/components/ui/GradebookStudentHead';
import { GradebookTreeLabel } from '@/components/ui/GradebookTreeLabel';
import { GradeTermTabs } from '@/components/ui/GradeTermTabs';
import {
  FamilyAssignmentDetail,
  type FamilyAssignmentDetailModel,
} from '@/components/ui/FamilyAssignmentDetail';
import { FamilySyllabusSummary } from '@/components/ui/FamilySyllabusSummary';
import { MissingUpcomingStrip } from '@/components/ui/MissingUpcomingStrip';
import { WhyAverageSheet } from '@/components/ui/WhyAverageSheet';
import { GhostButton } from '@/components/ui/Button';
import { StickyTable } from '@/components/ui/StickyTable';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { studentHead } from '@/constants/table';
import { type } from '@/constants/theme';
import { defaultExpandedIds, visibleBookRows, type BookNode } from '@/lib/assignments/tree';
import { firstName } from '@/lib/format';
import { gradeTermLabel, matchesGradeTermFilter } from '@/lib/grade/marks';
import {
  gradeCell,
  loadFamilyStudentGradebook,
  loadStudentGradebook,
  studentBookTree,
  type StudentGradebook,
} from '@/lib/gradebook/api';
import { loadParentClassAverageExplain, loadStudentClassAverageExplain } from '@/lib/syllabus/api';
import type { PublishedFamilySyllabus } from '@/lib/syllabus/api';
import type {
  AverageAssignment,
  MissingUpcomingItem,
  SyllabusAverageResult,
} from '@/lib/grade/syllabusAverage';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  classId: string | 'all';
  /** Parent seat: focused child. When set, uses family RPC + parent explain (no drafts). */
  studentId?: string;
  childName?: string | null;
  photoUrl?: string | null;
};

export function StudentGradeBook({ classId, studentId, childName, photoUrl }: Props) {
  const { colors } = useTheme();
  const layout = useLayout();
  const studentIdRef = useRef(studentId);
  studentIdRef.current = studentId;
  const [book, setBook] = useState<StudentGradebook | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [termFilter, setTermFilter] = useState('all');
  const [syllabus, setSyllabus] = useState<PublishedFamilySyllabus | null>(null);
  const [average, setAverage] = useState<SyllabusAverageResult | null>(null);
  const [ruleLines, setRuleLines] = useState<string[]>([]);
  const [explainAssignments, setExplainAssignments] = useState<AverageAssignment[]>([]);
  const [missing, setMissing] = useState<MissingUpcomingItem[]>([]);
  const [upcoming, setUpcoming] = useState<MissingUpcomingItem[]>([]);
  const [whyOpen, setWhyOpen] = useState(false);
  const [detail, setDetail] = useState<FamilyAssignmentDetailModel | null>(null);

  const load = useCallback(async () => {
    if (studentId) {
      const next = await loadFamilyStudentGradebook(studentId, {
        displayName: childName ?? undefined,
        photoUrl: photoUrl ?? null,
      });
      if (studentIdRef.current !== studentId) return;
      setBook(next);
      return;
    }
    const next = await loadStudentGradebook();
    setBook(next);
  }, [studentId, childName, photoUrl]);

  const loadExplain = useCallback(async () => {
    if (classId === 'all') {
      setSyllabus(null);
      setAverage(null);
      setRuleLines([]);
      setExplainAssignments([]);
      setMissing([]);
      setUpcoming([]);
      return;
    }
    try {
      const explained = studentId
        ? await loadParentClassAverageExplain(classId, studentId, termFilter)
        : await loadStudentClassAverageExplain(classId, termFilter);
      if (studentId && studentIdRef.current !== studentId) return;
      setSyllabus(explained.syllabus);
      setAverage(explained.average);
      setRuleLines(explained.ruleLines);
      setExplainAssignments(explained.assignments);
      setMissing(explained.missing);
      setUpcoming(explained.upcoming);
    } catch {
      if (studentId && studentIdRef.current !== studentId) return;
      setSyllabus({ ok: true, published: false });
      setAverage(null);
      setRuleLines([]);
      setExplainAssignments([]);
      setMissing([]);
      setUpcoming([]);
    }
  }, [classId, termFilter, studentId]);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void load()
        .then(() => {
          if (live) setStatus(null);
        })
        .catch((err) => {
          if (live) setStatus(err instanceof Error ? err.message : 'Could not load grades');
        });
      void loadExplain();
      return () => {
        live = false;
      };
    }, [load, loadExplain]),
  );

  // F-06: sibling switch clears prior book / why / detail / missing before the next load lands.
  useEffect(() => {
    if (!studentId) return;
    setWhyOpen(false);
    setDetail(null);
    setBook(null);
    setSyllabus(null);
    setAverage(null);
    setRuleLines([]);
    setExplainAssignments([]);
    setMissing([]);
    setUpcoming([]);
    setStatus(null);
    setTermFilter('all');
    setExpanded(new Set());
  }, [studentId]);

  const classAssignments = useMemo(() => {
    if (!book) return [];
    return classId === 'all' ? book.assignments : book.assignments.filter((row) => row.class_id === classId);
  }, [book, classId]);
  const filteredBook = useMemo(() => {
    if (!book) return null;
    return {
      ...book,
      assignments: classAssignments.filter((row) => matchesGradeTermFilter(row, termFilter)),
    };
  }, [book, classAssignments, termFilter]);
  const tree = useMemo(() => (filteredBook ? studentBookTree(filteredBook, classId) : []), [classId, filteredBook]);
  const visibleRows = useMemo(() => visibleBookRows(tree, expanded), [tree, expanded]);
  const [paneWidth, setPaneWidth] = useState(0);
  const studentCol = studentHead.colWidth;
  const onPaneLayout = useCallback((width: number) => {
    setPaneWidth((current) => (Math.abs(current - width) < 1 ? current : width));
  }, []);
  const frozenWidth = useMemo(() => {
    const fallback = layout.breakpoint === 'tablet' ? 200 : layout.breakpoint === 'phone-landscape' ? 176 : 156;
    if (paneWidth <= studentCol + 8) return fallback;
    return paneWidth - studentCol;
  }, [layout.breakpoint, paneWidth, studentCol]);

  useEffect(() => {
    setTermFilter('all');
  }, [classId]);

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

  if (!book && !status) {
    return (
      <View
        style={styles.pane}
        onLayout={(event) => onPaneLayout(event.nativeEvent.layout.width)}
      >
        <WorkingLine />
      </View>
    );
  }

  if (status && !book) {
    return (
      <View style={styles.pane}>
        <Text style={[type.meta, { color: colors.danger }]}>{status}</Text>
      </View>
    );
  }

  if (!book) {
    return null;
  }

  const student = book.student;
  const termTabs = classAssignments.length > 0 ? (
    <GradeTermTabs value={termFilter} onChange={setTermFilter} />
  ) : null;

  if (!classAssignments.length) {
    return (
      <View style={styles.pane}>
        <Text style={[styles.empty, { color: colors.mute }]}>
          {classId === 'all' ? 'No assignments yet.' : 'No assignments in this class yet.'}
        </Text>
      </View>
    );
  }

  if (!filteredBook?.assignments.length || !tree.length) {
    return (
      <View style={styles.pane}>
        {termTabs}
        <Text style={[styles.empty, { color: colors.mute }]}>
          No {gradeTermLabel(termFilter)} columns yet.
        </Text>
      </View>
    );
  }

  const classLabel = book.classes.find((row) => row.classId === classId)?.className ?? null;
  const shownName = childName?.trim() || student.displayName;

  const openAssignmentDetail = (row: BookNode) => {
    if (row.kind !== 'assignment' || !row.assignment) return;
    const explainRow = explainAssignments.find((item) => item.id === row.assignment!.id);
    const categoryKey = explainRow?.category ?? row.assignment.category ?? null;
    const syllabusLabel = categoryKey
      ? (syllabus?.categories ?? []).find((c) => c.key === categoryKey)?.label
      : undefined;
    // Accurate or omit — never invent user-facing "other".
    const categoryLabel =
      syllabusLabel ??
      (categoryKey && categoryKey.toLowerCase() !== 'other' ? categoryKey : null);
    const roomName =
      classLabel ??
      book.classes.find((room) => room.classId === row.assignment!.class_id)?.className ??
      null;
    const cell = gradeCell(book, row.assignment.id, student.id);
    const includeKnown =
      typeof (explainRow?.include_in_average ?? row.assignment.include_in_average) === 'boolean'
        ? (explainRow?.include_in_average ?? row.assignment.include_in_average)
        : undefined;
    setDetail({
      title: row.assignment.title,
      className: roomName,
      categoryLabel,
      dueAt: explainRow?.due_at ?? row.assignment.due_at ?? null,
      // Wire only family-safe submissions.submitted_at — never approved_at; leave per-assignment family note unset.
      submittedAt: cell.submittedAt ?? null,
      assignment: explainRow
        ? {
            id: explainRow.id,
            category: explainRow.category,
            include_in_average: explainRow.include_in_average,
          }
        : {
            id: row.assignment.id,
            category: categoryKey && categoryKey.toLowerCase() !== 'other' ? categoryKey : null,
            include_in_average: includeKnown,
          },
      cell,
    });
  };

  return (
    <View
      style={styles.pane}
      onLayout={(event) => onPaneLayout(event.nativeEvent.layout.width)}
    >
      {termTabs}
      {classId !== 'all' && syllabus ? (
        <>
          {syllabus.published && average?.overall != null ? (
            <View style={styles.hero}>
              <Text style={[type.title, { color: colors.ink }]}>Current average · {average.overall}%</Text>
              <Text style={[type.meta, { color: colors.mute }]}>
                Based on approved work in {gradeTermLabel(termFilter)}
              </Text>
              <GhostButton align="left" label="Why this average?" onPress={() => setWhyOpen(true)} />
            </View>
          ) : null}
          <FamilySyllabusSummary
            syllabus={syllabus}
            average={average}
            ruleLines={ruleLines}
            className={classLabel}
            childName={studentId ? shownName : null}
          />
          <MissingUpcomingStrip missing={missing} upcoming={upcoming} />
        </>
      ) : null}
      <StickyTable<BookNode>
        rows={visibleRows}
        rowKey={(row) => row.id}
        frozenTitle="Assignment"
        frozenWidth={frozenWidth}
        headHeight={studentHead.height}
        empty="No assignments yet."
        rowTone={(row) => (row.kind === 'assignment' ? 'stripe' : 'group')}
        renderFrozen={(row) => (
          <GradebookTreeLabel
            row={row}
            expanded={expanded}
            onToggle={toggleNode}
            onAssignmentPress={
              row.kind === 'assignment' && row.assignment
                ? () => openAssignmentDetail(row)
                : undefined
            }
          />
        )}
        columns={[
          {
            key: student.id,
            title: firstName(shownName),
            width: studentCol,
            renderTitle: () => (
              <GradebookStudentHead name={shownName} photoUrl={student.photoUrl} />
            ),
            render: (row) => {
              if (row.kind !== 'assignment' || !row.assignment) return null;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${row.assignment.title}`}
                  onPress={() => openAssignmentDetail(row)}
                >
                  <GradebookCellMark cell={gradeCell(book, row.assignment.id, student.id)} />
                </Pressable>
              );
            },
          },
        ]}
      />
      {status ? <Text style={[type.meta, { color: colors.danger }]}>{status}</Text> : null}
      <WhyAverageSheet
        visible={whyOpen}
        average={average}
        childName={studentId ? shownName : null}
        className={classLabel}
        termLabel={gradeTermLabel(termFilter)}
        onClose={() => setWhyOpen(false)}
      />
      <FamilyAssignmentDetail
        visible={Boolean(detail)}
        detail={detail}
        average={average}
        onClose={() => setDetail(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pane: {
    flex: 1,
    minHeight: 0,
  },
  empty: {
    ...type.body,
    marginTop: 16,
  },
  hero: {
    marginBottom: 8,
    gap: 2,
  },
});
