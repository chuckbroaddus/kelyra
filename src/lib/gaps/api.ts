import { invokeAi } from '@/lib/ai/invoke';
import { allPhotoAssetIds } from '@/lib/captures/pages';
import { gradeKindLabel, type GradeKind, type ScoreMark } from '@/lib/grade/marks';
import { loadPhotoAssetPaths } from '@/lib/media/upload';
import { signedThumbUrls, signedUrls } from '@/lib/media/signedUrl';
import { requireSupabase } from '@/lib/supabase/client';
import type { CaptureRow, SkillGapRow } from '@/lib/supabase/types';

export type StudentCapture = CaptureRow & {
  photoUrl: string | null;
  photoUrls: string[];
  gaps: SkillGapRow[];
};

export type StoredHomeworkDraft = {
  gaps: Array<{ label: string; sortOrder: number }>;
  draftScore: number | null;
  teacherNote: string | null;
  studentName?: string | null;
  parentSentence?: string | null;
  pageAssetIds?: string[];
  scoreMark?: ScoreMark;
  gradeKind?: GradeKind;
  skipGrade?: boolean;
  costUsd?: number | null;
  model?: string | null;
  pass?: string | null;
  pending?: boolean;
};

export function draftHasWork(draft: StoredHomeworkDraft | null | undefined): boolean {
  return Boolean(
    draft &&
      (draft.gaps?.length ||
        draft.teacherNote ||
        draft.draftScore != null ||
        draft.studentName ||
        draft.scoreMark === 'pass' ||
        draft.scoreMark === 'fail' ||
        (draft.pageAssetIds?.length ?? 0) > 1),
  );
}

export async function storeCaptureDraft(
  captureId: string,
  draft: StoredHomeworkDraft,
  studentId?: string | null,
): Promise<void> {
  const supabase = requireSupabase();
  await supabase
    .from('captures')
    .update({
      model_draft: draft,
      draft_score: draft.draftScore,
      teacher_note: draft.teacherNote,
      ...(studentId && draft.gaps.length ? { status: 'draft' } : {}),
    })
    .eq('id', captureId);

  if (!studentId || !draft.gaps.length) return;

  await supabase.from('skill_gaps').delete().eq('capture_id', captureId).eq('source', 'model');
  const { error } = await supabase.from('skill_gaps').insert(
    draft.gaps.map((gap, index) => ({
      capture_id: captureId,
      student_id: studentId,
      label: gap.label,
      source: 'model',
      status: 'draft',
      sort_order: gap.sortOrder ?? index + 1,
    })),
  );
  if (error) throw error;
}

export async function analyzeAttachedCapture(
  captureId: string,
  opts?: { pass?: 'cheap' | 'look-again'; queue?: boolean },
): Promise<boolean> {
  const data = await invokeAi<{ ok?: boolean; gaps?: unknown[]; queued?: boolean; skipped?: boolean }>(
    'analyze-homework',
    {
      captureId,
      pass: opts?.pass ?? 'cheap',
      queue: Boolean(opts?.queue),
    },
  );
  return Boolean(data.ok || data.gaps || data.queued || data.skipped);
}

export async function lookAgainCapture(captureId: string): Promise<boolean> {
  return analyzeAttachedCapture(captureId, { pass: 'look-again' });
}

export async function processQueuedDrafts(): Promise<{ processed: number }> {
  const data = await invokeAi<{ processed?: number }>('process-ai-jobs', {});
  return { processed: data.processed ?? 0 };
}

export function draftCostUsd(draft: StoredHomeworkDraft | null | undefined): number | null {
  const usd = (draft as { costUsd?: number } | null)?.costUsd;
  return typeof usd === 'number' && Number.isFinite(usd) ? usd : null;
}

export async function addTeacherGap(captureId: string, studentId: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Gap label is required');
  const supabase = requireSupabase();
  const { error } = await supabase.from('skill_gaps').insert({
    capture_id: captureId,
    student_id: studentId,
    label: trimmed,
    source: 'teacher',
    status: 'draft',
    sort_order: 1,
  });
  if (error) throw error;
  await supabase.from('captures').update({ status: 'draft' }).eq('id', captureId);
}

export async function updateGapLabel(gapId: string, label: string) {
  const { error } = await requireSupabase()
    .from('skill_gaps')
    .update({ label: label.trim() })
    .eq('id', gapId);
  if (error) throw error;
}

function asApprovedScore(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function approveCapture(
  capture: CaptureRow,
  gaps: SkillGapRow[],
  score?: number | null,
  extras?: { scoreMark?: ScoreMark; gradeKind?: GradeKind; assignmentId?: string | null },
): Promise<{ skillId: string | null; skillLabel: string | null }> {
  if (!capture.student_id) throw new Error('Capture has no student');
  const supabase = requireSupabase();
  const live = gaps.filter((gap) => gap.status !== 'dismissed' && gap.label.trim());
  const draft = (capture.model_draft ?? {}) as StoredHomeworkDraft;
  const scoreMark: ScoreMark = extras?.scoreMark ?? draft.scoreMark ?? 'numeric';
  const gradeKind: GradeKind = extras?.gradeKind ?? draft.gradeKind ?? 'homework';
  const gradeOnly = live.length === 0;

  let focusSkillId: string | null = null;
  for (const [index, gap] of live.entries()) {
    const normalized = normalizeSkill(gap.label);
    const { data: existing } = await supabase
      .from('skills')
      .select('*')
      .eq('class_id', capture.class_id)
      .eq('normalized_label', normalized)
      .maybeSingle();
    let skill = existing;
    if (!skill) {
      const { data: created, error: skillError } = await supabase
        .from('skills')
        .insert({
          class_id: capture.class_id,
          label: gap.label.trim(),
          normalized_label: normalized,
        })
        .select('*')
        .single();
      if (skillError) throw skillError;
      skill = created;
    }
    if (index === 0) focusSkillId = skill.id;
    const { error: gapError } = await supabase
      .from('skill_gaps')
      .update({ status: 'approved', skill_id: skill.id, label: gap.label.trim() })
      .eq('id', gap.id);
    if (gapError) throw gapError;
  }

  if (focusSkillId) {
    const sentence = `Still working on ${live[0].label}.`;
    const { error } = await supabase
      .from('students')
      .update({
        current_focus_skill_id: focusSkillId,
        parent_sentence: capture.parent_sentence ?? sentence,
      })
      .eq('id', capture.student_id);
    if (error) throw error;
  }

  const approvedAt = new Date().toISOString();
  const approvedScore = scoreMark === 'numeric' ? asApprovedScore(score ?? capture.approved_score ?? capture.draft_score) : null;
  const targetAssignmentId = extras?.assignmentId || capture.assignment_id || null;
  const { error } = await supabase
    .from('captures')
    .update({
      status: 'approved',
      approved_at: approvedAt,
      approved_score: approvedScore,
      model_draft: { ...draft, scoreMark, gradeKind },
      ...(targetAssignmentId ? { assignment_id: targetAssignmentId } : {}),
    })
    .eq('id', capture.id);
  if (error) throw error;

  let assignmentId = targetAssignmentId;
  if (!assignmentId) {
    const title = live[0]?.label ? `${gradeKindLabel(gradeKind)}: ${live[0].label}` : gradeKindLabel(gradeKind);
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        class_id: capture.class_id,
        title,
        kind: 'capture',
        capture_id: capture.id,
        category: gradeKind,
      })
      .select('*')
      .single();
    if (assignmentError) {
      const retry = await supabase
        .from('assignments')
        .insert({
          class_id: capture.class_id,
          title,
          kind: 'capture',
          capture_id: capture.id,
        })
        .select('*')
        .single();
      if (retry.error) throw retry.error;
      assignmentId = retry.data.id;
    } else {
      assignmentId = assignment.id;
    }
  }

  const submission = {
    assignment_id: assignmentId,
    student_id: capture.student_id,
    status: 'graded' as const,
    approved_score: approvedScore,
    approved_at: approvedAt,
    score_mark: scoreMark,
  };
  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('student_id', capture.student_id)
    .maybeSingle();
  if (existing) {
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        status: 'graded',
        approved_score: approvedScore,
        approved_at: approvedAt,
        score_mark: scoreMark,
      })
      .eq('id', existing.id);
    if (updateError) {
      const retry = await supabase
        .from('submissions')
        .update({ status: 'graded', approved_score: approvedScore, approved_at: approvedAt })
        .eq('id', existing.id);
      if (retry.error) throw retry.error;
    }
  } else {
    const { error: submissionError } = await supabase.from('submissions').insert(submission);
    if (submissionError) {
      const { score_mark: _mark, ...withoutMark } = submission;
      const retry = await supabase.from('submissions').insert(withoutMark);
      if (retry.error) throw retry.error;
    }
  }
  if (gradeOnly) return { skillId: null, skillLabel: null };
  if (!focusSkillId) throw new Error('Could not assign a focus skill from that gap');
  return { skillId: focusSkillId, skillLabel: live[0]!.label };
}

export async function markNoteOnly(captureId: string) {
  const supabase = requireSupabase();
  await supabase.from('skill_gaps').update({ status: 'dismissed' }).eq('capture_id', captureId);
  const { error } = await supabase
    .from('captures')
    .update({ status: 'note_only', approved_at: new Date().toISOString() })
    .eq('id', captureId);
  if (error) throw error;
}

export async function listStudentCaptures(studentId: string): Promise<StudentCapture[]> {
  const supabase = requireSupabase();
  const { data: captures, error } = await supabase
    .from('captures')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!captures?.length) return [];

  const photoIds = [...new Set(captures.flatMap((row) => allPhotoAssetIds(row)))];
  const [assets, { data: gaps }] = await Promise.all([
    loadPhotoAssetPaths(photoIds),
    supabase
      .from('skill_gaps')
      .select('*')
      .in(
        'capture_id',
        captures.map((row) => row.id),
      )
      .order('sort_order', { ascending: true }),
  ]);

  const pathById = new Map(assets.map((asset) => [asset.id, asset.storage_path]));
  const knownThumbs = new Map(assets.map((asset) => [asset.storage_path, asset.thumb_storage_path]));
  const origPaths = [...pathById.values()];
  const [thumbUrls, originalUrls] = await Promise.all([
    signedThumbUrls(origPaths, knownThumbs, { fallbackOriginal: false }),
    signedUrls('photos', origPaths),
  ]);
  const gapsByCapture = new Map<string, SkillGapRow[]>();
  for (const gap of gaps ?? []) {
    if (!gap.capture_id) continue;
    const list = gapsByCapture.get(gap.capture_id) ?? [];
    list.push(gap);
    gapsByCapture.set(gap.capture_id, list);
  }

  return captures.map((capture) => {
    const thumbs: string[] = [];
    const originals: string[] = [];
    for (const id of allPhotoAssetIds(capture)) {
      const path = pathById.get(id);
      if (!path) continue;
      const thumb = thumbUrls.get(path);
      const original = originalUrls.get(path);
      if (thumb) thumbs.push(thumb);
      if (original) originals.push(original);
    }
    return {
      ...capture,
      // WorkRow / shelves: thumb only. Review pager uses photoUrls (originals).
      photoUrl: thumbs[0] ?? null,
      photoUrls: originals,
      gaps: gapsByCapture.get(capture.id) ?? [],
    };
  });
}

export async function listStudentGaps(studentId: string): Promise<SkillGapRow[]> {
  const { data, error } = await requireSupabase()
    .from('skill_gaps')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function normalizeSkill(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
