/**
 * Step bodies for GB-08 syllabus wizard.
 */
import { Text, View, StyleSheet } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { GRADE_KINDS } from '@/lib/grade/marks';
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
  const why = draft.lock_reasons[field] ?? 'Locked by school policy.';
  return <Text style={[type.meta, { color: colors.warn, marginTop: 6 }]}>Locked — {why}</Text>;
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
        Pick how assignment scores become a period percent.
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
        label="SYLLABUS TITLE"
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
      <TextField label="Label" value={row.label} onChangeText={(label) => onPatch({ label })} />
      <TextField
        label="Weight %"
        keyboardType="numeric"
        value={String(row.weight_percent)}
        onChangeText={(text) => {
          const n = Number(text);
          onPatch({ weight_percent: Number.isFinite(n) ? n : 0 });
        }}
      />
      <ChipRow>
        <Chip label={row.active ? 'Active' : 'Hidden'} selected={row.active} onPress={() => onPatch({ active: !row.active })} />
        <Chip
          label={row.default_include_in_average ? 'Counts by default' : 'Opt-in only'}
          selected={row.default_include_in_average}
          onPress={() => onPatch({ default_include_in_average: !row.default_include_in_average })}
        />
      </ChipRow>
      <Text style={[type.meta, { color: colors.mute }]}>
        key: {row.key}
        {locked ? ' · locked' : ''}
      </Text>
    </View>
  );
}

function CategoriesStep({ draft, colors, onChange, sum }: Omit<Props, 'step'> & { sum: number }) {
  const locked = isFieldLocked(draft, 'categories');
  return (
    <>
      <Text style={[type.meta, { color: sum === 100 ? colors.good : colors.warn }]}>
        Sum {Math.round(sum * 1000) / 1000}%
        {sum < 100 ? ` · ${Math.round((100 - sum) * 1000) / 1000}% left` : sum > 100 ? ' · over 100%' : ' · OK'}
      </Text>
      <LockNote draft={draft} field="categories" colors={colors} />
      <Text style={[type.meta, { color: colors.mute, marginVertical: 8 }]}>
        Empty category default: renormalize (ignore weight until a score exists).
      </Text>
      <ChipRow>
        <Chip
          label="Renormalize empty"
          selected={draft.empty_category === 'renormalize'}
          disabled={locked}
          onPress={() => onChange(setEmptyCategoryPolicy(draft, 'renormalize'))}
        />
        <Chip
          label="Empty = zero"
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
        Worked example: 20-pt quiz vs 100-pt test inside the same category.
      </Text>
      <ChipRow>
        <Chip
          label="Points inside"
          selected={draft.within_category === 'points_inside' || draft.engine === 'weighted_points_inside'}
          onPress={() => onChange(patchDraft(draft, { within_category: 'points_inside' }))}
        />
        <Chip
          label="Equal percent"
          selected={draft.within_category === 'percent_inside' || draft.engine === 'weighted_percent_inside'}
          onPress={() => onChange(patchDraft(draft, { within_category: 'percent_inside' }))}
        />
      </ChipRow>
      <Text style={[type.body, { color: colors.ink, marginTop: 12 }]}>
        {draft.engine === 'weighted_points_inside' || draft.within_category === 'points_inside'
          ? 'Points inside: 80/100 and 16/20 → category uses total points (96/120).'
          : 'Equal percent: 80/100 and 16/20 both count as 80% then average equally.'}
      </Text>
    </>
  );
}

function DropsStep({ draft, colors, onChange }: Omit<Props, 'step'>) {
  return (
    <>
      <LockNote draft={draft} field="drop_lowest" colors={colors} />
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        Drop lowest applies inside one marking period only.
      </Text>
      {draft.categories
        .filter((c) => c.active)
        .map((row) => (
          <View key={row.key} style={{ marginBottom: 10 }}>
            <TextField
              label={`${row.label} · drop lowest N (0–3)`}
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
        label="Period floor % (optional)"
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
  return (
    <>
      <Text style={[type.meta, { color: colors.mute }]}>Missing work</Text>
      <ChipRow>
        {(
          [
            ['omit', 'Omit'],
            ['zero', 'Count as 0'],
            ['floor', 'Use floor'],
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
        Excused always omits earned and possible — never a zero.
      </Text>
      <LockNote draft={draft} field="late" colors={colors} />
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>Late penalty</Text>
      <ChipRow>
        {(
          [
            ['none', 'None / manual'],
            ['flat', 'Flat'],
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
            value={draft.late_rule.amount == null ? '' : String(draft.late_rule.amount)}
            onChangeText={(text) => {
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
              onPress={() =>
                onChange(patchDraft(draft, { late_rule: { ...draft.late_rule, unit: 'percent' } }))
              }
            />
            <Chip
              label="Points"
              selected={draft.late_rule.unit === 'points'}
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
        Method B adds to earned without hurting students who skip EC.
      </Text>
      <ChipRow>
        {(
          [
            ['A', 'A · replace/boost'],
            ['B', 'B · add earned'],
            ['C', 'C · own category'],
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
        label="EC cap % (optional)"
        keyboardType="numeric"
        value={draft.ec_cap == null ? '' : String(draft.ec_cap)}
        onChangeText={(text) => {
          const n = text.trim() === '' ? null : Number(text);
          onChange(patchDraft(draft, { ec_cap: n == null || !Number.isFinite(n) ? null : n }));
        }}
      />
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
        Retakes (default off)
      </Text>
      <ChipRow>
        <Chip
          label={draft.retake ? 'Retakes ON' : 'Retakes OFF'}
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
                ['replace', 'Replace'],
                ['higher_of', 'Higher of'],
                ['average', 'Average'],
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
            label="Max attempts"
            keyboardType="numeric"
            value={String(draft.retake.attempts ?? 2)}
            onChangeText={(text) => {
              const n = Math.max(1, Number(text) || 1);
              onChange(patchDraft(draft, { retake: { ...draft.retake!, attempts: n } }));
            }}
          />
          <TextField
            label="Cap % (e.g. Texas 70)"
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
            label="Window days (optional)"
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
        label="Period ceiling % (optional)"
        keyboardType="numeric"
        value={draft.ceiling == null ? '' : String(draft.ceiling)}
        onChangeText={(text) => {
          const n = text.trim() === '' ? null : Number(text);
          onChange(patchDraft(draft, { ceiling: n == null || !Number.isFinite(n) ? null : n }));
        }}
      />
      <ChipRow>
        <Chip
          label={draft.publish_to_family ? 'Publish to family: Yes' : 'Publish to family: No'}
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
          label="Reset each marking period"
          selected={draft.book_mode === 'reset_each_marking_period'}
          disabled={bookLocked}
          onPress={() => onChange(patchDraft(draft, { book_mode: 'reset_each_marking_period' }))}
        />
        <Chip
          label="Rolling year"
          selected={draft.book_mode === 'rolling_year'}
          disabled={bookLocked}
          onPress={() => onChange(patchDraft(draft, { book_mode: 'rolling_year' }))}
        />
      </ChipRow>
      <LockNote draft={draft} field="rollup" colors={colors} />
      <TextField
        label="Rollup preset (e.g. 2/7+1/7)"
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
      <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>Term structure (legacy)</Text>
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
        Letter scale inherits the school grading policy when locked.
      </Text>
      <ChipRow>
        {(
          [
            ['nearest_whole', 'Round nearest'],
            ['half_up', 'Half up'],
            ['truncate', 'Truncate'],
            ['none', 'No round'],
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
function ReviewStep({ draft, colors, sum }: { draft: SyllabusWizardDraft; colors: StepColors; sum: number }) {
  const paragraph = parentFacingParagraph(draft);
  return (
    <>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        Parent-facing syllabus paragraph (generated from structured fields).
      </Text>
      <Text style={[type.body, { color: colors.ink }]}>{paragraph}</Text>
      <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
        Engine: {engineOption(draft.engine).label}
        {isWeightedEngine(draft.engine) ? ` · weights ${Math.round(sum * 1000) / 1000}%` : ''}
        {' · '}status {draft.syllabus_status}
      </Text>
      <Text style={[type.meta, { color: canFinishReview(draft) ? colors.good : colors.danger, marginTop: 8 }]}>
        {canFinishReview(draft) ? 'Ready to publish.' : 'Fix errors above before publish.'}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  catCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10, marginTop: 10 },
});

