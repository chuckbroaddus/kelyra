import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import {
  clearTutorBrief,
  confirmTutorBrief,
  generateTutorBrief,
  getTutorBriefTeacher,
  saveTutorBriefDraft,
} from '@/lib/tutorBrief/api';
import {
  HINT_DEPTH_LABELS,
  isOverSafeCap,
  tutorBriefFieldsEqual,
  type TutorBriefStatus,
  type TutorBriefTeacher,
  type TutorHintDepth,
} from '@/lib/tutorBrief/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  assignmentId: string;
  /** Expand strip emphasis after publish / material update. */
  emphasize?: boolean;
  onSkipEmphasize?: () => void;
};

function statusLabel(status: TutorBriefStatus): string {
  if (status === 'stale') return 'Needs review';
  if (status === 'confirmed') return 'Confirmed';
  return 'Draft';
}

function listToText(items: string[]): string {
  return items.join('\n');
}

function textToList(raw: string): string[] {
  return raw
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** A-Filing Tutor brief — Confirm brief ≠ Approve. Filing meta only. */
export function TutorBriefCard({ assignmentId, emphasize, onSkipEmphasize }: Props) {
  const { colors } = useTheme();
  const [brief, setBrief] = useState<TutorBriefTeacher | null>(null);
  const [expanded, setExpanded] = useState(Boolean(emphasize));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [objectives, setObjectives] = useState('');
  const [misconceptions, setMisconceptions] = useState('');
  const [vocabulary, setVocabulary] = useState('');
  const [depth, setDepth] = useState<TutorHintDepth>('next-step');
  const [teacherNotes, setTeacherNotes] = useState('');

  const applyBrief = useCallback((next: TutorBriefTeacher | null) => {
    setBrief(next);
    if (!next) {
      setObjectives('');
      setMisconceptions('');
      setVocabulary('');
      setDepth('next-step');
      setTeacherNotes('');
      return;
    }
    setObjectives(listToText(next.objectives));
    setMisconceptions(listToText(next.misconceptions));
    setVocabulary(listToText(next.vocabulary));
    setDepth(next.allowed_hint_depth);
    setTeacherNotes(next.teacher_notes ?? '');
  }, []);

  const load = useCallback(async () => {
    try {
      const next = await getTutorBriefTeacher(assignmentId);
      applyBrief(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tutor brief');
    } finally {
      setReady(true);
    }
  }, [assignmentId, applyBrief]);

  useEffect(() => {
    setReady(false);
    void load();
  }, [load]);

  useEffect(() => {
    if (emphasize) setExpanded(true);
  }, [emphasize]);

  const fields = {
    objectives: textToList(objectives),
    misconceptions: textToList(misconceptions),
    vocabulary: textToList(vocabulary),
    allowed_hint_depth: depth,
  };
  const overCap = isOverSafeCap(fields);
  const status = brief?.status ?? 'draft';
  const pillBg =
    status === 'confirmed' ? colors.goodSoft : status === 'stale' ? colors.warnSoft : colors.wash;
  const pillFg = status === 'confirmed' ? colors.good : status === 'stale' ? colors.warn : colors.mute;

  const onConfirm = async () => {
    if (overCap) return;
    setBusy(true);
    setError(null);
    try {
      const next = await confirmTutorBrief({
        assignmentId,
        objectives: fields.objectives,
        misconceptions: fields.misconceptions,
        allowedHintDepth: depth,
        vocabulary: fields.vocabulary,
        teacherNotes,
      });
      applyBrief(next);
      onSkipEmphasize?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm tutor brief');
    } finally {
      setBusy(false);
    }
  };

  const onRegenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await generateTutorBrief(assignmentId);
      applyBrief(next);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t draft a brief. Try re-generate, or skip for now.');
    } finally {
      setBusy(false);
    }
  };

  const onSkip = () => {
    onSkipEmphasize?.();
    setExpanded(false);
  };

  const onClear = async () => {
    setBusy(true);
    setError(null);
    try {
      await clearTutorBrief(assignmentId);
      applyBrief(null);
      setClearOpen(false);
      onSkipEmphasize?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear tutor brief');
    } finally {
      setBusy(false);
    }
  };

  const onSaveNotesBlur = async () => {
    if (!brief) return;
    // Confirmed: never upsert-on-blur (would demote to Draft). Persist via Confirm brief.
    if (brief.status === 'confirmed') return;
    const unchanged = tutorBriefFieldsEqual(
      {
        objectives: fields.objectives,
        misconceptions: fields.misconceptions,
        vocabulary: fields.vocabulary,
        allowed_hint_depth: depth,
        teacher_notes: teacherNotes,
      },
      {
        objectives: brief.objectives,
        misconceptions: brief.misconceptions,
        vocabulary: brief.vocabulary,
        allowed_hint_depth: brief.allowed_hint_depth,
        teacher_notes: brief.teacher_notes,
      },
    );
    if (unchanged) return;
    try {
      const next = await saveTutorBriefDraft({
        assignmentId,
        objectives: fields.objectives,
        misconceptions: fields.misconceptions,
        allowedHintDepth: depth,
        vocabulary: fields.vocabulary,
        teacherNotes,
        asNewDraft: false,
      });
      applyBrief(next);
    } catch {
      // Keep editing; confirm path will surface errors.
    }
  };

  if (!ready) return <WorkingLine text="Opening tutor brief…" />;

  return (
    <View style={styles.wrap}>
      {status === 'stale' ? (
        <Text style={[type.meta, { color: colors.warn }]}>
          Assignment changed — review the tutor brief.
        </Text>
      ) : null}
      {emphasize && brief ? (
        <Text style={[type.meta, { color: colors.mute }]}>
          Draft tutor brief ready — confirm before Ask can use it.
        </Text>
      ) : null}
      <Card>
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          style={styles.header}
        >
          <Text style={[type.section, { color: colors.ink }]}>Tutor brief</Text>
          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            <Text style={[styles.pillText, { color: pillFg }]}>{statusLabel(status)}</Text>
          </View>
        </Pressable>

        {expanded ? (
          <View style={styles.body}>
            {!brief ? (
              <Text style={[type.body, { color: colors.mute }]}>
                No brief yet. Re-generate drafts a student-safe pack for Ask.
              </Text>
            ) : (
              <>
                <TextField
                  label="Objectives"
                  value={objectives}
                  onChangeText={setObjectives}
                  multiline
                  onBlur={() => void onSaveNotesBlur()}
                />
                <TextField
                  label="Likely misconceptions"
                  value={misconceptions}
                  onChangeText={setMisconceptions}
                  multiline
                  onBlur={() => void onSaveNotesBlur()}
                />
                <Text style={[type.meta, { color: colors.mute }]}>Hint depth</Text>
                <ChipRow>
                  {(Object.keys(HINT_DEPTH_LABELS) as TutorHintDepth[]).map((key) => (
                    <Chip
                      key={key}
                      label={HINT_DEPTH_LABELS[key]}
                      selected={depth === key}
                      onPress={() => setDepth(key)}
                    />
                  ))}
                </ChipRow>
                <TextField
                  label="Vocabulary"
                  value={vocabulary}
                  onChangeText={setVocabulary}
                  multiline
                  onBlur={() => void onSaveNotesBlur()}
                />
                <View style={[styles.wall, { borderTopColor: colors.line }]}>
                  <Text style={[type.meta, { color: colors.mute }]}>Only you</Text>
                  <Text style={[type.meta, { color: colors.mute }]}>Never sent to student Ask</Text>
                  <View style={[styles.notesWell, { backgroundColor: colors.wash }]}>
                    <TextField
                      label="Internal notes"
                      value={teacherNotes}
                      onChangeText={setTeacherNotes}
                      multiline
                      onBlur={() => void onSaveNotesBlur()}
                    />
                  </View>
                </View>
                {overCap ? (
                  <Text style={[type.meta, { color: colors.mute }]}>
                    Brief is too long to confirm — shorten or re-generate.
                  </Text>
                ) : null}
              </>
            )}
            {busy ? <WorkingLine text="Working…" /> : null}
            {error ? <Text style={[type.body, { color: colors.mute }]}>{error}</Text> : null}
            <PrimaryButton
              label="Confirm brief"
              disabled={busy || !brief || overCap}
              onPress={() => void onConfirm()}
            />
            <GhostButton label="Re-generate" disabled={busy} onPress={() => void onRegenerate()} />
            {emphasize && brief?.status === 'draft' ? (
              <GhostButton label="Skip for now" disabled={busy} onPress={onSkip} />
            ) : null}
            {brief ? (
              <GhostButton
                label="Clear brief"
                disabled={busy}
                onPress={() => setClearOpen(true)}
              />
            ) : null}
          </View>
        ) : null}
      </Card>
      <ConfirmSheet
        visible={clearOpen}
        title="Clear tutor brief?"
        body="Ask will use class context only until you confirm a new brief. This cannot be undone."
        confirmLabel="Clear brief"
        cancelLabel="Keep brief"
        busy={busy}
        onCancel={() => setClearOpen(false)}
        onConfirm={() => void onClear()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: { gap: 10 },
  wall: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 6,
  },
  notesWell: {
    borderRadius: 12,
    padding: 8,
  },
});
