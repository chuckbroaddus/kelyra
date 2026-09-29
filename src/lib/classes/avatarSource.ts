/** Path mark: `{owner}/class-avatar-from/{teacherId}/{sourcePhotoAssetId}/…`. Snapshot, not a live follow. */
export const CLASS_AVATAR_FROM_SEGMENT = 'class-avatar-from';

export type ClassAvatarTeacherSource = {
  teacherId: string;
  sourcePhotoAssetId: string;
};

export function parseClassAvatarTeacherSource(
  storagePath: string | null | undefined,
): ClassAvatarTeacherSource | null {
  if (!storagePath) return null;
  const parts = storagePath.split('/');
  const idx = parts.indexOf(CLASS_AVATAR_FROM_SEGMENT);
  if (idx < 0 || parts.length < idx + 4) return null;
  const teacherId = parts[idx + 1];
  const sourcePhotoAssetId = parts[idx + 2];
  if (!teacherId || !sourcePhotoAssetId) return null;
  return { teacherId, sourcePhotoAssetId };
}

export function classAvatarFromPrefix(teacherId: string, sourcePhotoAssetId: string): string {
  return `${CLASS_AVATAR_FROM_SEGMENT}/${teacherId}/${sourcePhotoAssetId}`;
}
