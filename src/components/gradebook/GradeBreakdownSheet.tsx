/**
 * GradeBreakdownSheet — NFR-08 breakdown from engine v2 (GB-10).
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { ScreenOverlay } from '@/components/ui/ScreenOverlay';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { isGraded } from '@/lib/assignments/status';
import type { SyllabusCategoryInput, SyllabusPolicies } from '@/lib/grade/syllabusAverage';
import type { ScoreMark } from '@/lib/grade/marks';

import { buildBreakdownVM } from './breakdownModel';
import {
  buildEngineSyllabus,
  computeStudentPeriod,
  letterForPct,
  type BridgeAssignment,
  type BridgeCell,
} from './engineBridge';
import { WhatIfPanel } from './WhatIfPanel';

export type BreakdownSourceAssignment = BridgeAssignment & { title: string };

export type BreakdownSourceCell = {
  assignmentId: string;
  approvedScore: number | null;
  scoreMark?: ScoreMark | null;
  status?: string | null;
  approved?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  studentName?: string | null;
  className?: string | null;
  periodLabel?: string | null;
  periodFilter: string;
  assignments: BreakdownSourceAssignment[];
  cells: BreakdownSourceCell[];
  categories: SyllabusCategoryInput[];
  policies?: SyllabusPolicies | null;
  showWhatIf?: boolean;
};

export function GradeBreakdownSheet({
  visible,
  onClose,
  studentName,
  className,
  periodLabel,
  periodFilter,
  assignments,
  cells,
  categories,
  policies,
  showWhatIf = true,
}: Props) {
  const { colors, scheme } = useTheme();

  const bridgeCells: BridgeCell[] = useMemo(
    () =>
      cells.map((c) => ({
        assignmentId: c.assignmentId,
        approvedScore: c.approvedScore,
        scoreMark: c.scoreMark ?? 'numeric',
        status: c.status ?? null,
        approved: c.approved ?? isGraded(c.status),
      })),
    [cells],
  );

  const syllabus = useMemo(
    () => ({ categories, policies: policies ?? null }),
    [categories, policies],
  );

  const vm = useMemo(() => {
    if (!categories.some((c) => c.active !== false && Number(c.weight_percent) > 0)) {
      return null;
    }
    const result = computeStudentPeriod(syllabus, assignments, bridgeCells, periodFilter);
    const engineSyllabus = buildEngineSyllabus(syllabus);
    const titles = new Map(assignments.map((a) => [a.id, a.title]));
    return buildBreakdownVM(result, engineSyllabus, {
      titleOf: (id) => titles.get(id) ?? id,
      labelOf: (key) => categories.find((c) => c.key === key)?.label ?? key,
    });
  }, [assignments, bridgeCells, categories, periodFilter, syllabus]);

  const letter = letterForPct(vm?.overall_pct ?? null);

  return (
    <ScreenOverlay visible={visible} onRequestClose={onClose}>
      <View
        style={[
          styles.scrim,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.line }]}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <BreakdownBody
              vm={vm}
              letter={letter}
              studentName={studentName}
              className={className}
              periodLabel={periodLabel}
              colors={colors}
            />
            {showWhatIf && categories.length > 0 ? (
              <WhatIfPanel
                assignments={assignments}
                cells={bridgeCells}
                categories={categories}
                policies={policies}
                periodFilter={periodFilter}
              />
            ) : null}
            <GhostButton align="left" label="Close" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </ScreenOverlay>
  );
}

function BreakdownBody({
  vm,
  letter,
  studentName,
  className,
  periodLabel,
  colors,
}: {
  vm: ReturnType<typeof buildBreakdownVM> | null;
  letter: string | null;
  studentName?: string | null;
  className?: string | null;
  periodLabel?: string | null;
  colors: { ink: string; mute: string; warn: string };
}) {
  if (!vm || vm.overall_pct == null) {
    return (
      <Text style={[type.body, { color: colors.mute }]}>
        No countable average yet — publish syllabus weights and approve scores to see a breakdown.
      </Text>
    );
  }
  return (
    <>
      <Text style={[type.title, { color: colors.ink }]}>
        {vm.overall_pct}%{letter ? ` · ${letter}` : ''}
      </Text>
      <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>
        {studentName ? `${studentName} · ` : ''}
        {className ?? 'class'}
        {periodLabel ? ` · ${periodLabel}` : ''}
      </Text>
      {vm.overall_unrounded_note ? (
        <Text style={[type.meta, { color: colors.warn, marginTop: 8 }]}>{vm.overall_unrounded_note}</Text>
      ) : null}
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>Categories</Text>
      {vm.categories.map((c) => (
        <View key={c.key} style={styles.cat}>
          <Text style={[type.body, { color: colors.ink }]}>
            {c.label}
            {c.pct != null ? ` · ${Math.round(c.pct * 10) / 10}%` : ' · —'}
          </Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            weight {Math.round(c.weight_percent * 10) / 10}%
            {c.weight_used > 0 ? ` → used ${Math.round(c.weight_used * 1000) / 10}%` : c.pct == null ? ' (empty)' : ''}
            {c.contribution != null ? ` · contrib ${Math.round(c.contribution * 10) / 10}` : ''}
          </Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            earned {c.earned ?? '—'} / possible {c.possible ?? '—'}
            {c.drops ? ` · drops ${c.drops}` : ''}
            {c.excused ? ` · excused ${c.excused}` : ''}
            {c.late_adjustments ? ` · late ${c.late_adjustments}` : ''}
            {c.ec_items ? ` · EC ${c.ec_items}` : ''}
          </Text>
          {c.items
            .filter((i) => i.role === 'counted' || i.role === 'dropped' || i.role === 'ec')
            .slice(0, 12)
            .map((i) => (
              <Text key={`${i.assignment_id}-${i.role}`} style={[type.meta, { color: colors.mute }]}>
                {i.title} · {i.role}
                {i.pct != null ? ` · ${i.pct}%` : ''}
                {i.note ? ` · ${i.note}` : ''}
              </Text>
            ))}
        </View>
      ))}
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>Final step</Text>
      <Text style={[type.body, { color: colors.ink }]}>{vm.rounding_step}</Text>
      {vm.ec_added ? <Text style={[type.meta, { color: colors.mute }]}>EC added: +{vm.ec_added}</Text> : null}
      {vm.floor_applied ? <Text style={[type.meta, { color: colors.warn }]}>Period floor applied</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    paddingBottom: 12,
  },
  content: { padding: 16, gap: 4, paddingBottom: 28 },
  cat: { marginTop: 8, gap: 2 },
});
