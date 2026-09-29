import { Platform } from 'react-native';

import {
  classAvatarFromPrefix,
  parseClassAvatarTeacherSource,
  type ClassAvatarTeacherSource,
} from '@/lib/classes/avatarSource';
import { loadPhotoAssetPaths, uploadTeacherAsset } from '@/lib/media/upload';
import { pickNormalizedPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { signedOriginalUrlsForAssetIds, signedUrlsForAssetIds } from '@/lib/people/photos';
import { requireSupabase } from '@/lib/supabase/client';

export {
  CLASS_AVATAR_FROM_SEGMENT,
  classAvatarFromPrefix,
  parseClassAvatarTeacherSource,
  type ClassAvatarTeacherSource,
} from '@/lib/classes/avatarSource';

export async function setClassAvatar(classId: string, assetId: string | null): Promise<void> {
  const { error } = await requireSupabase().rpc('set_class_avatar', {
    p_class_id: classId,
    p_asset_id: assetId,
  });
  if (error) throw new Error(error.message || 'Could not save the class avatar');
}

export async function hydrateClassAvatars<T extends { avatar_asset_id?: string | null }>(
  rows: T[],
): Promise<Array<T & { avatarUrl: string | null }>> {
  const ids = [...new Set(rows.map((row) => row.avatar_asset_id).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return rows.map((row) => ({ ...row, avatarUrl: null }));
  const urls = await signedUrlsForAssetIds(ids);
  return rows.map((row) => ({
    ...row,
    avatarUrl: row.avatar_asset_id ? urls.get(row.avatar_asset_id) ?? null : null,
  }));
}

export async function loadClassAvatarTeacherSource(
  avatarAssetId: string | null | undefined,
): Promise<ClassAvatarTeacherSource | null> {
  if (!avatarAssetId) return null;
  const paths = await loadPhotoAssetPaths([avatarAssetId]);
  return parseClassAvatarTeacherSource(paths[0]?.storage_path);
}

export async function uploadClassAvatar(input: {
  teacherId: string;
  classId: string;
  uri: string;
  mimeType: string;
}): Promise<{ avatar_asset_id: string; avatarUrl: string | null }> {
  const asset = await uploadTeacherAsset({
    teacherId: input.teacherId,
    kind: 'photo',
    uri: input.uri,
    mimeType: input.mimeType,
  });
  await setClassAvatar(input.classId, asset.id);
  const urls = await signedUrlsForAssetIds([asset.id]);
  return { avatar_asset_id: asset.id, avatarUrl: urls.get(asset.id) ?? null };
}

/**
 * 4A snapshot: copy the teacher's face into an office-owned asset, then point the class at the copy.
 * Never sets classes.avatar_asset_id to the teacher's live photo_asset_id (set_class_avatar also
 * rejects that for office — assets.teacher_id must be auth.uid()).
 */
export async function snapshotClassAvatarFromTeacher(input: {
  officeUserId: string;
  classId: string;
  teacherId: string;
  sourcePhotoAssetId: string;
}): Promise<{ avatar_asset_id: string; avatarUrl: string | null }> {
  const originals = await signedOriginalUrlsForAssetIds([input.sourcePhotoAssetId]);
  const uri = originals.get(input.sourcePhotoAssetId);
  if (!uri) throw new Error('Could not read that teacher photo');

  const asset = await uploadTeacherAsset({
    teacherId: input.officeUserId,
    kind: 'photo',
    uri,
    mimeType: 'image/jpeg',
    prefix: classAvatarFromPrefix(input.teacherId, input.sourcePhotoAssetId),
  });
  await setClassAvatar(input.classId, asset.id);
  const urls = await signedUrlsForAssetIds([asset.id]);
  return { avatar_asset_id: asset.id, avatarUrl: urls.get(asset.id) ?? null };
}

export async function pickAndSetClassAvatar(input: {
  teacherId: string;
  classId: string;
  fromCamera: boolean;
}): Promise<'camera-web' | 'set' | 'cancelled'> {
  if (webCameraNeeded(input.fromCamera)) return 'camera-web';
  if (Platform.OS !== 'web') await waitForModalDismiss();
  const photo = await pickNormalizedPhoto(input.fromCamera);
  if (!photo) return 'cancelled';
  await uploadClassAvatar({
    teacherId: input.teacherId,
    classId: input.classId,
    uri: photo.uri,
    mimeType: photo.mimeType,
  });
  return 'set';
}
