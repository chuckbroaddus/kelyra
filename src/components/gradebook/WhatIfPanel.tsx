/**
 * WhatIfPanel — FR-ENG-07 score needed / hypothetical (GB-10).
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';
import type { SyllabusCategoryInput, SyllabusPolicies } from '@/lib/grade/syllabusAverage';

import {
  computeStudentPeriod,
  letterForPct,
  runWhatIf,
  targetPctForLetter,
  type BridgeAssignment,
  type BridgeCell,
} from './engineBridge';

type Props = {
  assignments: BridgeAssignment[];
  cells: BridgeCell[];
  categories: SyllabusCategoryInput[];
  policies?: SyllabusPolicies | null;
  periodFilter: string;
};

export function WhatIfPanel({
  assignments,
  cells,
  categories,
  policies,
  periodFilter,
}: Props) {
  const { colors } = useTheme();
  const [assignmentId, setAssignmentId] = useState<string>(assignments[0]?.id ?? '');
  const [targetMode, setTargetMode] = useState<'pct' | 'letter'>('pct');
  const [targetPct, setTargetPct] = useState('90');
  const [targetLetter, setTargetLetter] = useState('A');
  const [hypo, setHypo] = useState('');

  const syllabus = useMemo(
    () => ({ categories, policies: policies ?? null }),
    [categories, policies],
  );

  const resolvedTarget = useMemo(() => {
    if (targetMode === 'letter') {
      return targetPctForLetter(targetLetter) ?? 90;
    }
    const n = Number(targetPct);
    return Number.isFinite(n) ? n : 90;
  }, [targetMode, targetLetter, targetPct]);

  const needed = useMemo(() => {
    if (!assignmentId || !categories.length) return null;
    return runWhatIf(syllabus, assignments, cells, periodFilter, {
      target_pct: resolvedTarget,
      assignment_id: assignmentId,
    });
  }, [assignmentId, assignments, cells, periodFilter, resolvedTarget, syllabus, categories.length]);

  const hypoResult = useMemo(() => {
    if (hypo.trim() === '' || !assignmentId) return null;
    const raw = Number(hypo);
    if (!Number.isFinite(raw)) return null;
    const nextCells: BridgeCell[] = [
      ...cells.filter((c) => c.assignmentId !== assignmentId),
      {
        assignmentId,
        approvedScore: raw,
        scoreMark: 'numeric',
        status: 'graded',
        approved: true,
      },
    ];
    return computeStudentPeriod(syllabus, assignments, nextCells, periodFilter);
  }, [assignmentId, assignments, cells, hypo, periodFilter, syllabus]);

  if (!assignments.length) {
    return (
      <View style={styles.wrap}>
        <Text style={[type.meta, { color: colors.mute }]}>No assignments for what-if.</Text>
      </View>
    );
  }

  const pick = assignments.find((a) => a.id === assignmentId) ?? assignments[0]!;
  const letterNow = letterForPct(hypoResult?.pct ?? null);

  return (
    <View style={styles.wrap}>
      <Text style={[type.meta, { color: colors.mute }]}>What-if (not saved)</Text>
      <Text style={[type.body, { color: colors.ink }]}>Assignment</Text>
      <View style={styles.row}>
        {assignments.slice(0, 8).map((a) => {
          const on = a.id === pick.id;
          return (
            <Pressable
              key={a.id}
              onPress={() => setAssignmentId(a.id)}
              style={[styles.chip, { borderColor: colors.line, backgroundColor: on ? colors.brandSoft : 'transparent' }]}
            >
              <Text style={[type.meta, { color: on ? colors.brand : colors.ink }]} numberOfLines={1}>
                {a.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        <GhostButton
          align="left"
          label={targetMode === 'pct' ? 'Target %' : 'Switch to %'}
          onPress={() => setTargetMode('pct')}
        />
        <GhostButton
          align="left"
          label={targetMode === 'letter' ? 'Target letter' : 'Switch to letter'}
          onPress={() => setTargetMode('letter')}
        />
      </View>
      {targetMode === 'pct' ? (
        <TextField label="Target percent" value={targetPct} onChangeText={setTargetPct} keyboardType="decimal-pad" />
      ) : (
        <TextField label="Target letter" value={targetLetter} onChangeText={setTargetLetter} autoCapitalize="characters" />
      )}
      <Text style={[type.body, { color: colors.ink }]}>
        {needed == null
          ? '—'
          : needed.possible
            ? `Need ${needed.raw_needed} on ${pick.title} for ${resolvedTarget}%`
            : needed.note ?? 'Not reachable'}
      </Text>
      <TextField
        label="Try a score (hypothetical)"
        value={hypo}
        onChangeText={setHypo}
        keyboardType="decimal-pad"
        placeholder="e.g. 88"
      />
      {hypoResult ? (
        <Text style={[type.body, { color: colors.ink }]}>
          With {hypo} on {pick.title}: {hypoResult.pct == null ? '—' : `${hypoResult.pct}%`}
          {letterNow ? ` · ${letterNow}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
});
