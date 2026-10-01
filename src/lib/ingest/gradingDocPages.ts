/**
 * Multi-page syllabus / school-policy document ingest helpers (client).
 *
 * Server (`ingest-grading-doc`) accepts up to 20 image_urls / storage_paths and
 * keeps array order as page order in the model prompt. Vision only sees
 * image_urls — a multi-page PDF is NOT rasterized server-side. Send one image
 * per page (photos or client-rendered page JPEGs). If a single PDF is ever
 * attached, it counts as one storage entry only and still needs page images
 * for extraction.
 */

export const MAX_GRADING_DOC_PAGES = 20;

export type GradingDocPage = { uri: string; mimeType: string };

export type UploadedGradingDocPages = {
  source_id: string;
  asset_ids: string[];
  storage_paths: string[];
  image_urls: string[];
  page_count: number;
  truncated: boolean;
};

type UploadFn = (input: {
  teacherId: string;
  kind: 'photo';
  uri: string;
  mimeType: string;
}) => Promise<{ id: string; storage_path: string }>;

type SignFn = (kind: 'photo', storagePath: string) => Promise<string | null>;

export function clampGradingDocPages(
  pages: GradingDocPage[],
  max: number = MAX_GRADING_DOC_PAGES,
): { pages: GradingDocPage[]; truncated: boolean } {
  const cleaned = (pages ?? []).filter((p) => p && typeof p.uri === 'string' && p.uri.length > 0);
  if (cleaned.length <= max) return { pages: cleaned, truncated: false };
  return { pages: cleaned.slice(0, max), truncated: true };
}

export function pageCountLabel(n: number): string {
  const count = Math.max(0, Math.floor(n));
  return count === 1 ? '1 page' : `${count} pages`;
}

export function readingStatusForPages(n: number): string {
  const count = Math.max(1, Math.floor(n));
  if (count === 1) return 'Reading your document…';
  return `Reading your ${count} pages…`;
}

export function maxPagesCopy(max: number = MAX_GRADING_DOC_PAGES): string {
  return `You can send up to ${max} pages at once. Extra pages were left out.`;
}

/** Build ordered storage_paths + image_urls for one ingest-grading-doc call. */
export async function uploadGradingDocPages(input: {
  teacherId: string;
  pages: GradingDocPage[];
  max?: number;
  upload?: UploadFn;
  sign?: SignFn;
}): Promise<UploadedGradingDocPages> {
  const { pages, truncated } = clampGradingDocPages(input.pages, input.max ?? MAX_GRADING_DOC_PAGES);
  if (!pages.length) throw new Error('Add at least one page of your document.');

  let upload = input.upload;
  let sign = input.sign;
  if (!upload || !sign) {
    // Lazy so unit tests can inject mocks without loading react-native.
    const media = await import('@/lib/media/upload');
    upload = upload ?? media.uploadTeacherAsset;
    sign = sign ?? media.signedUrlForAsset;
  }

  // Parallel upload; index tags keep page order in the arrays we send.
  const settled = await Promise.all(
    pages.map(async (page, index) => {
      const asset = await upload!({
        teacherId: input.teacherId,
        kind: 'photo',
        uri: page.uri,
        mimeType: page.mimeType || 'image/jpeg',
      });
      const imageUrl = await sign!('photo', asset.storage_path);
      if (!imageUrl) throw new Error(`Could not open uploaded page ${index + 1}.`);
      return {
        index,
        id: asset.id,
        storage_path: asset.storage_path,
        image_url: imageUrl,
      };
    }),
  );

  settled.sort((a, b) => a.index - b.index);
  return {
    source_id: settled[0]!.id,
    asset_ids: settled.map((row) => row.id),
    storage_paths: settled.map((row) => row.storage_path),
    image_urls: settled.map((row) => row.image_url),
    page_count: settled.length,
    truncated,
  };
}
