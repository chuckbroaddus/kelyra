import type { CaptureItem, CapturePreset, CaptureSubmitResult } from './types';
import { invokeAi } from '@/lib/ai/invoke';
import {
  MAX_GRADING_DOC_PAGES,
  readingStatusForPages,
  uploadGradingDocPages,
} from '@/lib/ingest/gradingDocPages';
import { invokeIngestGradingDoc } from '@/lib/ingest/invokeIngest';
import { putSyllabusIngestHandoff } from '@/lib/syllabus/ingestHandoff';
import { upsertSyllabusAskDraft } from '@/lib/syllabus/api';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';

export type SyllabusPresetOpts = {
  classId: string;
  teacherId: string;
};

/**
 * Syllabus import via Capture: no Class Stack, no "What is this?", one Import CTA.
 * Single image → parse-class-syllabus ask_draft (same as prior "Take/Choose a photo").
 * Multi page/file → ingest-grading-doc proposal handoff (same as document pages path).
 */
export function buildSyllabusCapturePreset(opts: SyllabusPresetOpts): CapturePreset {
  const { classId, teacherId } = opts;
  return {
    id: 'syllabus',
    showClassStack: false,
    showIntentBox: false,
    primaryActionLabel: 'Import',
    accept: 'images_pdf_docs',
    maxItems: MAX_GRADING_DOC_PAGES,
    classId,
    onSubmit: async (items: CaptureItem[]): Promise<CaptureSubmitResult> => {
      if (!classId) throw new Error('Pick a class before importing a syllabus.');
      if (!items.length) throw new Error('Add a photo or file first.');

      const images = items.filter((item) => item.mimeType.startsWith('image/'));
      const files = items.filter((item) => !item.mimeType.startsWith('image/'));

      // Multi-page / PDF document path (GB-11 ingest).
      if (images.length > 1 || files.length > 0) {
        const pages = [
          ...images.map((item) => ({ uri: item.uri, mimeType: item.mimeType })),
          // Non-image files go through the same uploader when mime is allowed.
          ...files.map((item) => ({ uri: item.uri, mimeType: item.mimeType })),
        ].slice(0, MAX_GRADING_DOC_PAGES);
        void readingStatusForPages(pages.length);
        const uploaded = await uploadGradingDocPages({
          teacherId,
          pages,
        });
        const { proposal } = await invokeIngestGradingDoc({
          kind: 'syllabus',
          class_id: classId,
          storage_paths: uploaded.storage_paths,
          image_urls: uploaded.image_urls,
          source_id: uploaded.source_id,
        });
        putSyllabusIngestHandoff(classId, proposal);
        return { returnTo: `/class/${classId}/syllabus` };
      }

      // Single photo → classic parse-class-syllabus ask_draft.
      const first = images[0] ?? items[0];
      if (!first) throw new Error('Add a syllabus photo first.');
      const asset = await uploadTeacherAsset({
        teacherId,
        kind: 'photo',
        uri: first.uri,
        mimeType: first.mimeType || 'image/jpeg',
      });
      const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
      if (!imageUrl) throw new Error('Could not open the uploaded photo.');
      const draft = await invokeAi<Record<string, unknown>>('parse-class-syllabus', {
        classId,
        imageUrl,
        mimeType: first.mimeType || asset.mime_type || 'image/jpeg',
      });
      if (draft.error) throw new Error(String(draft.error));
      await upsertSyllabusAskDraft(
        classId,
        { ...draft, schema_version: 1, class_id: classId },
        asset.id,
      );
      return { returnTo: `/class/${classId}/syllabus` };
    },
  };
}
