import { invokeAi } from '@/lib/ai/invoke';
import type { StoredHomeworkDraft } from '@/lib/gaps/api';
import { interpretSpokenStudentName } from '@/lib/matching/spokenName';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import type { AssetRow } from '@/lib/supabase/types';

export type CaptureEvaluation = StoredHomeworkDraft & {
  transcript: string | null;
  studentName: string | null;
  photoAsset: AssetRow | null;
  audioAsset: AssetRow | null;
};

export async function evaluateCaptureMedia(input: {
  teacherId: string;
  photoUri?: string | null;
  photoMime?: string;
  audioUri?: string | null;
  audioMime?: string;
  existingPhoto?: AssetRow | null;
  existingAudio?: AssetRow | null;
}): Promise<CaptureEvaluation> {
  const photoAsset =
    input.existingPhoto ??
    (input.photoUri
      ? await uploadTeacherAsset({
          teacherId: input.teacherId,
          kind: 'photo',
          uri: input.photoUri,
          mimeType: input.photoMime ?? 'image/jpeg',
        })
      : null);
  const audioAsset =
    input.existingAudio ??
    (input.audioUri
      ? await uploadTeacherAsset({
          teacherId: input.teacherId,
          kind: 'audio',
          uri: input.audioUri,
          mimeType: input.audioMime ?? 'audio/m4a',
        })
      : null);

  let transcript: string | null = null;
  let spokenName: string | null = null;
  if (audioAsset) {
    const audioUrl = await signedUrlForAsset('audio', audioAsset.storage_path);
    if (audioUrl) {
      const stt = await invokeAi<{ text?: string }>('transcribe-audio', { audioUrl });
      transcript = stt.text?.trim() || null;
      if (transcript) spokenName = await interpretSpokenStudentName(transcript);
    }
  }

  let paperName: string | null = null;
  let gaps: StoredHomeworkDraft['gaps'] = [];
  let draftScore: number | null = null;
  let teacherNote: string | null = null;
  if (photoAsset) {
    const imageUrl = await signedUrlForAsset('photo', photoAsset.storage_path);
    if (!imageUrl) throw new Error('Could not open that photo.');
    const vision = await invokeAi<{
      studentName?: string | null;
      gaps?: StoredHomeworkDraft['gaps'];
      draftScore?: number | null;
      teacherNote?: string | null;
    }>('evaluate-homework', { imageUrl });
    paperName = vision.studentName?.trim() || null;
    gaps = vision.gaps ?? [];
    draftScore = typeof vision.draftScore === 'number' ? vision.draftScore : null;
    teacherNote = vision.teacherNote ?? null;
  }

  return {
    photoAsset,
    audioAsset,
    transcript,
    studentName: spokenName || paperName,
    gaps,
    draftScore,
    teacherNote,
    parentSentence: null,
  };
}
