/** Max page JPEGs sent to analyze-homework per call (BATCH-v1 I4). Keep in sync with Edge. */
export const MAX_HOMEWORK_PAGE_IMAGES = 4;

export function pageAssetIdsFromDraft(draft: unknown): string[] {
  if (!draft || typeof draft !== 'object') return [];
  const ids = (draft as { pageAssetIds?: unknown }).pageAssetIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** photo_asset_id first, then model_draft.pageAssetIds, deduped. Batch mint uses the same shape. */
export function allPhotoAssetIds(capture: {
  photo_asset_id: string | null;
  model_draft: unknown;
}): string[] {
  const extras = pageAssetIdsFromDraft(capture.model_draft);
  const first = capture.photo_asset_id;
  const ids = first ? [first, ...extras.filter((id) => id !== first)] : extras;
  return [...new Set(ids)];
}

/** Page JPEG asset ids for the model call — never more than MAX_HOMEWORK_PAGE_IMAGES. */
export function homeworkPageAssetIdsForModel(capture: {
  photo_asset_id: string | null;
  model_draft: unknown;
}): string[] {
  return allPhotoAssetIds(capture).slice(0, MAX_HOMEWORK_PAGE_IMAGES);
}

/** Keep multi-page ids when a gap draft write omits them. */
export function mergePreservedPageAssetIds<T extends { pageAssetIds?: string[] }>(
  next: T,
  prior: unknown,
): T {
  if (next.pageAssetIds?.length) return next;
  const priorIds = pageAssetIdsFromDraft(prior);
  if (!priorIds.length) return next;
  return { ...next, pageAssetIds: priorIds };
}
