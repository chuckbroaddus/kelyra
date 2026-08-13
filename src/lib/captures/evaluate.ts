import { invokeAi } from '@/lib/ai/invoke';
import type { StoredHomeworkDraft } from '@/lib/gaps/api';
import { interpretSpokenStudentName } from '@/lib/matching/spokenName';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import type { AssetRow } from '@/lib/supabase/types';

export type CapturePageInput = {
  uri: string;
  mimeType: string;
  asset?: AssetRow | null;
};

export type CaptureEvaluation = StoredHomeworkDraft & {
  transcript: string | null;
  studentName: string | null;
  photoAssets: AssetRow[];
  audioAsset: AssetRow | null;
};

export async function evaluateCaptureMedia(input: {
  teacherId: string;
  pages?: CapturePageInput[];
  audioUri?: string | null;
  audioMime?: string;
  existingAudio?: AssetRow | null;
}): Promise<CaptureEvaluation> {
  const photoAssets: AssetRow[] = [];
  for (const page of input.pages ?? []) {
    if (page.asset) {
      photoAssets.push(page.asset);
      continue;
    }
    photoAssets.push(
      await uploadTeacherAsset({
        teacherId: input.teacherId,
        kind: 'photo',
        uri: page.uri,
        mimeType: page.mimeType || 'image/jpeg',
      }),
    );
  }

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
  if (photoAssets.length) {
    const imageUrls: string[] = [];
    for (const asset of photoAssets) {
      const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
      if (imageUrl) imageUrls.push(imageUrl);
    }
    if (!imageUrls.length) throw new Error('Could not open those photos.');
    const vision = await invokeAi<{
      studentName?: string | null;
      gaps?: StoredHomeworkDraft['gaps'];
      draftScore?: number | null;
      teacherNote?: string | null;
    }>('evaluate-homework', { imageUrls, imageUrl: imageUrls[0] });
    paperName = vision.studentName?.trim() || null;
    gaps = vision.gaps ?? [];
    draftScore = typeof vision.draftScore === 'number' ? vision.draftScore : null;
    teacherNote = vision.teacherNote ?? null;
  }

  return {
    photoAssets,
    audioAsset,
    transcript,
    studentName: spokenName || paperName,
    gaps,
    draftScore,
    teacherNote,
    parentSentence: null,
    pageAssetIds: photoAssets.map((asset) => asset.id),
  };
}
