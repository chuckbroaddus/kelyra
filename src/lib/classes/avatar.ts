import { Platform } from 'react-native';

import { uploadTeacherAsset } from '@/lib/media/upload';
import { pickNormalizedPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { signedUrlsForAssetIds } from '@/lib/people/photos';
import { requireSupabase } from '@/lib/supabase/client';

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
