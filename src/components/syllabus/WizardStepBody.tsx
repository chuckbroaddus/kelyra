/**
 * Step bodies for GB-08 syllabus wizard.
 * Radios (full label + help under selected), steppers, switches — no choice ChipRows.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, Switch, Text, View, StyleSheet } from 'react-native';

import { GhostButton, SecondaryButton } from '@/components/ui/Button';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { GRADE_KINDS } from '@/lib/grade/marks';
import { syllabusStatusLabel } from '@/lib/grade/plainLabels';
import { splitWeights } from '@/lib/syllabus/extraCreditWeights';
import { TopicHelpLabel } from '@/components/syllabus/TopicHelp';
import {
  formatExamWeightDisplay,
  formatRollupFormulaDisplay,
  parseExamWeightInput,
} from '@/components/syllabus/schoolPeriodSplit';
import {
  DROP_LOWEST_OPTIONS,
  ENGINE_OPTIONS,
  STEP_LABELS,
  activeWeightSum,
  addCategory,
  canFinishReview,
  clampDropLowest,
  dropLowestCategories,
  engineOption,
  isFieldLocked,
  isWeightedEngine,
  parentFacingParagraph,
  patchCategory,
  patchDraft,
  removeCategory,
  setEmptyCategoryPolicy,
  setWizardStep,
  showExtraCreditCapField,
  showLateAmountFields,
  showMissingFloorField,
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
  elevated?: string;
};

type Props = {
  draft: SyllabusWizardDraft;
  step: WizardStepId;
  colors: StepColors;
  onChange: (d: SyllabusWizardDraft) => void;
};

/** Shared caption under every school-locked control. */
export const LOCKED_BY_SCHOOL = 'This value is locked by your school.';

/**
 * Real control (selected/filled), dimmed, no taps, lock + one muted line.
 * No orange “set by your school” callouts.
 */
export function LockedField({
  locked,
  colors,
  children,
}: {
  locked: boolean;
  colors: StepColors;
  children: ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <View pointerEvents="none" accessibilityState={{ disabled: true }} style={styles.lockedWrap}>
      <View style={styles.lockedDim}>{children}</View>
      <View style={styles.lockedCaptionRow}>
        <Text accessibilityLabel="Locked" style={[styles.lockGlyph, { color: colors.mute }]}>
          {'\u{1F512}'}
        </Text>
        <Text style={[type.meta, { color: colors.mute, flex: 1 }]}>{LOCKED_BY_SCHOOL}</Text>
      </View>
    </View>
  );
}

/** @deprecated Prefer LockedField. Kept for stable imports; always null. */
export function LockNote(_props: {
  draft: SyllabusWizardDraft;
  field: Parameters<typeof isFieldLocked>[1];
  colors: StepColors;
}) {
  return null;
}

function RadioOption({
  label,
  plain,
  selected,
  disabled,
  colors,
  onPress,
}: {
  label: string;
  plain?: string;
  selected: boolean;
  disabled?: boolean;
  colors: StepColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.radio,
        {
          borderColor: selected ? colors.brand : colors.line,
          backgroundColor: selected ? colors.brand + '18' : 'transparent',
        },
      ]}
    >
      <View style={styles.radioTop}>
        <Text style={[type.body, { color: colors.ink, fontWeight: '600', flex: 1 }]}>{label}</Text>
        <View
          style={[
            styles.dot,
            {
              borderColor: selected ? colors.brand : colors.mute,
              backgroundColor: selected ? colors.brand : 'transparent',
            },
          ]}
        />
      </View>
      {selected && plain ? (
        <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>{plain}</Text>
      ) : null}
    </Pressable>
  );
}

function DropStepper({
  label,
  value,
  disabled,
  colors,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  colors: StepColors;
  onChange: (n: number) => void;
}) {
  const v = clampDropLowest(value);
  return (
    <View style={[styles.stepper, { borderColor: colors.line }]} accessibilityRole="adjustable">
      <Text style={[type.body, { color: colors.ink, fontWeight: '600', flex: 1 }]}>{label}</Text>
      <View style={styles.pills}>
        {DROP_LOWEST_OPTIONS.map((n) => {
          const on = n === v;
          return (
            <Pressable
              key={n}
              disabled={disabled}
              onPress={() => onChange(n)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.pill,
                { backgroundColor: on ? colors.brand : colors.line },
              ]}
            >
              <Text style={{ color: on ? '#1a120c' : colors.mute, fontWeight: '700', fontSize: 13 }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SwitchRow({
  title,
  subtitle,
  value,
  disabled,
  colors,
  onValueChange,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  disabled?: boolean;
  colors: StepColors;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.switchRow, { borderColor: colors.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: colors.ink, fontWeight: '600' }]}>{title}</Text>
        {subtitle ? <Text style={[type.meta, { color: colors.mute, marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        accessibilityLabel={title}
        trackColor={{ false: colors.line, true: colors.brand }}
      />
    </View>
  );
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
  return <ReviewStep draft={draft} colors={colors} sum={sum} onChange={onChange} />;
}

function EngineStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  const locked = isFieldLocked(draft, 'engine');
  return (
    <>
      <LockedField locked={locked} colors={colors}>
        {ENGINE_OPTIONS.map((opt) => (
          <RadioOption
            key={opt.id}
            label={opt.label}
            plain={opt.plain}
            selected={draft.engine === opt.id}
            disabled={locked}
            colors={colors}
            onPress={() => onChange(patchDraft(draft, { engine: opt.id }))}
          />
        ))}
      </LockedField>
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
  onDelete,
}: {
  row: SyllabusCategoryDraft;
  colors: StepColors;
  locked: boolean;
  onPatch: (p: Partial<SyllabusCategoryDraft>) => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.catCard, { borderColor: colors.line }]}>
      <TextField
        label="Category name"
        value={row.label}
        editable={!locked}
        onChangeText={(label) => onPatch({ label })}
      />
      <TextField
        label="Weight (%)"
        keyboardType="numeric"
        editable={!locked}
        value={String(row.weight_percent)}
        onChangeText={(text) => {
          if (locked) return;
          const n = Number(text);
          onPatch({ weight_percent: Number.isFinite(n) ? n : 0 });
        }}
      />
      <SwitchRow
        title="In use"
        value={row.active}
        disabled={locked}
        colors={colors}
        onValueChange={(active) => onPatch({ active })}
      />
      <SwitchRow
        title="Counts in the average"
        subtitle={row.default_include_in_average ? 'Counts in the average' : 'Recorded, not in the grade'}
        value={row.default_include_in_average}
        disabled={locked}
        colors={colors}
        onValueChange={(default_include_in_average) => onPatch({ default_include_in_average })}
      />
      {!locked ? <GhostButton align="left" label="Delete category" onPress={onDelete} /> : null}
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
  const [addOpen, setAddOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const available = GRADE_KINDS.filter((k) => !draft.categories.some((c) => c.key === k.key));
  return (
    <>
      <WeightTotalLine draft={draft} colors={colors} sum={sum} />
      <TopicHelpLabel title="If a category has no grades yet" topicKey="help.empty_category" colors={colors} marginTop={8} />
      <LockedField locked={locked} colors={colors}>
        <RadioOption
          label="Skip it until it has grades"
          selected={draft.empty_category === 'renormalize'}
          disabled={locked}
          colors={colors}
          onPress={() => onChange(setEmptyCategoryPolicy(draft, 'renormalize'))}
        />
        <RadioOption
          label="Count it as zero"
          selected={draft.empty_category === 'zero'}
          disabled={locked}
          colors={colors}
          onPress={() => onChange(setEmptyCategoryPolicy(draft, 'zero'))}
        />
        {draft.categories.map((row) => (
          <CategoryCard
            key={row.key}
            row={row}
            colors={colors}
            locked={locked}
            onPatch={(partial) => onChange(patchCategory(draft, row.key, partial))}
            onDelete={() => onChange(removeCategory(draft, row.key))}
          />
        ))}
      </LockedField>
      {!locked ? <SecondaryButton label="Add category" onPress={() => setAddOpen(true)} fullWidth /> : null}
      <FormSheet visible={addOpen} title="Add category" onClose={() => setAddOpen(false)}>
        {available.map((k) => (
          <GhostButton
            key={k.key}
            align="left"
            label={k.label}
            onPress={() => {
              onChange(addCategory(draft, k));
              setAddOpen(false);
            }}
          />
        ))}
        <TextField label="Custom name" value={customLabel} onChangeText={setCustomLabel} placeholder="Labs" />
        <GhostButton
          align="left"
          label="Add custom"
          onPress={() => {
            onChange(addCategory(draft, { label: customLabel.trim() || 'Other' }));
            setCustomLabel('');
            setAddOpen(false);
          }}
        />
      </FormSheet>
    </>
  );
}

function WithinStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  return (
    <>
      <TopicHelpLabel
        title="How assignments count inside a category"
        topicKey="help.engine.weighted_percent"
        colors={colors}
        marginTop={0}
      />
      <RadioOption
        label="Bigger assignments count more"
        plain="Points count: 80/100 and 16/20 are added up, so the category is 96/120 (80%)."
        selected={draft.within_category === 'points_inside' || draft.engine === 'weighted_points_inside'}
        colors={colors}
        onPress={() => onChange(patchDraft(draft, { within_category: 'points_inside' }))}
      />
      <RadioOption
        label="Every assignment counts the same"
        plain="All equal: 80/100 and 16/20 are each 80%, and the two are averaged the same."
        selected={draft.within_category === 'percent_inside' || draft.engine === 'weighted_percent_inside'}
        colors={colors}
        onPress={() => onChange(patchDraft(draft, { within_category: 'percent_inside' }))}
      />
    </>
  );
}

function DropsStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  const dropLocked = isFieldLocked(draft, 'drop_lowest');
  const floorLocked = isFieldLocked(draft, 'floor');
  return (
    <>
      <TopicHelpLabel title="Drop lowest scores" topicKey="help.drop_lowest" colors={colors} marginTop={0} />
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>0 means drop nothing.</Text>
      <LockedField locked={dropLocked} colors={colors}>
        {dropLowestCategories(draft.categories).map((row) => (
          <DropStepper
            key={row.key}
            label={row.label}
            value={row.rules?.drop_lowest_n ?? 0}
            disabled={dropLocked}
            colors={colors}
            onChange={(n) =>
              onChange(
                patchCategory(draft, row.key, { rules: { ...row.rules, drop_lowest_n: clampDropLowest(n) } }),
              )
            }
          />
        ))}
      </LockedField>
      <LockedField locked={floorLocked} colors={colors}>
        <TextField
          label="Lowest grade allowed for the period, % (optional)"
          keyboardType="numeric"
          editable={!floorLocked}
          value={draft.floor == null ? '' : String(draft.floor)}
          onChangeText={(text) => {
            if (floorLocked) return;
            const n = text.trim() === '' ? null : Number(text);
            onChange(patchDraft(draft, { floor: n == null || !Number.isFinite(n) ? null : n }));
          }}
        />
      </LockedField>
    </>
  );
}

function StatusLateStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  const lateLocked = isFieldLocked(draft, 'late');
  const missingPlains: Record<string, string> = {
    omit: 'Left out until a score is entered.',
    zero: 'Missing work counts as zero until a score is entered.',
    floor: 'Missing work gets the lowest grade allowed for the period.',
  };
  return (
    <>
      <TopicHelpLabel title="Missing work" topicKey="help.missing" colors={colors} marginTop={0} />
      {(
        [
          ['omit', "Doesn't count yet"],
          ['zero', 'Count as 0'],
          ['floor', 'Lowest grade allowed'],
        ] as const
      ).map(([id, label]) => (
        <RadioOption
          key={id}
          label={label}
          plain={missingPlains[id]}
          selected={draft.missing_rule === id}
          colors={colors}
          onPress={() => onChange(patchDraft(draft, { missing_rule: id }))}
        />
      ))}
      {showMissingFloorField(draft) ? (
        <TextField
          label="Lowest grade allowed, %"
          keyboardType="numeric"
          value={draft.floor == null ? '' : String(draft.floor)}
          onChangeText={(text) => {
            const n = text.trim() === '' ? null : Number(text);
            onChange(patchDraft(draft, { floor: n == null || !Number.isFinite(n) ? null : n }));
          }}
        />
      ) : null}
      <TopicHelpLabel title="Excused" topicKey="help.excused" colors={colors} />
      <TopicHelpLabel title="Late penalty" topicKey="help.late" colors={colors} />
      <LockedField locked={lateLocked} colors={colors}>
        {(
          [
            ['none', 'None, I adjust by hand'],
            ['flat', 'One time'],
            ['per_day', 'Per day'],
            ['per_hour', 'Per hour'],
          ] as const
        ).map(([id, label]) => (
          <RadioOption
            key={id}
            label={label}
            selected={draft.late_rule.type === id}
            disabled={lateLocked}
            colors={colors}
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
        {showLateAmountFields(draft) ? (
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
            <RadioOption
              label="Percent"
              selected={draft.late_rule.unit !== 'points'}
              disabled={lateLocked}
              colors={colors}
              onPress={() =>
                onChange(patchDraft(draft, { late_rule: { ...draft.late_rule, unit: 'percent' } }))
              }
            />
            <RadioOption
              label="Points"
              selected={draft.late_rule.unit === 'points'}
              disabled={lateLocked}
              colors={colors}
              onPress={() =>
                onChange(patchDraft(draft, { late_rule: { ...draft.late_rule, unit: 'points' } }))
              }
            />
          </>
        ) : null}
      </LockedField>
    </>
  );
}

function EcStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  const plains: Record<string, string> = {
    A: 'Skipping it does nothing to the grade.',
    B: 'Sits on top of the grade. Skipping it does not lower anyone.',
    C: 'Extra credit is weighted as its own category on top of 100%.',
  };
  return (
    <>
      <TopicHelpLabel title="Extra credit" topicKey="help.extra_credit_b" colors={colors} marginTop={0} />
      {(
        [
          ['A', 'Raises or replaces a score'],
          ['B', 'Adds bonus points'],
          ['C', 'Its own category'],
        ] as const
      ).map(([id, label]) => (
        <RadioOption
          key={id}
          label={label}
          plain={plains[id]}
          selected={draft.extra_credit_method === id}
          colors={colors}
          onPress={() => onChange(patchDraft(draft, { extra_credit_method: id }))}
        />
      ))}
      {showExtraCreditCapField(draft) ? (
        <TextField
          label="Most extra credit allowed, % (optional)"
          keyboardType="numeric"
          value={draft.ec_cap == null ? '' : String(draft.ec_cap)}
          onChangeText={(text) => {
            const n = text.trim() === '' ? null : Number(text);
            onChange(patchDraft(draft, { ec_cap: n == null || !Number.isFinite(n) ? null : n }));
          }}
        />
      ) : null}
      <SwitchRow
        title="Retakes"
        subtitle="Off unless you turn them on"
        value={Boolean(draft.retake)}
        colors={colors}
        onValueChange={(on) =>
          onChange(
            patchDraft(draft, {
              retake: on
                ? draft.retake ?? {
                    eligible_category_ids: [],
                    attempts: 2,
                    method: 'higher_of',
                    cap: 70,
                    window_days: null,
                  }
                : null,
            }),
          )
        }
      />
      {draft.retake ? (
        <>
          {(
            [
              ['replace', 'Use the newest score'],
              ['higher_of', 'Keep the higher score'],
              ['average', 'Average the tries'],
            ] as const
          ).map(([id, label]) => (
            <RadioOption
              key={id}
              label={label}
              selected={draft.retake?.method === id}
              colors={colors}
              onPress={() => onChange(patchDraft(draft, { retake: { ...draft.retake!, method: id } }))}
            />
          ))}
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
      <SwitchRow
        title="Families can see this"
        value={draft.publish_to_family}
        colors={colors}
        onValueChange={(publish_to_family) => onChange(patchDraft(draft, { publish_to_family }))}
      />
    </>
  );
}

function BookStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  const bookLocked = isFieldLocked(draft, 'book_mode');
  const rollupLocked = isFieldLocked(draft, 'rollup');
  const scaleLocked = isFieldLocked(draft, 'scale');
  const schoolSplit = draft.school_period_split;
  const periodLocked = Boolean(schoolSplit);
  // Derive teacher-facing copy from preset weights (+ school period model), not "2/7+1/7 · …".
  const rollupDisplay = formatRollupFormulaDisplay(draft.rollup_preset, {
    period_model: schoolSplit?.period_model != null ? String(schoolSplit.period_model) : null,
  });
  const examWeightDisplay = formatExamWeightDisplay(draft.exam_weight);
  const scale = draft.school_scale;
  return (
    <>
      <TopicHelpLabel title="Fresh start or running average" topicKey="help.book_mode" colors={colors} marginTop={0} />
      <LockedField locked={bookLocked} colors={colors}>
        <RadioOption
          label="Start fresh each grading period"
          selected={draft.book_mode === 'reset_each_marking_period'}
          disabled={bookLocked}
          colors={colors}
          onPress={() => onChange(patchDraft(draft, { book_mode: 'reset_each_marking_period' }))}
        />
        <RadioOption
          label="One running average all year"
          selected={draft.book_mode === 'rolling_year'}
          disabled={bookLocked}
          colors={colors}
          onPress={() => onChange(patchDraft(draft, { book_mode: 'rolling_year' }))}
        />
      </LockedField>
      <TopicHelpLabel title="Semester grade formula" topicKey="help.rollup.2_7" colors={colors} />
      <LockedField locked={rollupLocked} colors={colors}>
        <TextField
          label={rollupLocked ? 'Semester grade formula' : 'Semester grade formula (e.g. 2/7+1/7)'}
          value={
            rollupLocked
              ? rollupDisplay || (draft.rollup_preset ?? '')
              : (draft.rollup_preset ?? '')
          }
          editable={!rollupLocked}
          onChangeText={(text) => onChange(patchDraft(draft, { rollup_preset: text.trim() || null }))}
        />
        <TextField
          label={rollupLocked ? 'Exam weight' : 'Exam weight (%)'}
          keyboardType="numeric"
          editable={!rollupLocked}
          value={
            rollupLocked
              ? examWeightDisplay || (draft.exam_weight == null ? 'None' : formatExamWeightDisplay(draft.exam_weight))
              : draft.exam_weight == null
                ? ''
                : String(draft.exam_weight)
          }
          onChangeText={(text) => {
            if (rollupLocked) return;
            onChange(patchDraft(draft, { exam_weight: parseExamWeightInput(text) }));
          }}
        />
      </LockedField>
      <Text style={[type.meta, { color: colors.mute, marginTop: 8, fontWeight: '600' }]}>How the year is split</Text>
      <LockedField locked={periodLocked} colors={colors}>
        {periodLocked && schoolSplit ? (
          <RadioOption
            label={schoolSplit.summary_label}
            plain={schoolSplit.period_names.length ? schoolSplit.period_names.join(' · ') : undefined}
            selected
            disabled
            colors={colors}
            onPress={() => {}}
          />
        ) : (
          (
            [
              ['quarters', 'Quarters'],
              ['semesters', 'Semesters'],
              ['year', 'Year'],
              ['custom', 'Custom'],
            ] as const
          ).map(([key, label]) => (
            <RadioOption
              key={key}
              label={label}
              selected={draft.term_structure === key}
              colors={colors}
              onPress={() => onChange(patchDraft(draft, { term_structure: key }))}
            />
          ))
        )}
      </LockedField>
      <Text style={[type.meta, { color: colors.mute, marginTop: 8, fontWeight: '600' }]}>Letter grade scale</Text>
      <LockedField locked={scaleLocked} colors={colors}>
        {scale ? (
          <View style={[styles.scaleTable, { borderColor: colors.line }]}>
            <Text style={[type.meta, { color: colors.ink, fontWeight: '600', marginBottom: 6 }]}>
              {scale.name}
              {Number.isFinite(scale.passing_pct) ? ` · ${scale.passing_pct} is passing` : ''}
            </Text>
            {scale.bands.map((b, i) => (
              <View key={`${b.letter}-${i}`} style={[styles.scaleRow, { borderBottomColor: colors.line }]}>
                <Text style={[type.body, { color: colors.ink, fontWeight: '600', width: 40 }]}>{b.letter}</Text>
                <Text style={[type.meta, { color: colors.mute, flex: 1 }]}>
                  {Math.round(b.min_pct)}–{Math.round(b.max_pct)}%
                  {b.passing ? '' : ' · not passing'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>
            Letter grade scale from your school.
          </Text>
        )}
      </LockedField>
      <Text style={[type.meta, { color: colors.mute, marginTop: 8, fontWeight: '600' }]}>Rounding</Text>
      {(
        [
          ['nearest_whole', 'Round to nearest whole'],
          ['half_up', 'Round .5 up'],
          ['truncate', 'Drop decimals'],
          ['none', "Don't round"],
        ] as const
      ).map(([id, label]) => (
        <RadioOption
          key={id}
          label={label}
          selected={draft.rounding === id}
          colors={colors}
          onPress={() => onChange(patchDraft(draft, { rounding: id }))}
        />
      ))}
    </>
  );
}

function weightTotalText(draft: SyllabusWizardDraft, sum: number): string {
  const split = splitWeights(draft.categories, draft.extra_credit_method);
  return split.extraCredit > 0
    ? `${split.regular}% + ${split.extraCredit}% extra credit`
    : `${Math.round(sum * 1000) / 1000}%`;
}

function ReviewStep({
  draft,
  colors,
  sum,
  onChange,
}: {
  draft: SyllabusWizardDraft;
  colors: StepColors;
  sum: number;
  onChange: (d: SyllabusWizardDraft) => void;
}) {
  const paragraph = parentFacingParagraph(draft);
  const drops =
    draft.categories
      .filter((c) => c.active && Number(c.rules?.drop_lowest_n ?? 0) > 0)
      .map((c) => `${c.rules.drop_lowest_n} ${c.label}`)
      .join(', ') || 'None';
  const late =
    draft.late_rule.type === 'none'
      ? 'By hand'
      : draft.late_rule.type === 'flat'
        ? 'One time'
        : draft.late_rule.type === 'per_day'
          ? 'Per day'
          : 'Per hour';
  const miss =
    draft.missing_rule === 'zero'
      ? 'Count as 0'
      : draft.missing_rule === 'floor'
        ? 'Lowest grade allowed'
        : "Doesn't count yet";
  const weights = isWeightedEngine(draft.engine)
    ? draft.categories
        .filter((c) => c.active)
        .map((c) => Math.round(Number(c.weight_percent) * 1000) / 1000)
        .join(' / ')
    : '—';
  const checks: Array<{ step: WizardStepId; label: string; value: string }> = [
    { step: 'engine', label: STEP_LABELS.engine, value: engineOption(draft.engine).label },
    { step: 'categories', label: STEP_LABELS.categories, value: weights },
    { step: 'drops', label: STEP_LABELS.drops, value: drops },
    { step: 'status_late', label: 'Missing', value: miss },
    { step: 'status_late', label: 'Late', value: late },
    {
      step: 'extra_credit',
      label: STEP_LABELS.extra_credit,
      value:
        draft.extra_credit_method === 'A'
          ? 'Raises or replaces'
          : draft.extra_credit_method === 'C'
            ? 'Own category'
            : 'Bonus points',
    },
    {
      step: 'book_rollup',
      label: STEP_LABELS.book_rollup,
      value: [
        draft.book_mode === 'rolling_year' ? 'Running average' : 'Fresh each period',
        draft.school_period_split?.summary_label ?? null,
      ]
        .filter(Boolean)
        .join(' · '),
    },
  ];
  return (
    <>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        What families will read about how this class is graded:
      </Text>
      <View style={[styles.family, { borderColor: colors.line }]}>
        <Text style={[type.body, { color: colors.ink }]}>{paragraph}</Text>
      </View>
      {checks.map((row, i) => (
        <Pressable
          key={`${row.label}-${i}`}
          onPress={() => onChange(setWizardStep(draft, row.step))}
          style={[styles.check, { borderBottomColor: colors.line }]}
        >
          <Text style={[type.meta, { color: colors.mute }]}>{row.label}</Text>
          <Text style={[type.body, { color: colors.ink, fontWeight: '600', textAlign: 'right', flex: 1 }]}>
            {row.value}
          </Text>
        </Pressable>
      ))}
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
        How grades add up: {engineOption(draft.engine).label}
        {isWeightedEngine(draft.engine) ? ` · weights total ${weightTotalText(draft, sum)}` : ''}
        {' · '}
        {syllabusStatusLabel(draft.syllabus_status)}
      </Text>
      <Text
        style={[
          type.meta,
          { color: canFinishReview(draft) ? colors.good : colors.danger, marginTop: 8, fontWeight: '600' },
        ]}
      >
        {canFinishReview(draft) ? 'Ready to publish.' : 'Fix the problems listed below before you publish.'}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  catCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10, marginTop: 10, gap: 6 },
  radio: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  radioTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 8,
  },
  pills: { flexDirection: 'row', gap: 6 },
  pill: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  lock: { borderRadius: 10, padding: 8, marginVertical: 6 },
  lockedWrap: { marginBottom: 4 },
  lockedDim: { opacity: 0.55 },
  lockedCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  lockGlyph: { fontSize: 13, lineHeight: 16 },
  scaleTable: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  family: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10, marginBottom: 10 },
  check: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

