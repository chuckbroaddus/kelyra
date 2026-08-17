import { Image, StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { emptyKeyItem, type AnswerKeyItem, type AnswerKeyKind } from '@/lib/assignments/keys';
import {
  GRADE_KINDS,
  GRADE_TERMS,
  WEIGHT_BANDS,
  type GradeKind,
  type GradeTerm,
  type ScoreScheme,
  type WeightBand,
} from '@/lib/grade/marks';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type AssignmentFormValue = {
  title: string;
  category: GradeKind;
  dueDate: string;
  weightBand: WeightBand;
  weightPercent: string;
  term: GradeTerm;
  scoreScheme: ScoreScheme;
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
};

export function emptyAssignmentForm(seed?: { title?: string; category?: string }): AssignmentFormValue {
  const category = GRADE_KINDS.some((row) => row.key === seed?.category)
    ? (seed!.category as GradeKind)
    : 'homework';
  return {
    title: seed?.title ?? '',
    category,
    dueDate: '',
    weightBand: 'none',
    weightPercent: '',
    term: 'none',
    scoreScheme: 'numeric',
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
  };
}

type Props = {
  value: AssignmentFormValue;
  onChange: (next: AssignmentFormValue) => void;
  busy?: boolean;
  keyBusy?: boolean;
  keyStatus?: string | null;
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
  onPickKeyPhoto?: () => void;
  onClearKeyPhoto?: () => void;
  unitSuggestions?: string[];
  sectionSuggestions?: string[];
};

export function AssignmentForm({
  value,
  onChange,
  busy,
  keyBusy,
  keyStatus,
  submitLabel,
  onSubmit,
  onCancel,
  onPickKeyPhoto,
  onClearKeyPhoto,
  unitSuggestions = [],
  sectionSuggestions = [],
}: Props) {
  const { colors } = useTheme();
  const patch = (partial: Partial<AssignmentFormValue>) => onChange({ ...value, ...partial });
  const showItems = value.keyKind === 'items' || value.keyKind === 'both' || value.keyItems.length > 0;
  const showPhoto = value.keyKind === 'photo' || value.keyKind === 'both' || Boolean(value.keyPhotoUrl);

  return (
    <View style={styles.wrap}>
      <TextField
        label="Title"
        placeholder="HW #17 Long Division Practice 3"
        value={value.title}
        onChangeText={(title) => patch({ title })}
      />
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>In the book</Text>
      <Text style={[type.meta, { color: colors.mute }]}>
        Optional. The grade book groups rows by class, then unit, then section.
      </Text>
      <TextField
        label="Unit"
        placeholder="Fractions"
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
        placeholder="6.1 Adding"
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
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Kind</Text>
      <ChipRow>
        {GRADE_KINDS.map((kind) => (
          <Chip key={kind.key} label={kind.label} selected={value.category === kind.key} onPress={() => patch({ category: kind.key })} />
        ))}
      </ChipRow>
      <TextField
        label="Due date"
        placeholder="2026-08-20"
        value={value.dueDate}
        onChangeText={(dueDate) => patch({ dueDate })}
      />
      <ChipRow>
        <Chip
          label="Tomorrow"
          selected={value.dueDate === isoDate(1)}
          onPress={() => patch({ dueDate: isoDate(1) })}
        />
        <Chip
          label="Next week"
          selected={value.dueDate === isoDate(7)}
          onPress={() => patch({ dueDate: isoDate(7) })}
        />
        <Chip
          label="Clear"
          selected={!value.dueDate.trim()}
          onPress={() => patch({ dueDate: '' })}
        />
      </ChipRow>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Mark</Text>
      <ChipRow>
        <Chip label="Number" selected={value.scoreScheme === 'numeric'} onPress={() => patch({ scoreScheme: 'numeric' })} />
        <Chip label="Pass/Fail" selected={value.scoreScheme === 'pass_fail'} onPress={() => patch({ scoreScheme: 'pass_fail' })} />
        <Chip label="Either" selected={value.scoreScheme === 'either'} onPress={() => patch({ scoreScheme: 'either' })} />
      </ChipRow>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Weight</Text>
      <ChipRow>
        {WEIGHT_BANDS.map((band) => (
          <Chip key={band.key} label={band.label} selected={value.weightBand === band.key} onPress={() => patch({ weightBand: band.key })} />
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
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Counts toward</Text>
      <ChipRow>
        {GRADE_TERMS.map((term) => (
          <Chip key={term.key} label={term.label} selected={value.term === term.key} onPress={() => patch({ term: term.key })} />
        ))}
      </ChipRow>
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
            <Image source={{ uri: value.keyPhotoUrl }} style={[styles.keyThumb, { borderColor: colors.line }]} />
          ) : null}
          {value.keyPageState === 'blank' ? (
            <Text style={[type.meta, { color: colors.mute }]}>Looks blank — proposed answers below. Check them.</Text>
          ) : null}
          {value.keyPageState === 'filled' ? (
            <Text style={[type.meta, { color: colors.mute }]}>Read from your key — edit if needed.</Text>
          ) : null}
          {keyBusy ? <WorkingLine text="Working…" /> : null}
          {keyStatus ? <Text style={[type.meta, { color: colors.mute }]}>{keyStatus}</Text> : null}
          <ChipRow>
            <Chip label={value.keyPhotoUrl ? 'Replace photo' : 'Take / choose photo'} onPress={() => onPickKeyPhoto?.()} />
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
      <PrimaryButton disabled={busy || keyBusy || !value.title.trim()} label={busy ? 'Saving…' : submitLabel} onPress={onSubmit} />
      {onCancel ? <GhostButton align="left" label="Cancel" onPress={onCancel} /> : null}
    </View>
  );
}

export function isoDate(daysFromToday = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export function dueAtFromDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T16:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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
