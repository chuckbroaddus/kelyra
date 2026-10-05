import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { DateInput } from '@/components/ui/DateInput';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { IconButton } from '@/components/ui/IconButton';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import type { AssignmentInput } from '@/lib/assignments/api';
import { deriveKeyKind, emptyKeyItem, keyMaxScore, type AnswerKeyItem, type AnswerKeyKind } from '@/lib/assignments/keys';
import { addDaysISO, toISODate, todayISO } from '@/lib/date/iso';
import {
  GRADE_KINDS,
  GRADE_TERMS,
  SCORE_SCHEMES,
  WEIGHT_BANDS,
  defaultGradeTermForDate,
  type ChecklistSkill,
  type GradeKind,
  type GradeTerm,
  type ScoreScheme,
  type WeightBand,
} from '@/lib/grade/marks';
import {
  WORK_KINDS,
  defaultCategoryForWorkKind,
  defaultIncludeInAverageForWorkKind,
  defaultScoreSchemeForWorkKind,
  mapWorkKindToSyllabusCategory,
  parseWorkKind,
  type WorkKind,
} from '@/lib/grade/workKinds';
import { EMPTY_CATALOG_COPY } from '@/lib/lessons/allowlist';
import { packKey } from '@/lib/lessons/protocol';
import type { LessonPackRow } from '@/lib/supabase/types';
import { defaultCalendarPublished } from '@/lib/calendar/visibility';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type AssignmentWorkKind = 'planned' | 'lesson';

export type AssignmentFormValue = {
  workKind: AssignmentWorkKind;
  /** Canonical work kind (homework, pop quiz, memory verse, …). */
  gradeWorkKind: WorkKind;
  packKey: string;
  title: string;
  category: GradeKind | string;
  dueDate: string;
  weightBand: WeightBand;
  weightPercent: string;
  term: GradeTerm;
  scoreScheme: ScoreScheme;
  includeInAverage: boolean;
  isMakeup: boolean;
  keyKind: AnswerKeyKind;
  keyNotes: string;
  keyPassAt: string;
  keyItems: AnswerKeyItem[];
  keyAssetId: string | null;
  keyPhotoUrl: string | null;
  keyPhash: string | null;
  keyLayout: number[] | null;
  keyHeader: string | null;
  keyPageState: 'blank' | 'filled' | 'unsure' | null;
  unit: string;
  section: string;
  helpMode: 'off' | 'hints' | 'steps_after_try' | 'check_work';
  /** Assign ≠ publish. When due is set: family calendar visibility. */
  showOnFamilyCalendar: boolean;
  /** Kindergarten / early-elementary skill list when scoreScheme is checklist. */
  checklistSkills: ChecklistSkill[];
};

export type SyllabusCategoryOption = {
  key: string;
  label: string;
  weight_percent: number;
  default_include_in_average: boolean;
  default_score_scheme?: ScoreScheme | string | null;
};

export function emptyAssignmentForm(seed?: {
  title?: string;
  category?: string;
  gradeWorkKind?: string;
  includeInAverage?: boolean;
  scoreScheme?: ScoreScheme;
}): AssignmentFormValue {
  const gradeWorkKind = parseWorkKind(seed?.gradeWorkKind ?? seed?.category ?? 'homework');
  const category = seed?.category?.trim() || defaultCategoryForWorkKind(gradeWorkKind);
  const scoreScheme = seed?.scoreScheme ?? defaultScoreSchemeForWorkKind(gradeWorkKind);
  const includeDefault =
    seed?.includeInAverage ??
    (scoreScheme === 'pass_fail' ? false : defaultIncludeInAverageForWorkKind(gradeWorkKind));
  return {
    workKind: 'planned',
    gradeWorkKind,
    packKey: '',
    title: seed?.title ?? '',
    category,
    dueDate: '',
    weightBand: 'none',
    weightPercent: '',
    term: defaultGradeTermForDate(new Date()),
    scoreScheme,
    includeInAverage: includeDefault,
    isMakeup: false,
    keyKind: 'none',
    keyNotes: '',
    keyPassAt: '',
    keyItems: [],
    keyAssetId: null,
    keyPhotoUrl: null,
    keyPhash: null,
    keyLayout: null,
    keyHeader: null,
    keyPageState: null,
    unit: '',
    section: '',
    helpMode: 'off',
    showOnFamilyCalendar: defaultCalendarPublished(gradeWorkKind),
    checklistSkills: [],
  };
}

type Props = {
  value: AssignmentFormValue;
  onChange: (next: AssignmentFormValue) => void;
  busy?: boolean;
  keyBusy?: boolean;
  keyStatus?: string | null;
  /** Key photo read failed or was rejected (wrong document). Shown next to the photo, not at page bottom. */
  keyError?: string | null;
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
  onPickKeyPhoto?: () => void;
  onClearKeyPhoto?: () => void;
  unitSuggestions?: string[];
  sectionSuggestions?: string[];
  packs?: LessonPackRow[];
  taughtClasses?: Array<{ id: string; name: string }>;
  selectedClassIds?: string[];
  onToggleClass?: (classId: string) => void;
  classLocked?: boolean;
  studentLockedName?: string | null;
  lockWorkKind?: boolean;
  hidePackPicker?: boolean;
  /** Published syllabus categories for this class. When set, Kind chips use these. */
  syllabusCategories?: SyllabusCategoryOption[] | null;
};

export function AssignmentForm({
  value,
  onChange,
  busy,
  keyBusy,
  keyStatus,
  keyError,
  submitLabel,
  onSubmit,
  onCancel,
  onPickKeyPhoto,
  onClearKeyPhoto,
  unitSuggestions = [],
  sectionSuggestions = [],
  packs = [],
  taughtClasses = [],
  selectedClassIds = [],
  onToggleClass,
  classLocked,
  studentLockedName,
  lockWorkKind,
  hidePackPicker,
  syllabusCategories = null,
}: Props) {
  const { colors } = useTheme();
  const [dueError, setDueError] = useState<string | null>(null);
  const patch = (partial: Partial<AssignmentFormValue>) => onChange({ ...value, ...partial });
  const lesson = value.workKind === 'lesson';
  const showItems = !lesson && (value.keyKind === 'items' || value.keyKind === 'both' || value.keyItems.length > 0);
  const showPhoto = !lesson && (value.keyKind === 'photo' || value.keyKind === 'both' || Boolean(value.keyPhotoUrl));
  const whoOk = classLocked || selectedClassIds.length > 0;
  const dueIso = value.dueDate.trim() || null;
  const saveDisabled = busy || keyBusy || !value.title.trim() || !whoOk || (lesson && !hidePackPicker && !value.packKey);
  const syllabusPublished = Boolean(syllabusCategories && syllabusCategories.length);
  const kindOptions = syllabusPublished
    ? syllabusCategories!
    : GRADE_KINDS.map((row) => ({
        key: row.key,
        label: row.label,
        weight_percent: 0,
        default_include_in_average: defaultIncludeInAverageForWorkKind(row.key),
        default_score_scheme: defaultScoreSchemeForWorkKind(row.key),
      }));
  const selectedKind = kindOptions.find((row) => row.key === value.category);

  const applyWorkKind = (kind: WorkKind) => {
    const mapped = syllabusPublished
      ? mapWorkKindToSyllabusCategory(kind, kindOptions) ?? defaultCategoryForWorkKind(kind)
      : defaultCategoryForWorkKind(kind);
    const cat = kindOptions.find((row) => row.key === mapped);
    const scheme =
      (cat?.default_score_scheme as ScoreScheme | undefined) ?? defaultScoreSchemeForWorkKind(kind);
    const include =
      scheme === 'pass_fail'
        ? false
        : cat
          ? cat.default_include_in_average === true
          : defaultIncludeInAverageForWorkKind(kind);
    patch({
      gradeWorkKind: kind,
      category: mapped,
      scoreScheme: scheme,
      includeInAverage: include,
      showOnFamilyCalendar: defaultCalendarPublished(kind),
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Type</Text>
      <ChipRow>
        <Chip
          label="Lesson"
          selected={lesson}
          disabled={lockWorkKind}
          onPress={() => patch({ workKind: 'lesson' })}
        />
        <Chip
          label="Practice"
          selected={!lesson}
          disabled={lockWorkKind}
          onPress={() => patch({ workKind: 'planned' })}
        />
      </ChipRow>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Kind of work</Text>
      <Text style={[type.meta, { color: colors.mute }]}>
        Suggests a grade-book category. You can refile below. Memory verse and Bible quiz are included.
      </Text>
      <ChipRow>
        {WORK_KINDS.map((kind) => (
          <Chip
            key={kind.key}
            label={kind.label}
            selected={value.gradeWorkKind === kind.key}
            onPress={() => applyWorkKind(kind.key)}
          />
        ))}
      </ChipRow>
      {studentLockedName ? (
        <Text style={[type.meta, { color: colors.mute }]}>Assigned to {studentLockedName} only.</Text>
      ) : null}
      {!classLocked && taughtClasses.length ? (
        <>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Class</Text>
          <Text style={[type.meta, { color: colors.mute }]}>Choose a class or multiple classes.</Text>
          <ChipRow>
            {taughtClasses.map((klass) => (
              <Chip
                key={klass.id}
                label={klass.name}
                selected={selectedClassIds.includes(klass.id)}
                onPress={() => onToggleClass?.(klass.id)}
              />
            ))}
          </ChipRow>
        </>
      ) : null}
      {lesson && !hidePackPicker ? (
        <>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Lesson</Text>
          {packs.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute }]}>{EMPTY_CATALOG_COPY}</Text>
          ) : (
            <ChipRow>
              {packs.map((pack) => {
                const key = packKey(pack.deck_id, pack.version);
                return (
                  <Chip
                    key={pack.id}
                    label={pack.title}
                    selected={value.packKey === key}
                    onPress={() =>
                      patch({
                        packKey: key,
                        title: value.title.trim() && value.title !== pack.title ? value.title : pack.title,
                      })
                    }
                  />
                );
              })}
            </ChipRow>
          )}
        </>
      ) : null}
      <TextField
        label="TITLE"
        placeholder="Enter a title for the assignment"
        value={value.title}
        onChangeText={(title) => patch({ title })}
      />
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>For the grade book</Text>
      <Text style={[type.meta, { color: colors.mute }]}>
        Optional. The grade book groups rows by class, then unit, then section.
      </Text>
      <TextField
        label="Unit"
        placeholder="Enter a unit number (e.g. 3)"
        value={value.unit}
        onChangeText={(unit) => patch({ unit })}
      />
      {unitSuggestions.length ? (
        <ChipRow>
          {unitSuggestions.map((unit) => (
            <Chip key={unit} label={unit} selected={value.unit === unit} onPress={() => patch({ unit })} />
          ))}
        </ChipRow>
      ) : null}
      <TextField
        label="Section"
        placeholder="Enter a section number (e.g. 2)"
        value={value.section}
        onChangeText={(section) => patch({ section })}
      />
      {sectionSuggestions.length ? (
        <ChipRow>
          {sectionSuggestions.map((section) => (
            <Chip
              key={section}
              label={section}
              selected={value.section === section}
              onPress={() => patch({ section })}
            />
          ))}
        </ChipRow>
      ) : null}
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Assignment (grade) category</Text>
      {syllabusPublished ? (
        <Text style={[type.meta, { color: colors.mute }]}>
          {selectedKind
            ? `Counts toward the ${selectedKind.label} average (${selectedKind.weight_percent}%).`
            : 'Pick a category from this class syllabus.'}
        </Text>
      ) : (
        <Text style={[type.meta, { color: colors.mute }]}>
          Class syllabus not published — category is a label only.
        </Text>
      )}
      <ChipRow>
        {kindOptions.map((kind) => (
          <Chip
            key={kind.key}
            label={kind.label}
            selected={value.category === kind.key}
            onPress={() => {
              const scheme =
                (kind.default_score_scheme as ScoreScheme | undefined) ?? value.scoreScheme;
              patch({
                category: kind.key,
                scoreScheme: scheme,
                includeInAverage:
                  scheme === 'pass_fail' ? false : kind.default_include_in_average === true,
                showOnFamilyCalendar: defaultCalendarPublished(value.gradeWorkKind || kind.key),
              });
            }}
          />
        ))}
      </ChipRow>
      <ChipRow>
        <Chip
          label={
            selectedKind
              ? value.includeInAverage
                ? `Counts toward ${selectedKind.label} average`
                : `Does not count toward ${selectedKind.label} average`
              : value.includeInAverage
                ? 'Counts toward type average'
                : 'Does not count toward type average'
          }
          selected={value.includeInAverage}
          onPress={() => patch({ includeInAverage: !value.includeInAverage })}
        />
        <Chip
          label={value.isMakeup ? 'Makeup column' : 'Not makeup'}
          selected={value.isMakeup}
          onPress={() => patch({ isMakeup: !value.isMakeup })}
        />
      </ChipRow>
      <DateInput
        label="DUE DATE"
        mode="due"
        value={dueIso}
        required
        clearable
        errorText={dueError}
        onChange={(iso) => {
          setDueError(null);
          patch({ dueDate: iso ?? '' });
        }}
      />

      {value.dueDate.trim() ? (
        <>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
            Family calendar
          </Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            Assigning work does not publish the due date. Quiz, pop quiz, and test kinds default hidden —
            you choose per item.
          </Text>
          <ChipRow>
            <Chip
              label={
                value.showOnFamilyCalendar
                  ? 'Show on student/parent calendar'
                  : 'Hide on family calendar'
              }
              selected={value.showOnFamilyCalendar}
              onPress={() => patch({ showOnFamilyCalendar: !value.showOnFamilyCalendar })}
            />
          </ChipRow>
        </>
      ) : null}
      <ChipRow>
        <Chip
          label="Tomorrow"
          selected={value.dueDate === isoDate(1)}
          onPress={() => {
            setDueError(null);
            patch({ dueDate: isoDate(1) });
          }}
        />
        <Chip
          label="Next week"
          selected={value.dueDate === isoDate(7)}
          onPress={() => {
            setDueError(null);
            patch({ dueDate: isoDate(7) });
          }}
        />
        <Chip
          label="Clear"
          selected={!value.dueDate.trim()}
          onPress={() => {
            setDueError(null);
            patch({ dueDate: '' });
          }}
        />
      </ChipRow>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Mark</Text>
      <ChipRow>
        {SCORE_SCHEMES.map((scheme) => (
          <Chip
            key={scheme.key}
            label={scheme.label}
            selected={value.scoreScheme === scheme.key}
            onPress={() =>
              patch({
                scoreScheme: scheme.key,
                includeInAverage:
                  scheme.key === 'pass_fail' ? false : value.includeInAverage,
              })
            }
          />
        ))}
      </ChipRow>
      {value.scoreScheme === 'checklist' ? (
        <>
          <Text style={[type.meta, { color: colors.mute }]}>
            Early-elementary skill list. Mark each skill when you grade. Nothing is a grade until you Approve.
          </Text>
          {value.checklistSkills.map((skill, index) => (
            <View key={skill.id} style={styles.item}>
              <TextField
                label={`Skill ${index + 1}`}
                placeholder="Counts to 20"
                value={skill.label}
                onChangeText={(label) =>
                  patch({
                    checklistSkills: value.checklistSkills.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, label } : row,
                    ),
                  })
                }
              />
              <GhostButton
                align="left"
                label="Remove skill"
                onPress={() =>
                  patch({
                    checklistSkills: value.checklistSkills.filter((_, rowIndex) => rowIndex !== index),
                  })
                }
              />
            </View>
          ))}
          <GhostButton
            align="left"
            label="Add skill"
            onPress={() =>
              patch({
                checklistSkills: [
                  ...value.checklistSkills,
                  { id: `skill_${value.checklistSkills.length + 1}`, label: '' },
                ],
              })
            }
          />
        </>
      ) : null}
      {syllabusPublished ? null : (
        <>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Weight</Text>
          <ChipRow>
            {WEIGHT_BANDS.map((band) => (
              <Chip
                key={band.key}
                label={band.label}
                selected={value.weightBand === band.key}
                onPress={() => patch({ weightBand: band.key })}
              />
            ))}
          </ChipRow>
          {value.weightBand === 'custom' ? (
            <TextField
              label="Percent of the term"
              placeholder="15"
              keyboardType="numeric"
              value={value.weightPercent}
              onChangeText={(weightPercent) => patch({ weightPercent })}
            />
          ) : null}
        </>
      )}
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Counts toward</Text>
      <ChipRow>
        {GRADE_TERMS.map((term) => (
          <Chip key={term.key} label={term.label} selected={value.term === term.key} onPress={() => patch({ term: term.key })} />
        ))}
      </ChipRow>
      {lesson ? null : (
      <>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Answer key</Text>
      <Text style={[type.meta, { color: colors.mute }]}>
        Photo a blank worksheet and we will propose answers. A filled key we just read. Later homework matches this
        printed page.
      </Text>
      <ChipRow>
        <Chip label="None" selected={value.keyKind === 'none'} onPress={() => patch({ keyKind: 'none' })} />
        <Chip
          label="Photo"
          selected={value.keyKind === 'photo' || value.keyKind === 'both'}
          onPress={() => patch({ keyKind: value.keyItems.length ? 'both' : 'photo' })}
        />
        <Chip
          label="Typed items"
          selected={value.keyKind === 'items' || value.keyKind === 'both'}
          onPress={() =>
            patch({
              keyKind: value.keyAssetId ? 'both' : 'items',
              keyItems: value.keyItems.length ? value.keyItems : [emptyKeyItem(1)],
            })
          }
        />
      </ChipRow>
      {showPhoto ? (
        <>
          {value.keyPhotoUrl ? (
            <RemoteImage uri={value.keyPhotoUrl} style={[styles.keyThumb, { borderColor: colors.line }]} />
          ) : null}
          {value.keyPageState === 'blank' ? (
            <Text style={[type.meta, { color: colors.mute }]}>Looks blank — proposed answers below. Check them.</Text>
          ) : null}
          {value.keyPageState === 'filled' ? (
            <Text style={[type.meta, { color: colors.mute }]}>Read from your key — edit if needed.</Text>
          ) : null}
          {keyBusy ? <WorkingLine text="Working…" /> : null}
          {keyStatus ? <Text style={[type.meta, { color: colors.mute }]}>{keyStatus}</Text> : null}
          {keyError ? (
            <Text accessibilityRole="alert" style={[type.meta, { color: colors.danger }]}>
              {keyError}
            </Text>
          ) : null}
          <ChipRow>
            <IconButton
              name="capture"
              label={value.keyPhotoUrl ? 'Replace photo' : 'Take photo'}
              onPress={() => onPickKeyPhoto?.()}
            />
            {value.keyPhotoUrl ? <Chip label="Remove photo" onPress={() => onClearKeyPhoto?.()} /> : null}
          </ChipRow>
        </>
      ) : null}
      {showItems ? (
        <>
          {value.keyItems.map((item, index) => (
            <View key={`key-item-${item.n}-${index}`} style={styles.item}>
              <TextField
                label={`${item.n}. ${item.needsTeacher ? 'Needs you' : 'Stem'}`}
                placeholder="12 + 9 ="
                value={item.stem ?? ''}
                onChangeText={(stem) =>
                  patch({
                    keyItems: value.keyItems.map((row, rowIndex) => (rowIndex === index ? { ...row, stem } : row)),
                  })
                }
              />
              <TextField
                label="Answer"
                placeholder="21"
                value={item.answer}
                onChangeText={(answer) =>
                  patch({
                    keyItems: value.keyItems.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, answer, needsTeacher: false } : row,
                    ),
                  })
                }
              />
              <TextField
                label="Points"
                placeholder="1"
                keyboardType="numeric"
                value={item.points != null ? String(item.points) : ''}
                onChangeText={(raw) =>
                  patch({
                    keyItems: value.keyItems.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, points: raw.trim() ? Number(raw) : 1 } : row,
                    ),
                  })
                }
              />
              <GhostButton
                align="left"
                label="Remove item"
                onPress={() =>
                  patch({
                    keyItems: value.keyItems
                      .filter((_, rowIndex) => rowIndex !== index)
                      .map((row, rowIndex) => ({ ...row, n: rowIndex + 1 })),
                  })
                }
              />
            </View>
          ))}
          <GhostButton
            align="left"
            label="Add item"
            onPress={() => patch({ keyItems: [...value.keyItems, emptyKeyItem(value.keyItems.length + 1)] })}
          />
        </>
      ) : null}
      {value.keyKind !== 'none' ? (
        <TextField
          label="Key notes"
          placeholder="Count off 1 for no work shown"
          value={value.keyNotes}
          onChangeText={(keyNotes) => patch({ keyNotes })}
        />
      ) : null}
      {value.scoreScheme === 'pass_fail' && value.keyKind !== 'none' ? (
        <TextField
          label="Pass if at least"
          placeholder="7"
          keyboardType="numeric"
          value={value.keyPassAt}
          onChangeText={(keyPassAt) => patch({ keyPassAt })}
        />
      ) : null}
      </>
      )}

      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Student help</Text>
      <Text style={[type.meta, { color: colors.mute }]}>
        Does not apply to graded captures. Students never see the full key up front. Default Off.
      </Text>
      <ChipRow>
        <Chip label="Off" selected={value.helpMode === 'off'} onPress={() => patch({ helpMode: 'off' })} />
        <Chip label="Hints" selected={value.helpMode === 'hints'} onPress={() => patch({ helpMode: 'hints' })} />
        <Chip
          label="Steps after try"
          selected={value.helpMode === 'steps_after_try'}
          onPress={() => patch({ helpMode: 'steps_after_try' })}
        />
        <Chip
          label="Check work"
          selected={value.helpMode === 'check_work'}
          onPress={() => patch({ helpMode: 'check_work' })}
        />
      </ChipRow>
      <PrimaryButton
        disabled={saveDisabled}
        label={busy ? 'Saving…' : submitLabel}
        onPress={() => {
          if (!value.dueDate.trim()) {
            setDueError('Add a due date');
            return;
          }
          setDueError(null);
          onSubmit();
        }}
      />
      {onCancel ? <GhostButton align="left" label="Cancel" onPress={onCancel} /> : null}
    </View>
  );
}

export function isoDate(daysFromToday = 0): string {
  return addDaysISO(todayISO(), daysFromToday) ?? toISODate(new Date());
}

export function dueAtFromDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T16:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function plannedAssignmentInput(
  classId: string,
  value: AssignmentFormValue,
  studentId?: string | null,
): AssignmentInput {
  const items = value.keyItems;
  return {
    classId,
    title: value.title,
    category: value.category,
    workKind: value.gradeWorkKind,
    dueAt: dueAtFromDate(value.dueDate),
    weightBand: value.weightBand,
    weightPercent: value.weightPercent.trim() ? Number(value.weightPercent) : null,
    term: value.term,
    scoreScheme: value.scoreScheme,
    includeInAverage: value.scoreScheme === 'pass_fail' ? false : value.includeInAverage,
    isMakeup: value.isMakeup,
    maxScore: keyMaxScore(items),
    keyKind: deriveKeyKind(Boolean(value.keyAssetId), items),
    keyNotes: value.keyNotes,
    keyPassAt: value.keyPassAt.trim() ? Number(value.keyPassAt) : null,
    keyItems: items,
    keyAssetId: value.keyAssetId,
    keyPhash: value.keyPhash,
    keyLayout: value.keyLayout,
    keyHeader: value.keyHeader,
    unit: value.unit,
    section: value.section,
    helpMode: value.helpMode ?? 'off',
    studentId: studentId ?? null,
    checklistSkills: value.scoreScheme === 'checklist' ? value.checklistSkills : [],
    calendarVisibility: value.dueDate.trim()
      ? value.showOnFamilyCalendar
        ? 'published'
        : 'hidden'
      : null,
  };
}

export function lessonFieldsFromForm(value: AssignmentFormValue) {
  return {
    dueAt: dueAtFromDate(value.dueDate),
    category: value.category,
    weightBand: value.weightBand,
    weightPercent: value.weightBand === 'custom' && value.weightPercent.trim() ? Number(value.weightPercent) : null,
    term: value.term,
    scoreScheme: value.scoreScheme,
    includeInAverage: value.scoreScheme === 'pass_fail' ? false : value.includeInAverage,
    isMakeup: value.isMakeup,
    unit: value.unit.trim() || null,
    section: value.section.trim() || null,
  };
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  keyThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
  },
  item: {
    gap: 8,
  },
});
