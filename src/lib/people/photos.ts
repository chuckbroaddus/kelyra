import { pickNormalizedPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { signedThumbUrl, signedThumbUrls } from '@/lib/media/signedUrl';
import { loadPhotoAssetPaths } from '@/lib/media/upload';
import { uploadFramedProfilePhoto } from '@/lib/people/framePortrait';
import { requireSupabase } from '@/lib/supabase/client';
import type { ProfilePhotoKind, ProfileRow } from '@/lib/supabase/types';

function prefetchPhotoUrls(urls: Iterable<string | null | undefined>) {
  const list = [...urls].filter((url): url is string => Boolean(url));
  if (!list.length) return;
  void import('expo-image')
    .then(({ Image }) => Image.prefetch(list, 'memory-disk'))
    .catch(() => undefined);
}

/** Explicit for call-site clarity; signedThumbUrls already defaults to no original fallback. */
const AVATAR_THUMBS = { fallbackOriginal: false as const };

export async function signedProfileUrl(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath) return null;
  return signedThumbUrl(storagePath, undefined, AVATAR_THUMBS);
}

/** One Storage sign for every unique thumb. Never the original still (egress). */
export async function signedProfileUrls(
  paths: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (!unique.length) return new Map();
  return signedThumbUrls(unique, undefined, AVATAR_THUMBS);
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
  const assets = await loadPhotoAssetPaths(ids);
  const known = new Map(assets.map((asset) => [asset.storage_path, asset.thumb_storage_path]));
  const urlByPath = await signedThumbUrls(
    assets.map((asset) => asset.storage_path).filter(Boolean),
    known,
    AVATAR_THUMBS,
  );
  for (const asset of assets) {
    const url = urlByPath.get(asset.storage_path);
    if (url) out.set(asset.id, url);
  }
  return out;
}

async function photoAssetsFromTables(
  people: Array<Pick<ProfileRow, 'id' | 'student_id' | 'parent_id'>>,
): Promise<Map<string, string>> {
  const supabase = requireSupabase();
  const studentIds = [...new Set(people.map((row) => row.student_id).filter((id): id is string => Boolean(id)))];
  const parentIds = [...new Set(people.map((row) => row.parent_id).filter((id): id is string => Boolean(id)))];
  const staffIds = people.filter((row) => !row.student_id && !row.parent_id).map((row) => row.id);
  const [{ data: students }, { data: parents }, { data: teachers }] = await Promise.all([
    studentIds.length
      ? supabase.from('students').select('id, photo_asset_id').in('id', studentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; photo_asset_id: string | null }> }),
    parentIds.length
      ? supabase.from('parents').select('id, photo_asset_id').in('id', parentIds)
      : Promise.resolve({ data: [] as Array<{ id: string; photo_asset_id: string | null }> }),
    staffIds.length
      ? supabase.from('teachers').select('id, photo_asset_id').in('id', staffIds)
      : Promise.resolve({ data: [] as Array<{ id: string; photo_asset_id: string | null }> }),
  ]);
  const studentAsset = new Map((students ?? []).map((row) => [row.id, row.photo_asset_id]));
  const parentAsset = new Map((parents ?? []).map((row) => [row.id, row.photo_asset_id]));
  const teacherAsset = new Map((teachers ?? []).map((row) => [row.id, row.photo_asset_id]));
  const out = new Map<string, string>();
  for (const person of people) {
    const asset = person.student_id
      ? studentAsset.get(person.student_id)
      : teacherAsset.get(person.id) ?? (person.parent_id ? parentAsset.get(person.parent_id) : null);
    if (asset) out.set(person.id, asset);
  }
  return out;
}

/** Faces for school profiles. Prefers the school-wide RPC (RLS hides colleague photos otherwise). */
export async function photoUrlsForProfiles(
  people: Array<Pick<ProfileRow, 'id' | 'student_id' | 'parent_id'>>,
): Promise<Map<string, string | null>> {
  const out = new Map(people.map((row) => [row.id, null as string | null]));
  if (!people.length) return out;
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('profile_photo_assets', {
    p_ids: people.map((row) => row.id),
  });
  const paths = new Map<string, string>();
  const assets = new Map<string, string>();
  if (!error && data) {
    for (const row of data) {
      if (row.storage_path) paths.set(row.profile_id, row.storage_path);
      if (row.photo_asset_id) assets.set(row.profile_id, row.photo_asset_id);
    }
  }
  const missing = people.filter((row) => !paths.has(row.id) && !assets.has(row.id));
  if (missing.length) {
    const fallback = await photoAssetsFromTables(missing);
    for (const [id, asset] of fallback) assets.set(id, asset);
  }
  if (paths.size) {
    const urlByPath = await signedThumbUrls([...paths.values()], undefined, AVATAR_THUMBS);
    for (const [id, path] of paths) {
      const url = urlByPath.get(path);
      if (url) out.set(id, url);
    }
  }
  const stillNeed = [...assets].filter(([id]) => !out.get(id));
  if (stillNeed.length) {
    const urls = await signedUrlsForAssetIds([...new Set(stillNeed.map(([, asset]) => asset))]);
    for (const [id, asset] of stillNeed) {
      const url = urls.get(asset);
      if (url) out.set(id, url);
    }
  }
  prefetchPhotoUrls(out.values());
  return out;
}

export async function attachProfilePhotos<T extends Pick<ProfileRow, 'id' | 'student_id' | 'parent_id'>>(
  rows: T[],
): Promise<Array<T & { photoUrl: string | null }>> {
  const urls = await photoUrlsForProfiles(rows);
  return rows.map((row) => ({ ...row, photoUrl: urls.get(row.id) ?? null }));
}

export async function hydratePhotoUrls<T extends { photo_asset_id?: string | null }>(
  rows: T[],
): Promise<Array<T & { photoUrl: string | null }>> {
  const ids = [...new Set(rows.map((row) => row.photo_asset_id).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return rows.map((row) => ({ ...row, photoUrl: null }));
  const urls = await signedUrlsForAssetIds(ids);
  prefetchPhotoUrls(urls.values());
  return rows.map((row) => ({
    ...row,
    photoUrl: row.photo_asset_id ? urls.get(row.photo_asset_id) ?? null : null,
  }));
}

export async function setProfilePhoto(
  kind: ProfilePhotoKind,
  personId: string,
  assetId: string,
): Promise<void> {
  // Atomic replace via RPC: taught-class / office / owner auth (same wall as clear),
  // then _unref_delete_asset on the previous photo so co-teachers do not orphan uploads.
  const { error } = await requireSupabase().rpc('teacher_set_profile_photo', {
    p_kind: kind,
    p_person_id: personId,
    p_asset_id: assetId,
  });
  if (error) throw error;
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
  // Face crop + background cutout. People records only — never group chat avatars.
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
  // Student / parent / teacher faces. Group chats use pickGroupPhoto (raw, no cutout).
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
