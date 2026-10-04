import { invokeAi } from '@/lib/ai/invoke';
import type { StoredHomeworkDraft } from '@/lib/gaps/api';
import { interpretSpokenStudentName } from '@/lib/matching/spokenName';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import type { AssetRow } from '@/lib/supabase/types';

import { cleanHomeworkStudentName, otherHomeworkStudents } from './homeworkName';

export type CapturePageInput = {
  uri: string;
  mimeType: string;
  asset?: AssetRow | null;
};

export type CaptureEvaluation = StoredHomeworkDraft & {
  transcript: string | null;
  studentName: string | null;
  /** Other readable student names when two papers are in frame (draft is for the primary). */
  otherStudentNames?: string[];
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
  // Pages and audio upload together (page order kept).
  const [photoAssets, audioAsset] = await Promise.all([
    Promise.all(
      (input.pages ?? []).map((page) =>
        page.asset
          ? Promise.resolve(page.asset)
          : uploadTeacherAsset({
              teacherId: input.teacherId,
              kind: 'photo',
              uri: page.uri,
              mimeType: page.mimeType || 'image/jpeg',
            }),
      ),
    ) as Promise<AssetRow[]>,
    input.existingAudio
      ? Promise.resolve(input.existingAudio)
      : input.audioUri
        ? uploadTeacherAsset({
            teacherId: input.teacherId,
            kind: 'audio',
            uri: input.audioUri,
            mimeType: input.audioMime ?? 'audio/m4a',
          })
        : Promise.resolve(null),
  ]);

  // Speech (transcribe → name) and the paper read are independent: run them side by side.
  const speechPromise: Promise<{ transcript: string | null; spokenName: string | null }> = (async () => {
    if (!audioAsset) return { transcript: null, spokenName: null };
    const audioUrl = await signedUrlForAsset('audio', audioAsset.storage_path);
    if (!audioUrl) return { transcript: null, spokenName: null };
    const stt = await invokeAi<{ text?: string }>('transcribe-audio', { audioUrl });
    const text = stt.text?.trim() || null;
    return { transcript: text, spokenName: text ? await interpretSpokenStudentName(text) : null };
  })();

  const visionPromise = (async () => {
    if (!photoAssets.length) return null;
    const imageUrls = (
      await Promise.all(photoAssets.map((asset) => signedUrlForAsset('photo', asset.storage_path)))
    ).filter((url): url is string => Boolean(url));
    if (!imageUrls.length) throw new Error('Could not open those photos.');
    return invokeAi<{
      studentName?: string | null;
      students?: Array<string | { name?: string }>;
      gaps?: StoredHomeworkDraft['gaps'];
      draftScore?: number | null;
      teacherNote?: string | null;
      costUsd?: number | null;
    }>('evaluate-homework', { imageUrls, imageUrl: imageUrls[0] });
  })();

  const [{ transcript, spokenName }, vision] = await Promise.all([speechPromise, visionPromise]);

  let paperName: string | null = null;
  let gaps: StoredHomeworkDraft['gaps'] = [];
  let draftScore: number | null = null;
  let teacherNote: string | null = null;
  let costUsd: number | null = null;
  let otherStudentNames: string[] = [];
  if (vision) {
    // Placeholder reads ("Name:", "[redacted]") never become a paper name.
    paperName = cleanHomeworkStudentName(vision.studentName);
    otherStudentNames = otherHomeworkStudents(paperName, vision.students);
    gaps = vision.gaps ?? [];
    draftScore = typeof vision.draftScore === 'number' ? vision.draftScore : null;
    teacherNote = vision.teacherNote ?? null;
    costUsd = typeof vision.costUsd === 'number' ? vision.costUsd : null;
  }

  return {
    photoAssets,
    audioAsset,
    transcript,
    studentName: spokenName || paperName,
    otherStudentNames,
    gaps,
    draftScore,
    teacherNote,
    costUsd,
    parentSentence: null,
    pageAssetIds: photoAssets.map((asset) => asset.id),
  };
}
