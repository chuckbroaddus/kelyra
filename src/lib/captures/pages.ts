export function pageAssetIdsFromDraft(draft: unknown): string[] {
  if (!draft || typeof draft !== 'object') return [];
  const ids = (draft as { pageAssetIds?: unknown }).pageAssetIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export function allPhotoAssetIds(capture: {
  photo_asset_id: string | null;
  model_draft: unknown;
}): string[] {
  const extras = pageAssetIdsFromDraft(capture.model_draft);
  const first = capture.photo_asset_id;
  const ids = first ? [first, ...extras.filter((id) => id !== first)] : extras;
  return [...new Set(ids)];
}
