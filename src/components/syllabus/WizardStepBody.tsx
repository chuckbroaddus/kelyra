/**
 * Step bodies for GB-08 syllabus wizard.
 */
import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { GRADE_KINDS } from '@/lib/grade/marks';
import { getBundledHelpTopic } from '@/lib/help/helpTopics';
import { syllabusStatusLabel } from '@/lib/grade/plainLabels';
import { splitWeights } from '@/lib/syllabus/extraCreditWeights';
import {
  ENGINE_OPTIONS,
  activeWeightSum,
  addCategory,
  canFinishReview,
  engineOption,
  isFieldLocked,
  isWeightedEngine,
  parentFacingParagraph,
  patchCategory,
  patchDraft,
  setEmptyCategoryPolicy,
  type SyllabusCategoryDraft,
  type SyllabusWizardDraft,
  type WizardStepId,
} from '@/components/syllabus/wizardModel';

export type StepColors = {
  ink: string;
  mute: string;
  brand: string;
  danger: string;
  line: string;
  good: string;
  warn: string;
};

type Props = {
  draft: SyllabusWizardDraft;
  step: WizardStepId;
  colors: StepColors;
  onChange: (d: SyllabusWizardDraft) => void;
};

export function LockNote({
  draft,
  field,
  colors,
}: {
  draft: SyllabusWizardDraft;
  field: Parameters<typeof isFieldLocked>[1];
  colors: StepColors;
}) {
  if (!isFieldLocked(draft, field)) return null;
  const why = draft.lock_reasons[field] ?? 'Your school sets this.';
  return <Text style={[type.meta, { color: colors.warn, marginTop: 6 }]}>Set by your school — {why}</Text>;
}

export function WizardStepBody({ draft, step, colors, onChange }: Props) {
  const sum = activeWeightSum(draft.categories);
  if (step === 'engine') return <EngineStep draft={draft} colors={colors} onChange={onChange} />;
  if (step === 'categories') return <CategoriesStep draft={draft} colors={colors} onChange={onChange} sum={sum} />;
  if (step === 'within') return <WithinStep draft={draft} colors={colors} onChange={onChange} />;
  if (step === 'drops') return <DropsStep draft={draft} colors={colors} onChange={onChange} />;
  if (step === 'status_late') return <StatusLateStep draft={draft} colors={colors} onChange={onChange} />;
  if (step === 'extra_credit') return <EcStep draft={draft} colors={colors} onChange={onChange} />;
  if (step === 'book_rollup') return <BookStep draft={draft} colors={colors} onChange={onChange} />;
  return <ReviewStep draft={draft} colors={colors} sum={sum} />;
}

function EngineStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  const locked = isFieldLocked(draft, 'engine');
  return (
    <>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        Choose how assignment scores add up to a grade for each grading period.
      </Text>
      <LockNote draft={draft} field="engine" colors={colors} />
      <ChipRow>
        {ENGINE_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            label={opt.label}
            selected={draft.engine === opt.id}
            disabled={locked}
            onPress={() => onChange(patchDraft(draft, { engine: opt.id }))}
          />
        ))}
      </ChipRow>
      <Text style={[type.body, { color: colors.ink, marginTop: 12 }]}>{engineOption(draft.engine).plain}</Text>
      <TextField
        label="Syllabus name"
        placeholder="Room 14 Math — Fall 2026"
        value={draft.title}
        onChangeText={(title) => onChange(patchDraft(draft, { title }))}
      />
    </>
  );
}

// stubs expanded below
function CategoryCard({
  row,
  colors,
  locked,
  onPatch,
}: {
  row: SyllabusCategoryDraft;
  colors: StepColors;
  locked: boolean;
  onPatch: (p: Partial<SyllabusCategoryDraft>) => void;
}) {
  return (
    <View style={[styles.catCard, { borderColor: colors.line }]}>
      <TextField label="Category name" value={row.label} onChangeText={(label) => onPatch({ label })} />
      <TextField
        label="Weight (%)"
        keyboardType="numeric"
        value={String(row.weight_percent)}
        onChangeText={(text) => {
          const n = Number(text);
          onPatch({ weight_percent: Number.isFinite(n) ? n : 0 });
        }}
      />
      <ChipRow>
        <Chip label={row.active ? 'In use' : 'Not used'} selected={row.active} onPress={() => onPatch({ active: !row.active })} />
        <Chip
          label={row.default_include_in_average ? 'Counts in the average' : 'Counts only when you choose'}
          selected={row.default_include_in_average}
          onPress={() => onPatch({ default_include_in_average: !row.default_include_in_average })}
        />
      </ChipRow>
      <Text style={[type.meta, { color: colors.mute }]}>
        {locked ? 'Set by your school' : ''}
      </Text>
    </View>
  );
}

/** Category total; with extra credit as its own category, that weight is shown on top of 100%. */
function WeightTotalLine({ draft, colors, sum }: { draft: SyllabusWizardDraft; colors: StepColors; sum: number }) {
  const split = splitWeights(draft.categories, draft.extra_credit_method);
  const base = split.extraCredit > 0 ? split.regular : Math.round(sum * 1000) / 1000;
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return (
    <Text style={[type.meta, { color: Math.abs(base - 100) <= 0.01 ? colors.good : colors.warn }]}>
      {split.extraCredit > 0 ? 'Regular categories' : 'Total'} {base}%
      {base < 100 ? ` · ${r(100 - base)}% left to assign` : base > 100 ? ' · over 100%' : ' · adds up to 100%'}
      {split.extraCredit > 0 ? ` · Extra credit ${split.extraCredit}% on top` : ''}
    </Text>
  );
}

function CategoriesStep({ draft, colors, onChange, sum }: Omit<Props, 'step'> & { sum: number }) {
  const locked = isFieldLocked(draft, 'categories');
  return (
    <>
      <WeightTotalLine draft={draft} colors={colors} sum={sum} />
      <LockNote draft={draft} field="categories" colors={colors} />
      <Text style={[type.meta, { color: colors.mute, marginVertical: 8 }]}>
        If a category has no grades yet:
      </Text>
      <ChipRow>
        <Chip
          label="Skip it until it has grades"
          selected={draft.empty_category === 'renormalize'}
          disabled={locked}
          onPress={() => onChange(setEmptyCategoryPolicy(draft, 'renormalize'))}
        />
        <Chip
          label="Count it as 0"
          selected={draft.empty_category === 'zero'}
          disabled={locked}
          onPress={() => onChange(setEmptyCategoryPolicy(draft, 'zero'))}
        />
      </ChipRow>
      {!locked ? (
        <GhostButton align="left" label="Add category" onPress={() => onChange(addCategory(draft))} />
      ) : null}
      {!locked ? (
        <ChipRow>
          {GRADE_KINDS.filter((k) => !draft.categories.some((c) => c.key === k.key)).map((k) => (
            <Chip key={k.key} label={`+ ${k.label}`} selected={false} onPress={() => onChange(addCategory(draft, k))} />
          ))}
        </ChipRow>
      ) : null}
      {draft.categories.map((row) => (
        <CategoryCard
          key={row.key}
          row={row}
          colors={colors}
          locked={isFieldLocked(draft, 'categories')}
          onPatch={(partial) => onChange(patchCategory(draft, row.key, partial))}
        />
      ))}
    </>
  );
}

function WithinStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  return (
    <>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        Example: a 20-point quiz and a 100-point test in the same category.
      </Text>
      <ChipRow>
        <Chip
          label="Bigger assignments count more"
          selected={draft.within_category === 'points_inside' || draft.engine === 'weighted_points_inside'}
          onPress={() => onChange(patchDraft(draft, { within_category: 'points_inside' }))}
        />
        <Chip
          label="Every assignment counts the same"
          selected={draft.within_category === 'percent_inside' || draft.engine === 'weighted_percent_inside'}
          onPress={() => onChange(patchDraft(draft, { within_category: 'percent_inside' }))}
        />
      </ChipRow>
      <Text style={[type.body, { color: colors.ink, marginTop: 12 }]}>
        {draft.engine === 'weighted_points_inside' || draft.within_category === 'points_inside'
          ? 'Points count: 80/100 and 16/20 are added up, so the category is 96/120 (80%).'
          : 'All equal: 80/100 and 16/20 are each 80%, and the two are averaged the same.'}
      </Text>
    </>
  );
}

function DropsStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  return (
    <>
      <LockNote draft={draft} field="drop_lowest" colors={colors} />
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        Dropping low scores happens inside one grading period only.
      </Text>
      {draft.categories
        .filter((c) => c.active)
        .map((row) => (
          <View key={row.key} style={{ marginBottom: 10 }}>
            <TextField
              label={`${row.label}: how many lowest scores to drop (0–3)`}
              keyboardType="numeric"
              value={String(row.rules?.drop_lowest_n ?? 0)}
              onChangeText={(text) => {
                const n = Math.max(0, Math.min(3, Number(text) || 0));
                onChange(patchCategory(draft, row.key, { rules: { ...row.rules, drop_lowest_n: n } }));
              }}
            />
          </View>
        ))}
      <LockNote draft={draft} field="floor" colors={colors} />
      <TextField
        label="Lowest grade allowed for the period, % (optional)"
        keyboardType="numeric"
        value={draft.floor == null ? '' : String(draft.floor)}
        onChangeText={(text) => {
          const n = text.trim() === '' ? null : Number(text);
          onChange(patchDraft(draft, { floor: n == null || !Number.isFinite(n) ? null : n }));
        }}
      />
    </>
  );
}

function StatusLateStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  const lateLocked = isFieldLocked(draft, 'late');
  const [excusedHelpOpen, setExcusedHelpOpen] = useState(false);
  const excusedHelp = getBundledHelpTopic('help.excused');
  return (
    <>
      <Text style={[type.meta, { color: colors.mute }]}>Missing work</Text>
      <ChipRow>
        {(
          [
            ['omit', "Doesn't count yet"],
            ['zero', 'Count as 0'],
            ['floor', 'Lowest grade allowed'],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            selected={draft.missing_rule === id}
            onPress={() => onChange(patchDraft(draft, { missing_rule: id }))}
          />
        ))}
      </ChipRow>
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
        Excused work is left out of the grade completely. It is never a zero.
      </Text>
      <GhostButton
        label={excusedHelpOpen ? 'Hide Excused help' : 'Help on Excused'}
        onPress={() => setExcusedHelpOpen((v) => !v)}
      />
      {excusedHelpOpen && excusedHelp ? (
        <View style={{ marginTop: 8, gap: 4 }}>
          <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>{excusedHelp.title}</Text>
          <Text style={[type.meta, { color: colors.mute }]}>{excusedHelp.meaning}</Text>
          {excusedHelp.example ? (
            <Text style={[type.meta, { color: colors.ink }]}>Example: {excusedHelp.example}</Text>
          ) : null}
        </View>
      ) : null}
      <LockNote draft={draft} field="late" colors={colors} />
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>Late penalty</Text>
      <ChipRow>
        {(
          [
            ['none', 'None (I adjust by hand)'],
            ['flat', 'One-time'],
            ['per_day', 'Per day'],
            ['per_hour', 'Per hour'],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            selected={draft.late_rule.type === id}
            disabled={lateLocked}
            onPress={() =>
              onChange(
                patchDraft(draft, {
                  late_rule:
                    id === 'none'
                      ? { type: 'none' }
                      : {
                          type: id,
                          amount: draft.late_rule.amount ?? 10,
                          unit: draft.late_rule.unit ?? 'percent',
                        },
                }),
              )
            }
          />
        ))}
      </ChipRow>
      {draft.late_rule.type !== 'none' ? (
        <>
          <TextField
            label="Amount"
            keyboardType="numeric"
            editable={!lateLocked}
            value={draft.late_rule.amount == null ? '' : String(draft.late_rule.amount)}
            onChangeText={(text) => {
              if (lateLocked) return;
              const n = Number(text);
              onChange(
                patchDraft(draft, {
                  late_rule: { ...draft.late_rule, amount: Number.isFinite(n) ? n : 0 },
                }),
              );
            }}
          />
          <ChipRow>
            <Chip
              label="Percent"
              selected={draft.late_rule.unit !== 'points'}
              disabled={lateLocked}
              onPress={() =>
                onChange(patchDraft(draft, { late_rule: { ...draft.late_rule, unit: 'percent' } }))
              }
            />
            <Chip
              label="Points"
              selected={draft.late_rule.unit === 'points'}
              disabled={lateLocked}
              onPress={() =>
                onChange(patchDraft(draft, { late_rule: { ...draft.late_rule, unit: 'points' } }))
              }
            />
          </ChipRow>
        </>
      ) : null}
    </>
  );
}

function EcStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  return (
    <>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        Tip: “Adds bonus points” helps students who do extra credit without hurting students who skip it.
      </Text>
      <ChipRow>
        {(
          [
            ['A', 'Raises or replaces a score'],
            ['B', 'Adds bonus points'],
            ['C', 'Its own category'],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            selected={draft.extra_credit_method === id}
            onPress={() => onChange(patchDraft(draft, { extra_credit_method: id }))}
          />
        ))}
      </ChipRow>
      <TextField
        label="Most extra credit allowed, % (optional)"
        keyboardType="numeric"
        value={draft.ec_cap == null ? '' : String(draft.ec_cap)}
        onChangeText={(text) => {
          const n = text.trim() === '' ? null : Number(text);
          onChange(patchDraft(draft, { ec_cap: n == null || !Number.isFinite(n) ? null : n }));
        }}
      />
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
        Retakes (off unless you turn them on)
      </Text>
      <ChipRow>
        <Chip
          label={draft.retake ? 'Retakes: on' : 'Retakes: off'}
          selected={Boolean(draft.retake)}
          onPress={() =>
            onChange(
              patchDraft(draft, {
                retake: draft.retake
                  ? null
                  : {
                      eligible_category_ids: [],
                      attempts: 2,
                      method: 'higher_of',
                      cap: 70,
                      window_days: null,
                    },
              }),
            )
          }
        />
      </ChipRow>
      {draft.retake ? (
        <>
          <ChipRow>
            {(
              [
                ['replace', 'Use the newest score'],
                ['higher_of', 'Keep the higher score'],
                ['average', 'Average the tries'],
              ] as const
            ).map(([id, label]) => (
              <Chip
                key={id}
                label={label}
                selected={draft.retake?.method === id}
                onPress={() =>
                  onChange(patchDraft(draft, { retake: { ...draft.retake!, method: id } }))
                }
              />
            ))}
          </ChipRow>
          <TextField
            label="Most tries allowed"
            keyboardType="numeric"
            value={String(draft.retake.attempts ?? 2)}
            onChangeText={(text) => {
              const n = Math.max(1, Number(text) || 1);
              onChange(patchDraft(draft, { retake: { ...draft.retake!, attempts: n } }));
            }}
          />
          <TextField
            label="Highest retake grade, % (e.g. 70 in Texas)"
            keyboardType="numeric"
            value={draft.retake.cap == null ? '' : String(draft.retake.cap)}
            onChangeText={(text) => {
              const n = text.trim() === '' ? null : Number(text);
              onChange(
                patchDraft(draft, {
                  retake: {
                    ...draft.retake!,
                    cap: n == null || !Number.isFinite(n) ? null : n,
                  },
                }),
              );
            }}
          />
          <TextField
            label="Days allowed to retake (optional)"
            keyboardType="numeric"
            value={draft.retake.window_days == null ? '' : String(draft.retake.window_days)}
            onChangeText={(text) => {
              const n = text.trim() === '' ? null : Number(text);
              onChange(
                patchDraft(draft, {
                  retake: {
                    ...draft.retake!,
                    window_days: n == null || !Number.isFinite(n) ? null : n,
                  },
                }),
              );
            }}
          />
        </>
      ) : null}
      <TextField
        label="Highest grade allowed for the period, % (optional)"
        keyboardType="numeric"
        value={draft.ceiling == null ? '' : String(draft.ceiling)}
        onChangeText={(text) => {
          const n = text.trim() === '' ? null : Number(text);
          onChange(patchDraft(draft, { ceiling: n == null || !Number.isFinite(n) ? null : n }));
        }}
      />
      <ChipRow>
        <Chip
          label={draft.publish_to_family ? 'Families can see this: Yes' : 'Families can see this: No'}
          selected={draft.publish_to_family}
          onPress={() => onChange(patchDraft(draft, { publish_to_family: !draft.publish_to_family }))}
        />
      </ChipRow>
    </>
  );
}

function BookStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  const bookLocked = isFieldLocked(draft, 'book_mode');
  const rollupLocked = isFieldLocked(draft, 'rollup');
  return (
    <>
      <LockNote draft={draft} field="book_mode" colors={colors} />
      <ChipRow>
        <Chip
          label="Start fresh each grading period"
          selected={draft.book_mode === 'reset_each_marking_period'}
          disabled={bookLocked}
          onPress={() => onChange(patchDraft(draft, { book_mode: 'reset_each_marking_period' }))}
        />
        <Chip
          label="One running average all year"
          selected={draft.book_mode === 'rolling_year'}
          disabled={bookLocked}
          onPress={() => onChange(patchDraft(draft, { book_mode: 'rolling_year' }))}
        />
      </ChipRow>
      <LockNote draft={draft} field="rollup" colors={colors} />
      <TextField
        label="Semester grade formula (e.g. 2/7+1/7)"
        value={draft.rollup_preset ?? ''}
        onChangeText={(text) => {
          if (rollupLocked) return;
          onChange(patchDraft(draft, { rollup_preset: text.trim() || null }));
        }}
      />
      <TextField
        label="Exam weight (optional)"
        keyboardType="numeric"
        value={draft.exam_weight == null ? '' : String(draft.exam_weight)}
        onChangeText={(text) => {
          if (rollupLocked) return;
          const n = text.trim() === '' ? null : Number(text);
          onChange(patchDraft(draft, { exam_weight: n == null || !Number.isFinite(n) ? null : n }));
        }}
      />
      <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>How your year is split</Text>
      <ChipRow>
        {(
          [
            ['quarters', 'Quarters'],
            ['semesters', 'Semesters'],
            ['year', 'Year'],
            ['custom', 'Custom'],
          ] as const
        ).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={draft.term_structure === key}
            onPress={() => onChange(patchDraft(draft, { term_structure: key }))}
          />
        ))}
      </ChipRow>
      <LockNote draft={draft} field="scale" colors={colors} />
      <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>
        Rounding (the letter scale comes from your school when it is set there).
      </Text>
      <ChipRow>
        {(
          [
            ['nearest_whole', 'Round to nearest whole'],
            ['half_up', 'Round .5 up'],
            ['truncate', 'Drop decimals'],
            ['none', "Don't round"],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            selected={draft.rounding === id}
            onPress={() => onChange(patchDraft(draft, { rounding: id }))}
          />
        ))}
      </ChipRow>
    </>
  );
}
function weightTotalText(draft: SyllabusWizardDraft, sum: number): string {
  const split = splitWeights(draft.categories, draft.extra_credit_method);
  return split.extraCredit > 0
    ? `${split.regular}% + ${split.extraCredit}% extra credit`
    : `${Math.round(sum * 1000) / 1000}%`;
}

function ReviewStep({ draft, colors, sum }: { draft: SyllabusWizardDraft; colors: StepColors; sum: number }) {
  const paragraph = parentFacingParagraph(draft);
  return (
    <>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        What families will read about how this class is graded:
      </Text>
      <Text style={[type.body, { color: colors.ink }]}>{paragraph}</Text>
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
        How grades add up: {engineOption(draft.engine).label}
        {isWeightedEngine(draft.engine) ? ` · weights total ${weightTotalText(draft, sum)}` : ''}
        {' · '}{syllabusStatusLabel(draft.syllabus_status)}
      </Text>
      <Text style={[type.meta, { color: canFinishReview(draft) ? colors.good : colors.danger, marginTop: 8 }]}>
        {canFinishReview(draft) ? 'Ready to publish.' : 'Fix the problems listed below before you publish.'}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  catCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10, marginTop: 10 },
});

