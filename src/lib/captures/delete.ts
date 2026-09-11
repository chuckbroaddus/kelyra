import { allPhotoAssetIds } from '@/lib/captures/pages';
import { legacyThumbStoragePath, thumbStoragePath } from '@/lib/media/paths';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssetKind } from '@/lib/supabase/types';

type AssetDeletePaths = {
  id: string;
  kind: AssetKind;
  storage_path: string;
  thumb_storage_path: string | null;
};

/**
 * Delete a capture (and unreferenced assets) via teacher_delete_capture.
 * Object files are removed best-effort through the Storage API afterward —
 * never via SQL delete on storage.objects (platform protect_delete).
 * If Storage API fails, the DB delete still succeeded (orphan file OK).
 */
export async function deleteCapture(captureId: string): Promise<void> {
  const sb = requireSupabase();

  const pending = await prefetchCaptureAssetPaths(captureId);

  const { error } = await sb.rpc('teacher_delete_capture', { p_capture_id: captureId });
  if (error) throw error;

  if (!pending.length) return;

  const remainingIds = await assetIdsStillPresent(pending.map((p) => p.id));
  const toRemove = pending.filter((p) => !remainingIds.has(p.id));
  await bestEffortRemoveStorageObjects(toRemove);
}

async function prefetchCaptureAssetPaths(captureId: string): Promise<AssetDeletePaths[]> {
  try {
    const sb = requireSupabase();
    const { data: cap, error } = await sb
      .from('captures')
      .select('photo_asset_id, audio_asset_id, model_draft')
      .eq('id', captureId)
      .maybeSingle();
    if (error || !cap) return [];

    const ids = [
      ...allPhotoAssetIds({
        photo_asset_id: cap.photo_asset_id,
        model_draft: cap.model_draft,
      }),
      ...(cap.audio_asset_id ? [cap.audio_asset_id] : []),
    ];
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return [];

    const { data: rows, error: assetsError } = await sb
      .from('assets')
      .select('id, kind, storage_path, thumb_storage_path')
      .in('id', unique);
    if (assetsError || !rows?.length) return [];

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      storage_path: row.storage_path,
      thumb_storage_path: row.thumb_storage_path ?? null,
    }));
  } catch {
    // Prefetch is best-effort; RPC must still run.
    return [];
  }
}

async function assetIdsStillPresent(ids: string[]): Promise<Set<string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Set();
  try {
    const { data } = await requireSupabase().from('assets').select('id').in('id', unique);
    return new Set((data ?? []).map((row) => row.id));
  } catch {
    // If we cannot confirm, skip Storage GC (safer than deleting a still-referenced object).
    return new Set(unique);
  }
}

async function bestEffortRemoveStorageObjects(assets: AssetDeletePaths[]): Promise<void> {
  const byBucket = new Map<'photos' | 'audio', Set<string>>();

  for (const asset of assets) {
    const bucket: 'photos' | 'audio' = asset.kind === 'photo' ? 'photos' : 'audio';
    const paths = byBucket.get(bucket) ?? new Set<string>();
    if (asset.storage_path) paths.add(asset.storage_path);
    if (asset.thumb_storage_path) paths.add(asset.thumb_storage_path);
    if (asset.kind === 'photo' && asset.storage_path) {
      const thumb = thumbStoragePath(asset.storage_path);
      const legacy = legacyThumbStoragePath(asset.storage_path);
      if (thumb) paths.add(thumb);
      if (legacy) paths.add(legacy);
    }
    byBucket.set(bucket, paths);
  }

  const sb = requireSupabase();
  for (const [bucket, pathSet] of byBucket) {
    const paths = [...pathSet].filter(Boolean);
    if (!paths.length) continue;
    try {
      await sb.storage.from(bucket).remove(paths);
    } catch {
      // Orphan file OK — never surface Storage API failure to the teacher.
    }
  }
}
