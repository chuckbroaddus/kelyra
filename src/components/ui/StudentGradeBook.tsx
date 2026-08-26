import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { GradebookCellMark } from '@/components/ui/GradebookCellMark';
import { GradebookStudentHead } from '@/components/ui/GradebookStudentHead';
import { GradebookTreeLabel } from '@/components/ui/GradebookTreeLabel';
import { GradeTermTabs } from '@/components/ui/GradeTermTabs';
import { StickyTable } from '@/components/ui/StickyTable';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { studentHead } from '@/constants/table';
import { type } from '@/constants/theme';
import { defaultExpandedIds, visibleBookRows, type BookNode } from '@/lib/assignments/tree';
import { firstName } from '@/lib/format';
import { gradeTermLabel, matchesGradeTermFilter } from '@/lib/grade/marks';
import { gradeCell, loadStudentGradebook, studentBookTree, type StudentGradebook } from '@/lib/gradebook/api';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  classId: string | 'all';
};

export function StudentGradeBook({ classId }: Props) {
  const { colors } = useTheme();
  const layout = useLayout();
  const [book, setBook] = useState<StudentGradebook | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [termFilter, setTermFilter] = useState('all');

  const load = useCallback(async () => {
    const next = await loadStudentGradebook();
    setBook(next);
  }, []);

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
      return () => {
        live = false;
      };
    }, [load]),
  );

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

  return (
    <View
      style={styles.pane}
      onLayout={(event) => onPaneLayout(event.nativeEvent.layout.width)}
    >
      {termTabs}
      <StickyTable<BookNode>
        rows={visibleRows}
        rowKey={(row) => row.id}
        frozenTitle="Assignment"
        frozenWidth={frozenWidth}
        headHeight={studentHead.height}
        empty="No assignments yet."
        rowTone={(row) => (row.kind === 'assignment' ? 'stripe' : 'group')}
        renderFrozen={(row) => (
          <GradebookTreeLabel row={row} expanded={expanded} onToggle={toggleNode} />
        )}
        columns={[
          {
            key: student.id,
            title: firstName(student.displayName),
            width: studentCol,
            renderTitle: () => (
              <GradebookStudentHead name={student.displayName} photoUrl={student.photoUrl} />
            ),
            render: (row) => {
              if (row.kind !== 'assignment' || !row.assignment) return null;
              return <GradebookCellMark cell={gradeCell(book, row.assignment.id, student.id)} />;
            },
          },
        ]}
      />
      {status ? <Text style={[type.meta, { color: colors.danger }]}>{status}</Text> : null}
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
});
