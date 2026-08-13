import type { NameMatch } from '@/lib/ai/types';
import { matchName, shouldAutoAttach } from '@/lib/matching/matchName';
import { signedUrlForAsset } from '@/lib/media/upload';
import { listRoster } from '@/lib/students/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { CaptureRow } from '@/lib/supabase/types';

export type InboxItem = CaptureRow & {
  photoUrl: string | null;
  matchedName: string | null;
};

export async function createUnassignedHomework(input: {
  classId: string;
  photoAssetId: string;
  audioAssetId?: string;
  transcript?: string | null;
}): Promise<CaptureRow> {
  const { data, error } = await requireSupabase()
    .from('captures')
    .insert({
      class_id: input.classId,
      kind: 'homework',
      input_source: 'camera',
      status: 'unassigned',
      student_id: null,
      photo_asset_id: input.photoAssetId,
      audio_asset_id: input.audioAssetId ?? null,
      transcript: input.transcript ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
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
  return data;
}

export async function applyTranscriptAndMatch(
  capture: CaptureRow,
  transcript: string,
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
  return data;
}

export async function transcribeCaptureAudio(captureId: string): Promise<string | null> {
  const { data, error } = await requireSupabase().functions.invoke('transcribe', {
    body: { captureId },
  });
  if (error) return null;
  const text = (data as { text?: string } | null)?.text;
  return text?.trim() ? text : null;
}

export function describeMatch(match: NameMatch): string {
  if (shouldAutoAttach(match)) return 'Filed on the matching student.';
  if (match.confidence > 0) return 'Name was unclear. Pick the student in the inbox.';
  return 'No roster name found. Pick the student in the inbox.';
}

export async function listInbox(classId: string): Promise<InboxItem[]> {
  const supabase = requireSupabase();
  const { data: captures, error } = await supabase
    .from('captures')
    .select('*')
    .eq('class_id', classId)
    .in('status', ['unassigned', 'attached'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!captures?.length) return [];

  const photoIds = captures
    .map((row) => row.photo_asset_id)
    .filter((id): id is string => Boolean(id));
  const studentIds = captures
    .map((row) => row.student_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: assets, error: assetError }, { data: students, error: studentError }] =
    await Promise.all([
      supabase
        .from('assets')
        .select('*')
        .in('id', photoIds.length ? photoIds : ['00000000-0000-0000-0000-000000000000']),
      supabase
        .from('students')
        .select('id, display_name')
        .in('id', studentIds.length ? studentIds : ['00000000-0000-0000-0000-000000000000']),
    ]);
  if (assetError) throw assetError;
  if (studentError) throw studentError;

  const pathById = new Map((assets ?? []).map((asset) => [asset.id, asset.storage_path]));
  const nameById = new Map((students ?? []).map((student) => [student.id, student.display_name]));

  return Promise.all(
    captures.map(async (capture) => {
      const path = capture.photo_asset_id ? pathById.get(capture.photo_asset_id) : undefined;
      const photoUrl = path ? await signedUrlForAsset('photo', path) : null;
      const matchedName = capture.student_id ? (nameById.get(capture.student_id) ?? null) : null;
      return { ...capture, photoUrl, matchedName };
    }),
  );
}

/** @deprecated use listInbox */
export async function listUnassigned(classId: string): Promise<InboxItem[]> {
  const items = await listInbox(classId);
  return items.filter((item) => item.status === 'unassigned');
}
