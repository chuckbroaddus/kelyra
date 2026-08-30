import { invokeAi } from '@/lib/ai/invoke';
import { isGraded } from '@/lib/assignments/status';
import { parseScoreInput, type ScoreMark } from '@/lib/grade/marks';
import { lessonResultLines } from '@/lib/lessons/api';
import { asLessonResult } from '@/lib/lessons/protocol';
import { lessonWorkFromResult, type LessonWork } from '@/lib/lessons/work';
import { signedProfileUrlForAssetId } from '@/lib/people/photos';
import { assignPractice } from '@/lib/practice/api';
import {
  parsePracticeItemsFromUnknown,
  parseSubmissionReview,
  practiceWorkLines,
  type PracticeWorkLine,
  type SubmissionReviewDraft,
} from '@/lib/practice/review';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssignmentKind, AssignmentRow, PracticeItem, SubmissionRow } from '@/lib/supabase/types';

export type TurnedInReview = {
  submission: SubmissionRow;
  assignment: AssignmentRow;
  classId: string;
  studentId: string;
  studentName: string;
  photoUrl: string | null;
  kind: AssignmentKind;
  title: string;
  items: PracticeItem[];
  workLines: PracticeWorkLine[];
  lessonLines: Array<{ label: string; value: string }>;
  lessonWork: LessonWork | null;
  draft: SubmissionReviewDraft;
};

export async function loadTurnedInReview(submissionId: string): Promise<TurnedInReview | null> {
  const supabase = requireSupabase();
  const { data: submission, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();
  if (error) throw error;
  if (!submission) return null;

  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', submission.assignment_id)
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment) return null;

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, display_name, photo_asset_id')
    .eq('id', submission.student_id)
    .maybeSingle();
  if (studentError) throw studentError;

  let items: PracticeItem[] = [];
  if (assignment.practice_set_id) {
    const { data: set, error: setError } = await supabase
      .from('practice_sets')
      .select('items')
      .eq('id', assignment.practice_set_id)
      .maybeSingle();
    if (setError) throw setError;
    items = parsePracticeItemsFromUnknown(set?.items);
  }

  const stored = parseSubmissionReview(submission.model_draft);
  const { data: draftGaps } = await supabase
    .from('skill_gaps')
    .select('label, sort_order')
    .eq('submission_id', submissionId)
    .eq('status', 'draft')
    .order('sort_order', { ascending: true });
  const seededGaps = (draftGaps ?? [])
    .map((row, index) => ({
      label: String(row.label ?? '').trim(),
      sortOrder: Number(row.sort_order ?? index + 1) || index + 1,
    }))
    .filter((gap) => gap.label)
    .slice(0, 3);
  const draft: SubmissionReviewDraft = {
    ...stored,
    draftScore: stored.draftScore ?? submission.draft_score,
    gaps: stored.gaps.length ? stored.gaps : seededGaps,
  };
  const lessonResult = assignment.kind === 'lesson' ? asLessonResult(submission.answers) : null;
  const lessonWork = lessonWorkFromResult(lessonResult);

  return {
    submission,
    assignment,
    classId: assignment.class_id,
    studentId: submission.student_id,
    studentName: student?.display_name ?? 'Student',
    photoUrl: await signedProfileUrlForAssetId(student?.photo_asset_id),
    kind: assignment.kind,
    title: assignment.title,
    items,
    workLines: practiceWorkLines(items, submission.answers),
    lessonLines: lessonResultLines(lessonResult),
    lessonWork,
    draft,
  };
}

export async function analyzeTurnedInReview(
  submissionId: string,
  draft?: SubmissionReviewDraft | null,
): Promise<SubmissionReviewDraft> {
  const data = await invokeAi<SubmissionReviewDraft & { ok?: boolean }>('review-submission', {
    submissionId,
    ...(draft ? { draft } : {}),
  });
  return parseSubmissionReview(data);
}

export async function storeTurnedInDraft(
  submission: SubmissionRow,
  draft: SubmissionReviewDraft,
): Promise<void> {
  const supabase = requireSupabase();
  const payload = {
    model_draft: draft,
    draft_score: draft.draftScore,
  };
  const { error } = await supabase.from('submissions').update(payload).eq('id', submission.id);
  if (error) {
    const { model_draft: _draft, ...withoutDraft } = payload;
    const retry = await supabase.from('submissions').update(withoutDraft).eq('id', submission.id);
    if (retry.error) throw retry.error;
  }
  // Keep Focus / reload in sync with editable Suggested gaps (including Remove-all).
  await replaceSubmissionModelDraftGaps({
    submissionId: submission.id,
    studentId: submission.student_id,
    gaps: draft.gaps,
  });
}

export async function approveTurnedInReview(input: {
  review: TurnedInReview;
  scoreText: string;
  draft: SubmissionReviewDraft;
  assignPractice: boolean;
}): Promise<void> {
  const { review, draft } = input;
  if (isGraded(review.submission.status)) return;
  const parsed = parseScoreInput(input.scoreText);
  const scoreMark: ScoreMark = parsed.mark;
  const approvedScore = scoreMark === 'numeric' ? parsed.score : null;
  const approvedAt = new Date().toISOString();
  const supabase = requireSupabase();

  const row = {
    status: 'graded' as const,
    approved_score: approvedScore,
    approved_at: approvedAt,
    score_mark: scoreMark,
    draft_score: draft.draftScore,
    model_draft: draft,
  };
  const { error } = await supabase.from('submissions').update(row).eq('id', review.submission.id);
  if (error) {
    const { score_mark: _mark, model_draft: _draft, ...rest } = row;
    const retry = await supabase.from('submissions').update(rest).eq('id', review.submission.id);
    if (retry.error) throw retry.error;
  }

  const liveGaps = draft.gaps.filter((gap) => gap.label.trim());
  // Always clear submission gaps first so Approve-with-zero does not leave Review drafts.
  await supabase.from('skill_gaps').delete().eq('submission_id', review.submission.id);
  let focusSkill: { id: string; label: string } | null = null;
  if (liveGaps.length) {
    for (const [index, gap] of liveGaps.entries()) {
      const skill = await ensureClassSkill(review.classId, gap.label.trim());
      if (!focusSkill) focusSkill = skill;
      const { error: gapError } = await supabase.from('skill_gaps').insert({
        capture_id: null,
        submission_id: review.submission.id,
        student_id: review.studentId,
        skill_id: skill.id,
        label: gap.label.trim(),
        source: 'teacher',
        status: 'approved',
        sort_order: index + 1,
      });
      if (gapError) throw gapError;
    }
    if (focusSkill) {
      await supabase
        .from('students')
        .update({
          current_focus_skill_id: focusSkill.id,
          parent_sentence: `Still working on ${focusSkill.label}.`,
        })
        .eq('id', review.studentId);
    }
  }

  if (!input.assignPractice || !focusSkill) return;

  const followUp = draft.items
    .map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      prompt: item.prompt.trim(),
      ...(item.answerKey?.trim() ? { answerKey: item.answerKey.trim() } : {}),
    }))
    .filter((item) => item.prompt);

  try {
    await assignPractice({
      classId: review.classId,
      studentId: review.studentId,
      skillId: focusSkill.id,
      skillLabel: focusSkill.label,
      items: followUp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not assign practice';
    throw new Error(`Approved the score, but could not assign practice. ${message}`);
  }
}

async function replaceSubmissionModelDraftGaps(input: {
  submissionId: string;
  studentId: string;
  gaps: Array<{ label: string; sortOrder?: number }>;
}): Promise<void> {
  const supabase = requireSupabase();
  const live = input.gaps.map((gap) => gap.label.trim()).filter(Boolean).slice(0, 3);
  await supabase
    .from('skill_gaps')
    .delete()
    .eq('submission_id', input.submissionId)
    .eq('source', 'model')
    .eq('status', 'draft');
  if (!live.length) return;
  const { error } = await supabase.from('skill_gaps').insert(
    live.map((label, index) => ({
      capture_id: null,
      submission_id: input.submissionId,
      student_id: input.studentId,
      label,
      source: 'model',
      status: 'draft',
      sort_order: index + 1,
    })),
  );
  if (error) throw error;
}

async function ensureClassSkill(classId: string, label: string): Promise<{ id: string; label: string }> {
  const supabase = requireSupabase();
  const normalized = label.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const { data: existing } = await supabase
    .from('skills')
    .select('id, label')
    .eq('class_id', classId)
    .eq('normalized_label', normalized)
    .maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await supabase
    .from('skills')
    .insert({
      class_id: classId,
      label,
      normalized_label: normalized,
    })
    .select('id, label')
    .single();
  if (error) throw error;
  return created;
}
