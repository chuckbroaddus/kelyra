import { signedUrlForAsset } from '@/lib/media/upload';
import { requireSupabase } from '@/lib/supabase/client';
import type { CaptureRow, SkillGapRow } from '@/lib/supabase/types';

export type StudentCapture = CaptureRow & {
  photoUrl: string | null;
  gaps: SkillGapRow[];
};

export async function analyzeAttachedCapture(captureId: string): Promise<boolean> {
  const { data, error } = await requireSupabase().functions.invoke('analyze-homework', {
    body: { captureId },
  });
  if (error) return false;
  return !(data as { error?: string } | null)?.error;
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

export async function approveCapture(capture: CaptureRow, gaps: SkillGapRow[]) {
  if (!capture.student_id) throw new Error('Capture has no student');
  const supabase = requireSupabase();
  const live = gaps.filter((gap) => gap.status !== 'dismissed' && gap.label.trim());
  if (!live[0]) throw new Error('Add or keep at least one gap to approve');

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
    const { error } = await supabase
      .from('students')
      .update({ current_focus_skill_id: focusSkillId })
      .eq('id', capture.student_id);
    if (error) throw error;
  }

  const approvedAt = new Date().toISOString();
  const { error } = await supabase
    .from('captures')
    .update({
      status: 'approved',
      approved_at: approvedAt,
    })
    .eq('id', capture.id);
  if (error) throw error;

  const title = live[0]?.label ? `Work: ${live[0].label}` : 'Approved work';
  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .insert({
      class_id: capture.class_id,
      title,
      kind: 'capture',
      capture_id: capture.id,
    })
    .select('*')
    .single();
  if (assignmentError) throw assignmentError;
  const { error: submissionError } = await supabase.from('submissions').insert({
    assignment_id: assignment.id,
    student_id: capture.student_id,
    status: 'approved',
    approved_score: capture.approved_score,
    approved_at: approvedAt,
  });
  if (submissionError) throw submissionError;
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

  const photoIds = captures
    .map((row) => row.photo_asset_id)
    .filter((id): id is string => Boolean(id));
  const [{ data: assets }, { data: gaps }] = await Promise.all([
    supabase
      .from('assets')
      .select('*')
      .in('id', photoIds.length ? photoIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('skill_gaps')
      .select('*')
      .in(
        'capture_id',
        captures.map((row) => row.id),
      )
      .order('sort_order', { ascending: true }),
  ]);

  const pathById = new Map((assets ?? []).map((asset) => [asset.id, asset.storage_path]));
  const gapsByCapture = new Map<string, SkillGapRow[]>();
  for (const gap of gaps ?? []) {
    const list = gapsByCapture.get(gap.capture_id) ?? [];
    list.push(gap);
    gapsByCapture.set(gap.capture_id, list);
  }

  return Promise.all(
    captures.map(async (capture) => {
      const path = capture.photo_asset_id ? pathById.get(capture.photo_asset_id) : undefined;
      return {
        ...capture,
        photoUrl: path ? await signedUrlForAsset('photo', path) : null,
        gaps: gapsByCapture.get(capture.id) ?? [],
      };
    }),
  );
}

function normalizeSkill(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
