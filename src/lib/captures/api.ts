import { invokeAi } from '@/lib/ai/invoke';
import type { NameMatch } from '@/lib/ai/types';
import { allPhotoAssetIds } from '@/lib/captures/pages';
import { analyzeAttachedCapture, draftHasWork, storeCaptureDraft, type StoredHomeworkDraft } from '@/lib/gaps/api';
import { matchName, shouldAutoAttach } from '@/lib/matching/matchName';
import { loadPhotoAssetPaths } from '@/lib/media/upload';
import { signedThumbUrls } from '@/lib/media/signedUrl';
import { listRoster } from '@/lib/students/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssignmentKind, CaptureRow, SubmissionStatus } from '@/lib/supabase/types';

export type InboxItem = CaptureRow & {
  photoUrl: string | null;
  photoUrls: string[];
  pageCount: number;
  matchedName: string | null;
};

export async function createCapture(input: {
  classId: string;
  kind: 'homework' | 'voice_note';
  inputSource: 'voice' | 'camera' | 'typed';
  photoAssetId?: string | null;
  audioAssetId?: string | null;
  transcript?: string | null;
  assignmentId?: string | null;
}): Promise<CaptureRow> {
  const { data, error } = await requireSupabase()
    .from('captures')
    .insert({
      class_id: input.classId,
      kind: input.kind,
      input_source: input.inputSource,
      status: 'unassigned',
      student_id: null,
      photo_asset_id: input.photoAssetId ?? null,
      audio_asset_id: input.audioAssetId ?? null,
      transcript: input.transcript ?? null,
      ...(input.assignmentId ? { assignment_id: input.assignmentId } : {}),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function createUnassignedHomework(input: {
  classId: string;
  photoAssetId: string;
  audioAssetId?: string;
  transcript?: string | null;
}): Promise<CaptureRow> {
  return createCapture({
    classId: input.classId,
    kind: 'homework',
    inputSource: 'camera',
    photoAssetId: input.photoAssetId,
    audioAssetId: input.audioAssetId,
    transcript: input.transcript,
  });
}

export async function attachCapture(captureId: string, studentId: string): Promise<CaptureRow> {
  const { data, error } = await requireSupabase()
    .from('captures')
    .update({
      student_id: studentId,
      status: 'attached',
      attached_at: new Date().toISOString(),
    })
    .eq('id', captureId)
    .select('*')
    .single();
  if (error) throw error;
  if (data.kind === 'homework') {
    await analyzeOrReuseDraft(data);
  }
  return data;
}

export async function applyTranscriptAndMatch(
  capture: CaptureRow,
  transcript: string,
  draft?: StoredHomeworkDraft | null,
): Promise<CaptureRow> {
  const roster = await listRoster(capture.class_id);
  const match = matchName(
    transcript,
    roster.map((student) => ({
      studentId: student.id,
      displayName: student.display_name,
      aliases: student.name_aliases,
    })),
  );

  const attach = shouldAutoAttach(match);
  const { data, error } = await requireSupabase()
    .from('captures')
    .update({
      transcript,
      guessed_student_id: match.guessedStudentId,
      match_confidence: match.confidence,
      ...(attach
        ? {
            student_id: match.guessedStudentId,
            status: 'attached' as const,
            attached_at: new Date().toISOString(),
          }
        : {}),
    })
    .eq('id', capture.id)
    .select('*')
    .single();
  if (error) throw error;
  if (draft && draftHasWork(draft)) {
    await storeCaptureDraft(data.id, draft, data.student_id);
    const { data: refreshed } = await requireSupabase()
      .from('captures')
      .select('*')
      .eq('id', data.id)
      .single();
    return refreshed ?? data;
  }
  if (data.status === 'attached' && data.kind === 'homework') {
    await analyzeOrReuseDraft(data);
  }
  return data;
}

export async function saveCaptureEvaluation(
  captureId: string,
  draft: StoredHomeworkDraft,
  studentId?: string | null,
) {
  await storeCaptureDraft(captureId, draft, studentId);
}

async function analyzeOrReuseDraft(capture: CaptureRow) {
  const stored = capture.model_draft as StoredHomeworkDraft | null;
  if (stored?.pending || capture.ai_status === 'pending' || capture.ai_status === 'running') return;
  if (stored && draftHasWork(stored)) {
    if (capture.student_id) {
      await storeCaptureDraft(capture.id, stored, capture.student_id);
    }
    return;
  }
  try {
    await analyzeAttachedCapture(capture.id, { queue: true });
  } catch {
    // Filing must succeed even if AI is offline. Teacher can tap Draft queued.
  }
}

export async function transcribeCaptureAudio(captureId: string): Promise<string | null> {
  try {
    const data = await invokeAi<{ text?: string }>('transcribe', { captureId });
    return data.text?.trim() ? data.text : null;
  } catch {
    return null;
  }
}

export function describeMatch(match: NameMatch): string {
  if (shouldAutoAttach(match)) return 'Filed on the matching student.';
  if (match.confidence > 0) return 'Name was unclear. Pick the student in the inbox.';
  return 'No roster name found. Pick the student in the inbox.';
}

export async function countInbox(classId: string): Promise<number> {
  const { count, error } = await requireSupabase()
    .from('captures')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .in('status', ['unassigned', 'attached', 'draft']);
  if (error) throw error;
  return count ?? 0;
}

export async function countNeedsYou(classId: string): Promise<number> {
  const inbox = await countInbox(classId);
  const supabase = requireSupabase();
  const { data: assignments, error: assignmentError } = await supabase
    .from('assignments')
    .select('id')
    .eq('class_id', classId);
  if (assignmentError) throw assignmentError;
  if (!assignments?.length) return inbox;
  const { count, error } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .in(
      'assignment_id',
      assignments.map((row) => row.id),
    )
    .in('status', ['completed']);
  if (error) throw error;
  return inbox + (count ?? 0);
}

export type TurnedInItem = {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  submittedAt: string;
  kind: AssignmentKind;
  status: SubmissionStatus;
};

export async function listTurnedIn(classId: string): Promise<TurnedInItem[]> {
  const supabase = requireSupabase();
  const { data: assignments, error: assignmentError } = await supabase
    .from('assignments')
    .select('id, title, kind')
    .eq('class_id', classId);
  if (assignmentError) throw assignmentError;
  if (!assignments?.length) return [];
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .in(
      'assignment_id',
      assignments.map((row) => row.id),
    )
    .in('status', ['completed'])
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  if (!submissions?.length) return [];
  const studentIds = [...new Set(submissions.map((row) => row.student_id))];
  const { data: students } = await supabase.from('students').select('id, display_name').in('id', studentIds);
  const nameById = new Map((students ?? []).map((row) => [row.id, row.display_name]));
  const titleById = new Map(assignments.map((row) => [row.id, row.title]));
  const kindById = new Map(assignments.map((row) => [row.id, row.kind]));
  return submissions.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: nameById.get(row.student_id) ?? 'Student',
    title: titleById.get(row.assignment_id) ?? 'Practice',
    submittedAt: row.submitted_at ?? row.created_at,
    kind: kindById.get(row.assignment_id) ?? 'practice',
    status: row.status,
  }));
}

export async function listThisWeek(classId: string): Promise<{
  captures: InboxItem[];
  practice: TurnedInItem[];
}> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const inbox = await listInbox(classId);
  const supabase = requireSupabase();
  const { data: captures, error } = await supabase
    .from('captures')
    .select('*')
    .eq('class_id', classId)
    .or(`created_at.gte.${cutoff},approved_at.gte.${cutoff}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const extraIds = (captures ?? []).filter((row) => !inbox.some((item) => item.id === row.id));
  const hydrated = extraIds.length ? await hydrateCaptures(extraIds) : [];
  const practice = (await listTurnedIn(classId)).filter((item) => item.submittedAt >= cutoff);
  return { captures: [...inbox, ...hydrated], practice };
}

export async function returnCaptureToInbox(captureId: string) {
  const { error } = await requireSupabase()
    .from('captures')
    .update({
      student_id: null,
      status: 'unassigned',
      attached_at: null,
    })
    .eq('id', captureId);
  if (error) throw error;
}

export async function listInbox(classId: string): Promise<InboxItem[]> {
  const { data: captures, error } = await requireSupabase()
    .from('captures')
    .select('*')
    .eq('class_id', classId)
    .in('status', ['unassigned', 'attached', 'draft'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!captures?.length) return [];
  return hydrateCaptures(captures);
}

async function hydrateCaptures(captures: CaptureRow[]): Promise<InboxItem[]> {
  const supabase = requireSupabase();
  const photoIds = [...new Set(captures.flatMap((row) => allPhotoAssetIds(row)))];
  const studentIds = captures.map((row) => row.student_id).filter((id): id is string => Boolean(id));
  const [assets, { data: students }] = await Promise.all([
    loadPhotoAssetPaths(photoIds),
    supabase
      .from('students')
      .select('id, display_name')
      .in('id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000']),
  ]);
  const pathById = new Map(assets.map((asset) => [asset.id, asset.storage_path]));
  const knownThumbs = new Map(assets.map((asset) => [asset.storage_path, asset.thumb_storage_path]));
  const thumbUrls = await signedThumbUrls([...pathById.values()], knownThumbs);
  const nameById = new Map((students ?? []).map((student) => [student.id, student.display_name]));
  return captures.map((capture) => {
    const photoUrls: string[] = [];
    for (const assetId of allPhotoAssetIds(capture)) {
      const path = pathById.get(assetId);
      const url = path ? thumbUrls.get(path) : null;
      if (url) photoUrls.push(url);
    }
    const matchedName = capture.student_id ? (nameById.get(capture.student_id) ?? null) : null;
    return {
      ...capture,
      photoUrl: photoUrls[0] ?? null,
      photoUrls,
      pageCount: photoUrls.length || allPhotoAssetIds(capture).length,
      matchedName,
    };
  });
}

/** @deprecated use listInbox */
export async function listUnassigned(classId: string): Promise<InboxItem[]> {
  const items = await listInbox(classId);
  return items.filter((item) => item.status === 'unassigned');
}
