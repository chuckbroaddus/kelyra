import { pickNormalizedPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { signedUrlForAsset } from '@/lib/media/upload';
import { uploadFramedProfilePhoto } from '@/lib/people/framePortrait';
import { requireSupabase } from '@/lib/supabase/client';
import type { ProfilePhotoKind } from '@/lib/supabase/types';

export async function signedProfileUrl(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath) return null;
  return signedUrlForAsset('photo', storagePath);
}

export async function signedProfileUrlForAssetId(assetId: string | null | undefined): Promise<string | null> {
  if (!assetId) return null;
  const map = await signedUrlsForAssetIds([assetId]);
  return map.get(assetId) ?? null;
}

export async function signedUrlsForAssetIds(assetIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(assetIds.filter(Boolean))];
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const { data, error } = await requireSupabase().from('assets').select('id, storage_path').in('id', ids);
  if (error) return out;
  await Promise.all(
    (data ?? []).map(async (asset) => {
      const url = await signedProfileUrl(asset.storage_path);
      if (url) out.set(asset.id, url);
    }),
  );
  return out;
}

export async function hydratePhotoUrls<T extends { photo_asset_id?: string | null }>(
  rows: T[],
): Promise<Array<T & { photoUrl: string | null }>> {
  const ids = [...new Set(rows.map((row) => row.photo_asset_id).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return rows.map((row) => ({ ...row, photoUrl: null }));
  const { data, error } = await requireSupabase().from('assets').select('id, storage_path').in('id', ids);
  if (error) throw error;
  const pathById = new Map((data ?? []).map((asset) => [asset.id, asset.storage_path]));
  return Promise.all(
    rows.map(async (row) => {
      const path = row.photo_asset_id ? pathById.get(row.photo_asset_id) : null;
      return { ...row, photoUrl: path ? await signedProfileUrl(path) : null };
    }),
  );
}

export async function setProfilePhoto(
  kind: ProfilePhotoKind,
  personId: string,
  assetId: string,
): Promise<void> {
  const table = kind === 'student' ? 'students' : kind === 'parent' ? 'parents' : 'teachers';
  const supabase = requireSupabase();
  const { data: current, error: loadError } = await supabase
    .from(table)
    .select('photo_asset_id')
    .eq('id', personId)
    .single();
  if (loadError) throw loadError;
  const { error } = await supabase.from(table).update({ photo_asset_id: assetId }).eq('id', personId);
  if (error) throw error;
  const previous = current?.photo_asset_id;
  if (previous && previous !== assetId) {
    await supabase.rpc('teacher_unref_asset', { p_asset_id: previous });
  }
}

export async function clearProfilePhoto(kind: ProfilePhotoKind, personId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('teacher_clear_profile_photo', {
    p_kind: kind,
    p_person_id: personId,
  });
  if (error) throw error;
}

export async function uploadProfilePhoto(input: {
  teacherId: string;
  kind: ProfilePhotoKind;
  personId: string;
  uri: string;
  mimeType: string;
  imageUrl?: string | null;
}): Promise<void> {
  const framed = await uploadFramedProfilePhoto({
    teacherId: input.teacherId,
    uri: input.uri,
    mimeType: input.mimeType,
    imageUrl: input.imageUrl,
  });
  await setProfilePhoto(input.kind, input.personId, framed.id);
}

export async function pickAndSetProfilePhoto(input: {
  teacherId: string;
  kind: ProfilePhotoKind;
  personId: string;
  fromCamera: boolean;
}): Promise<'camera-web' | 'set' | 'cancelled'> {
  if (webCameraNeeded(input.fromCamera)) return 'camera-web';
  await waitForModalDismiss();
  const photo = await pickNormalizedPhoto(input.fromCamera);
  if (!photo) return 'cancelled';
  await uploadProfilePhoto({
    teacherId: input.teacherId,
    kind: input.kind,
    personId: input.personId,
    uri: photo.uri,
    mimeType: photo.mimeType,
  });
  return 'set';
}
