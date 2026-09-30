/**
 * Rubric scoring grid / family cards — FR-RUB-07/08.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import {
  emptySelections,
  scoreRubric,
  type AssessmentSelection,
  type Rubric,
  type RubricAssessment,
} from '@/lib/rubric';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type RubricGridProps = {
  rubric: Rubric;
  selections?: AssessmentSelection[];
  holisticLevelId?: string | null;
  assessment?: RubricAssessment | null;
  editable?: boolean;
  hidePoints?: boolean;
  summaryLine?: string | null;
  onChangeSelections?: (next: AssessmentSelection[]) => void;
  onChangeHolisticLevelId?: (levelId: string | null) => void;
};

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

export function RubricGrid(props: RubricGridProps) {
  const {
    rubric,
    selections: selectionsProp,
    holisticLevelId,
    assessment,
    editable = false,
    hidePoints = false,
    summaryLine,
    onChangeSelections,
    onChangeHolisticLevelId,
  } = props;
  const { colors } = useTheme();
  const selections = useMemo(() => {
    if (selectionsProp) return selectionsProp;
    if (assessment?.selections?.length) return assessment.selections;
    return emptySelections(rubric);
  }, [selectionsProp, assessment, rubric]);

  const holId = holisticLevelId ?? assessment?.holistic_level_id ?? null;
  const scored = scoreRubric(rubric, selections, {
    holistic_level_id: holId,
    override_total: assessment?.override_total,
  });
  const showPts = !hidePoints && !rubric.scoring.hide_score_from_family;
  const isHolistic =
    rubric.kind === 'holistic' || rubric.scoring.method === 'holistic_points';

  const setSel = (criterionId: string, patch: Partial<AssessmentSelection>) => {
    if (!editable || !onChangeSelections) return;
    const next = selections.map((s) =>
      s.criterion_id === criterionId ? { ...s, ...patch } : s,
    );
    if (!next.some((s) => s.criterion_id === criterionId)) {
      next.push({
        criterion_id: criterionId,
        level_id: null,
        points_awarded: null,
        comment: '',
        na: false,
        ...patch,
      });
    }
    onChangeSelections(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Rubric</Text>
      <Text style={[type.rowTitle, { color: colors.ink }]}>{rubric.title || 'Scoring guide'}</Text>
      {isHolistic ? (
        <HolisticBlock
          rubric={rubric}
          holId={holId}
          showPts={showPts}
          editable={editable}
          onChangeHolisticLevelId={onChangeHolisticLevelId}
        />
      ) : (
        rubric.criteria.map((crit) => (
          <CriterionCard
            key={crit.id}
            rubric={rubric}
            critId={crit.id}
            sel={selections.find((s) => s.criterion_id === crit.id)}
            showPts={showPts}
            editable={editable}
            setSel={setSel}
          />
        ))
      )}
      {showPts ? (
        <Text style={[type.body, { color: colors.ink }]}>
          Total {formatNum(scored.earned)}/{formatNum(scored.max)}
          {scored.percent != null ? ` · ${formatNum(scored.percent)}%` : ''}
          {scored.overridden ? ' · overridden' : ''}
        </Text>
      ) : null}
      {summaryLine ? <Text style={[type.meta, { color: colors.mute }]}>{summaryLine}</Text> : null}
    </View>
  );
}

function HolisticBlock(p: {
  rubric: Rubric;
  holId: string | null;
  showPts: boolean;
  editable: boolean;
  onChangeHolisticLevelId?: (levelId: string | null) => void;
}) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={[type.meta, { color: colors.mute }]}>Overall level</Text>
      <View style={styles.chips}>
        {p.rubric.levels
          .slice()
          .sort((a, b) => b.rank - a.rank)
          .map((lvl) => (
            <Chip
              key={lvl.id}
              label={
                p.showPts && lvl.default_points != null
                  ? `${lvl.label} (${lvl.default_points})`
                  : lvl.label
              }
              selected={p.holId === lvl.id}
              disabled={!p.editable}
              onPress={
                p.editable
                  ? () => p.onChangeHolisticLevelId?.(p.holId === lvl.id ? null : lvl.id)
                  : undefined
              }
            />
          ))}
      </View>
    </Card>
  );
}

function CriterionCard(p: {
  rubric: Rubric;
  critId: string;
  sel?: AssessmentSelection;
  showPts: boolean;
  editable: boolean;
  setSel: (criterionId: string, patch: Partial<AssessmentSelection>) => void;
}) {
  const { colors } = useTheme();
  const crit = p.rubric.criteria.find((c) => c.id === p.critId);
  if (!crit) return null;
  const sel = p.sel;
  return (
    <Card>
      <Text style={[type.rowTitle, { color: colors.ink }]}>{crit.name}</Text>
      {crit.description ? (
        <Text style={[type.meta, { color: colors.mute }]}>{crit.description}</Text>
      ) : null}
      {p.showPts ? (
        <Text style={[type.meta, { color: colors.mute }]}>
          Max {crit.max_points}
          {crit.weight_pct != null ? ` · weight ${crit.weight_pct}%` : ''}
          {crit.extra_credit ? ' · extra credit' : ''}
        </Text>
      ) : null}
      <View style={styles.chips}>
        {p.rubric.levels
          .slice()
          .sort((a, b) => b.rank - a.rank)
          .map((lvl) => {
            const cell = p.rubric.cells.find(
              (c) => c.criterion_id === crit.id && c.level_id === lvl.id,
            );
            const label = p.showPts && cell ? `${lvl.label} (${cell.points})` : lvl.label;
            return (
              <Chip
                key={lvl.id}
                label={label}
                selected={!sel?.na && sel?.level_id === lvl.id}
                disabled={!p.editable || Boolean(sel?.na)}
                onPress={
                  p.editable
                    ? () =>
                        p.setSel(crit.id, {
                          level_id: sel?.level_id === lvl.id ? null : lvl.id,
                          points_awarded: cell?.points ?? lvl.default_points ?? null,
                          na: false,
                        })
                    : undefined
                }
              />
            );
          })}
        {crit.na_allowed ? (
          <Chip
            label="N/A"
            quiet
            selected={Boolean(sel?.na)}
            disabled={!p.editable}
            onPress={
              p.editable
                ? () =>
                    p.setSel(crit.id, {
                      na: !sel?.na,
                      level_id: null,
                      points_awarded: null,
                    })
                : undefined
            }
          />
        ) : null}
      </View>
      {p.editable ? (
        <TextField
          label="Comment"
          value={sel?.comment ?? ''}
          onChangeText={(t) => p.setSel(crit.id, { comment: t })}
        />
      ) : sel?.comment ? (
        <Text style={[type.body, { color: colors.ink }]}>{sel.comment}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
