import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge, practiceBadge } from '@/components/ui/Badge';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LessonWorkView } from '@/components/ui/LessonWork';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { firstName, formatWhen } from '@/lib/format';
import { formatScoreMark } from '@/lib/grade/marks';
import { isAwaitingGrade, isGraded } from '@/lib/assignments/status';
import { practiceTitle } from '@/lib/practice/api';
import { followUpItems, setFollowUpDraft } from '@/lib/practice/followUp';
import {
  emptyReviewDraft,
  mergeReviewDraft,
  reviewDraftIsEmpty,
  reviewHasGap,
  withPendingGap,
  type SubmissionReviewDraft,
} from '@/lib/practice/review';
import {
  analyzeTurnedInReview,
  approveTurnedInReview,
  loadTurnedInReview,
  storeTurnedInDraft,
  type TurnedInReview,
} from '@/lib/practice/reviewApi';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function SubmissionReviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id, submissionId } = useLocalSearchParams<{ id: string; submissionId: string }>();
  const [review, setReview] = useState<TurnedInReview | null>(null);
  const [draft, setDraft] = useState<SubmissionReviewDraft | null>(null);
  const [score, setScore] = useState('');
  const [newGap, setNewGap] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const askingRef = useRef(false);
  const reviewRef = useRef<TurnedInReview | null>(null);
  const draftRef = useRef<SubmissionReviewDraft | null>(null);
  const newGapRef = useRef('');
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  reviewRef.current = review;
  draftRef.current = draft;
  newGapRef.current = newGap;

  usePushedTitle(review?.studentName ?? 'Review');

  const apply = (next: TurnedInReview) => {
    setReview(next);
    setDraft(next.draft);
    setScore(
      next.submission.approved_score != null
        ? String(next.submission.approved_score)
        : next.draft.draftScore != null
          ? String(next.draft.draftScore)
          : next.submission.score_mark === 'pass' || next.submission.score_mark === 'fail'
            ? formatScoreMark(next.submission.score_mark, null)
            : '',
    );
  };

  const persistDraft = useCallback(async (next: SubmissionReviewDraft) => {
    const current = reviewRef.current;
    if (!current) return;
    await storeTurnedInDraft(current.submission, {
      ...next,
      gaps: next.gaps.filter((gap) => gap.label.trim()),
      items: next.items.filter((item) => item.prompt.trim()),
    });
  }, []);

  const load = useCallback(async () => {
    if (!submissionId) return null;
    const next = await loadTurnedInReview(submissionId);
    if (!next) {
      setReview(null);
      setDraft(null);
      setError('That work is gone.');
      return null;
    }
    const local = draftRef.current;
    if (local && (local.gaps.some((gap) => gap.label.trim()) || local.items.some((item) => item.prompt.trim()) || local.teacherNote)) {
      setReview(next);
      setDraft(mergeReviewDraft(local, next.draft));
    } else {
      apply(next);
    }
    setError(null);
    return next;
  }, [submissionId]);

  const askAi = useCallback(async () => {
    const target = reviewRef.current;
    if (!submissionId || askingRef.current) return;
    askingRef.current = true;
    setAsking(true);
    setError(null);
    setStatus('Asking AI…');
    const prior = withPendingGap(draftRef.current ?? target?.draft ?? emptyReviewDraft(), newGapRef.current);
    if (newGapRef.current.trim()) {
      setNewGap('');
      newGapRef.current = '';
    }
    draftRef.current = prior;
    setDraft(prior);
    let kept = prior;
    try {
      try {
        await persistDraft(prior);
      } catch {
        // Still ask with the in-memory draft so a save blip cannot wipe the question.
      }
      const nextDraft = await analyzeTurnedInReview(submissionId, prior);
      if (reviewDraftIsEmpty(nextDraft)) {
        throw new Error('Grok did not return a review. Your notes are still here. Try Ask AI again.');
      }
      const merged = mergeReviewDraft(prior, nextDraft);
      kept = merged;
      draftRef.current = merged;
      setDraft(merged);
      if (merged.draftScore != null && !isGraded(target?.submission.status)) {
        setScore((current) => (current.trim() ? current : String(merged.draftScore)));
      }
      try {
        await persistDraft(merged);
      } catch {
        // Keep the merged draft on screen even if the row did not save.
      }
      setStatus(null);
    } catch (err) {
      draftRef.current = kept;
      setDraft(kept);
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not review this work');
    } finally {
      askingRef.current = false;
      setAsking(false);
    }
  }, [persistDraft, submissionId]);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void load()
        .catch((err) => {
          if (live) setError(err instanceof Error ? err.message : 'Could not load this work');
        })
        .finally(() => {
          if (live) setReady(true);
        });
      return () => {
        live = false;
        if (persistTimer.current) clearTimeout(persistTimer.current);
      };
    }, [load]),
  );

  const editable = isAwaitingGrade(review?.submission.status);
  const liveDraft = draft ?? review?.draft ?? null;
  const hasGap = reviewHasGap(liveDraft);
  const kindLabel = review?.kind === 'lesson' ? 'Lesson' : 'Practice';

  const patchDraft = (partial: Partial<SubmissionReviewDraft>) => {
    setDraft((current) => {
      const next = {
        ...(current ?? emptyReviewDraft()),
        ...partial,
      };
      draftRef.current = next;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        void persistDraft(next).catch((err) => {
          setError(err instanceof Error ? err.message : 'Could not save');
        });
      }, 400);
      return next;
    });
  };

  const onAddGap = async () => {
    const label = newGap.trim();
    if (!label || !liveDraft || !editable) return;
    if (liveDraft.gaps.filter((gap) => gap.label.trim()).length >= 3) {
      setError('Three gaps is the cap.');
      return;
    }
    const next = {
      ...liveDraft,
      gaps: [...liveDraft.gaps, { label, sortOrder: liveDraft.gaps.length + 1 }],
    };
    draftRef.current = next;
    setDraft(next);
    setNewGap('');
    setError(null);
    try {
      await persistDraft(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that gap');
    }
  };

  const onApprove = async () => {
    if (!review || !liveDraft || saving) return;
    setSaving(true);
    setError(null);
    setStatus('Approving…');
    try {
      const nextDraft = {
        ...liveDraft,
        gaps: liveDraft.gaps.filter((gap) => gap.label.trim()),
        items: liveDraft.items.filter((item) => item.prompt.trim()),
      };
      await storeTurnedInDraft(review.submission, nextDraft);
      await approveTurnedInReview({
        review,
        scoreText: score,
        draft: nextDraft,
        assignPractice: false,
      });
      await load();
      setStatus('Approved.');
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not approve');
    } finally {
      setSaving(false);
    }
  };

  const onAddItem = async () => {
    if (!review || !liveDraft || !id) return;
    const items = followUpItems(liveDraft.items);
    if (!items.length) {
      patchDraft({
        items: [...liveDraft.items, { id: `item-${Date.now()}`, prompt: '' }],
      });
      return;
    }
    const skillLabel = liveDraft.gaps.find((gap) => gap.label.trim())?.label.trim() || 'practice';
    try {
      await storeTurnedInDraft(review.submission, {
        ...liveDraft,
        gaps: liveDraft.gaps.filter((gap) => gap.label.trim()),
        items,
      });
    } catch {
      // Still open the assignment sheet; the questions are in memory.
    }
    setFollowUpDraft({
      classId: id,
      studentId: review.studentId,
      sourceAssignmentId: review.assignment.id,
      sourceSubmissionId: review.submission.id,
      sourceTitle: review.title,
      skillLabel,
      items,
    });
    router.push(`/class/${id}/assignment/new?student=${review.studentId}` as never);
  };

  if (!ready) {
    return (
      <Screen maxWidth={640}>
        <WorkingLine />
      </Screen>
    );
  }

  if (!review || !liveDraft) {
    return (
      <Screen maxWidth={640}>
        <Text style={[type.body, { color: colors.danger }]}>{error ?? 'That work is gone.'}</Text>
        <GhostButton align="left" label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen
      maxWidth={640}
      keyboard
      sticky={
        editable ? (
          <View style={styles.sticky}>
            <PrimaryButton
              disabled={saving || asking}
              label={saving ? 'Approving…' : 'Approve'}
              onPress={() => void onApprove()}
            />
            {hasGap ? (
              <SecondaryButton
                disabled={saving || asking}
                label="Add item"
                onPress={() => void onAddItem()}
              />
            ) : null}
          </View>
        ) : undefined
      }
    >
      <View style={styles.hero}>
        <Avatar name={review.studentName} photoUrl={review.photoUrl} size={48} />
        <View style={styles.heroText}>
          <Text style={[type.title, { color: colors.ink }]}>{review.studentName}</Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            {[
              kindLabel,
              review.submission.submitted_at
                ? `Turned in ${formatWhen(review.submission.submitted_at)}`
                : 'Not turned in yet',
            ].join(' · ')}
          </Text>
        </View>
        <Badge variant={practiceBadge(review.submission.status)} />
      </View>
      <Text style={[type.rowTitle, { color: colors.ink }]}>{practiceTitle(review.title)}</Text>

      <SectionHeader label="What they turned in" first />
      {liveDraft.summary ? <Text style={[type.body, { color: colors.ink }]}>{liveDraft.summary}</Text> : null}
      {review.kind === 'lesson' ? (
        review.lessonWork ? (
          <LessonWorkView work={review.lessonWork} />
        ) : (
          <Text style={[type.meta, { color: colors.mute }]}>No lesson metrics yet.</Text>
        )
      ) : review.workLines.length ? (
        review.workLines.map((line, index) => (
          <Card key={line.id}>
            <Text style={[type.meta, { color: colors.mute }]}>{index + 1}.</Text>
            <Text style={[type.body, { color: colors.ink }]}>{line.prompt}</Text>
            <Text style={[type.body, { color: colors.ink }]}>
              {line.answer || 'No answer'}
            </Text>
            {line.expected ? (
              <Text style={[type.meta, { color: colors.mute }]}>Key: {line.expected}</Text>
            ) : null}
          </Card>
        ))
      ) : (
        <Text style={[type.meta, { color: colors.mute }]}>No items on this set.</Text>
      )}
      {review.kind === 'lesson' ? (
        <GhostButton
          align="left"
          label="Preview lesson"
          onPress={() => router.push(`/lesson/${review.assignment.id}?preview=1` as never)}
        />
      ) : null}

      <SectionHeader label="Suggested grade" />
      {editable ? (
        <TextField
          label="Draft score"
          value={score}
          keyboardType="numeric"
          placeholder="0–100, Pass, or Fail"
          onChangeText={setScore}
        />
      ) : (
        <Text style={[type.body, { color: colors.ink }]}>
          {formatScoreMark(review.submission.score_mark, review.submission.approved_score) || 'Approved'}
        </Text>
      )}
      {editable ? (
        <TextField
          label="Note"
          multiline
          value={liveDraft.teacherNote ?? ''}
          placeholder="Glow / grow for you. Not shown to the student yet."
          onChangeText={(value) => patchDraft({ teacherNote: value })}
        />
      ) : liveDraft.teacherNote ? (
        <Text style={[type.body, { color: colors.ink }]}>{liveDraft.teacherNote}</Text>
      ) : null}

      <SectionHeader label="Suggested gap" />
      {liveDraft.gaps.length === 0 ? (
        <Text style={[type.meta, { color: colors.mute }]}>
          No gap suggested. The work looks solid, or add one below.
        </Text>
      ) : (
        liveDraft.gaps.map((gap, index) => (
          <View key={`${gap.sortOrder}-${index}`} style={styles.gapRow}>
            {editable ? (
              <View style={styles.flex}>
                <TextField
                  value={gap.label}
                  onChangeText={(value) =>
                    patchDraft({
                      gaps: liveDraft.gaps.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, label: value } : row,
                      ),
                    })
                  }
                />
              </View>
            ) : (
              <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{gap.label}</Text>
            )}
            {editable ? (
              <GhostButton
                align="left"
                label="Remove"
                onPress={() => {
                  const next = {
                    ...liveDraft,
                    gaps: liveDraft.gaps.filter((_, rowIndex) => rowIndex !== index),
                    items: liveDraft.gaps.length <= 1 ? [] : liveDraft.items,
                  };
                  draftRef.current = next;
                  setDraft(next);
                  void persistDraft(next).catch((err) => {
                    setError(err instanceof Error ? err.message : 'Could not save');
                  });
                }}
              />
            ) : null}
          </View>
        ))
      )}
      {editable ? (
        <View style={styles.gapRow}>
          <View style={styles.flex}>
            <TextField
              placeholder="Add a gap, e.g. two-digit regrouping"
              value={newGap}
              onChangeText={setNewGap}
              onSubmitEditing={() => void onAddGap()}
              returnKeyType="done"
              blurOnSubmit
            />
          </View>
          <GhostButton align="left" label="Add gap" onPress={() => void onAddGap()} />
        </View>
      ) : null}

      {hasGap || liveDraft.items.length ? (
        <>
          <SectionHeader
            label={`Suggested practice for ${firstName(review.studentName)}`}
          />
          {liveDraft.items.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute }]}>
              No questions yet. Ask AI, or add items below.
            </Text>
          ) : (
            liveDraft.items.map((item, index) => (
              <View key={item.id} style={styles.item}>
                <Text style={[styles.gutter, { color: colors.mute }]}>{index + 1}.</Text>
                <View style={styles.flex}>
                  {editable ? (
                    <TextField
                      multiline
                      value={item.prompt}
                      onChangeText={(value) =>
                        patchDraft({
                          items: liveDraft.items.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, prompt: value } : row,
                          ),
                        })
                      }
                    />
                  ) : (
                    <Text style={[type.body, { color: colors.ink }]}>{item.prompt}</Text>
                  )}
                </View>
              </View>
            ))
          )}
          {editable ? (
            <GhostButton
              align="left"
              label="Add another question"
              onPress={() =>
                patchDraft({
                  items: [...liveDraft.items, { id: `item-${Date.now()}`, prompt: '' }],
                })
              }
            />
          ) : null}
        </>
      ) : null}

      {editable ? (
        <SecondaryButton
          disabled={asking}
          label={asking ? 'Asking AI…' : 'Ask AI'}
          onPress={() => void askAi()}
        />
      ) : (
        <GhostButton
          align="left"
          label={`Open ${firstName(review.studentName)}`}
          onPress={() => router.push(`/class/${id}/student/${review.studentId}` as never)}
        />
      )}
      {asking ? <WorkingLine text="Asking AI…" /> : null}
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PhaseBanner
        phase={2}
        compact
        detail="Look at the work, then approve. Nothing is a grade until you do."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  gutter: {
    ...type.meta,
    width: 24,
    flexShrink: 0,
    paddingTop: 14,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  sticky: {
    gap: 8,
  },
  error: {
    ...type.body,
    marginTop: 8,
  },
});
