import { useState } from 'react';
import { Platform } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { PhotoSheet, type PhotoSheetTeacherImage } from '@/components/ui/PhotoSheet';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { getClass, listClassTeachers } from '@/lib/classes/api';
import {
  loadClassAvatarTeacherSource,
  pickAndSetClassAvatar,
  setClassAvatar,
  snapshotClassAvatarFromTeacher,
  uploadClassAvatar,
} from '@/lib/classes/avatar';
import { webCameraNeeded } from '@/lib/media/pickPhoto';
import type { ClassRow } from '@/lib/supabase/types';

type Props = {
  klass: ClassRow;
  onChange: (next: ClassRow) => void;
  onError: (message: string | null) => void;
  /** Office class card: no explainer status once a photo is set (Chuck 2026-09-25). Hosts teacher-image block. */
  quiet?: boolean;
};

export function ClassAvatarRow({ klass, onChange, onError, quiet = false }: Props) {
  const { teacher } = useAuth();
  const chrome = useChrome();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [teacherImages, setTeacherImages] = useState<PhotoSheetTeacherImage[] | undefined>(undefined);
  const hasPhoto = Boolean(klass.avatar_asset_id || klass.avatarUrl);

  const refresh = async () => {
    const fresh = await getClass(klass.id);
    onChange(fresh);
    chrome.refreshChrome();
  };

  const openSheet = () => {
    if (!quiet) {
      setTeacherImages(undefined);
      setSheetOpen(true);
      return;
    }
    void (async () => {
      onError(null);
      try {
        const [assigned, source] = await Promise.all([
          listClassTeachers(klass.id),
          loadClassAvatarTeacherSource(klass.avatar_asset_id),
        ]);
        // 2A: only teachers of this class who have a photo; omit the rest. No empty-state copy.
        setTeacherImages(
          assigned
            .filter((row): row is typeof row & { photo_asset_id: string } => Boolean(row.photo_asset_id))
            .map((row) => {
              const using = Boolean(source && source.teacherId === row.id);
              const keptEarlier = Boolean(
                using && source && source.sourcePhotoAssetId !== row.photo_asset_id,
              );
              return {
                id: row.id,
                displayName: row.display_name,
                photoUrl: row.photoUrl,
                photoAssetId: row.photo_asset_id,
                usingThisImage: using,
                keptEarlier,
              };
            }),
        );
      } catch (err) {
        setTeacherImages([]);
        onError(err instanceof Error ? err.message : 'Could not load teachers');
      }
      setSheetOpen(true);
    })();
  };

  const pick = async (fromCamera: boolean) => {
    if (!teacher) {
      onError('Sign in to attach a class photo.');
      return;
    }
    if (webCameraNeeded(fromCamera)) {
      setSheetOpen(false);
      setCameraOpen(true);
      return;
    }
    setBusy(true);
    onError(null);
    try {
      if (Platform.OS !== 'web') setSheetOpen(false);
      const result = await pickAndSetClassAvatar({
        teacherId: teacher.id,
        classId: klass.id,
        fromCamera,
      });
      setSheetOpen(false);
      if (result === 'camera-web') setCameraOpen(true);
      else if (result === 'set') await refresh();
    } catch (err) {
      setSheetOpen(false);
      onError(err instanceof Error ? err.message : 'Could not save the class avatar');
    } finally {
      setBusy(false);
    }
  };

  const applyUri = async (uri: string, mimeType: string) => {
    if (!teacher) {
      onError('Sign in to attach a class photo.');
      return;
    }
    setBusy(true);
    onError(null);
    try {
      await uploadClassAvatar({
        teacherId: teacher.id,
        classId: klass.id,
        uri,
        mimeType,
      });
      await refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save the class avatar');
    } finally {
      setBusy(false);
    }
  };

  const applyTeacherImage = async (teacherId: string) => {
    if (!teacher) {
      onError('Sign in to attach a class photo.');
      return;
    }
    const option = teacherImages?.find((row) => row.id === teacherId);
    if (!option?.photoAssetId) return;
    if (option.usingThisImage && !option.keptEarlier) return;

    setBusy(true);
    onError(null);
    try {
      await snapshotClassAvatarFromTeacher({
        officeUserId: teacher.id,
        classId: klass.id,
        teacherId,
        sourcePhotoAssetId: option.photoAssetId,
      });
      await refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save the class avatar');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setSheetOpen(false);
    setBusy(true);
    onError(null);
    try {
      await setClassAvatar(klass.id, null);
      onChange({ ...klass, avatar_asset_id: null, avatarUrl: null });
      chrome.refreshChrome();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not remove the class avatar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ListRow
        title="Class avatar"
        status={busy ? 'Saving…' : hasPhoto ? (quiet ? undefined : 'Shown next to the class name') : 'None yet'}
        avatarName={klass.name}
        photoUrl={klass.avatarUrl}
        hasPhoto={hasPhoto}
        onPress={openSheet}
      />
      <PhotoSheet
        visible={sheetOpen}
        title="Class avatar"
        hasPhoto={hasPhoto}
        teacherImages={quiet ? teacherImages : undefined}
        onTake={() => void pick(true)}
        onLibrary={() => void pick(false)}
        onTeacherImage={quiet ? (id) => void applyTeacherImage(id) : undefined}
        onRemove={hasPhoto ? () => void clear() : undefined}
        onCancel={() => setSheetOpen(false)}
      />
      {cameraOpen ? (
        <WebCameraCapture
          onCapture={(uri, mime) => {
            setCameraOpen(false);
            void applyUri(uri, mime);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      ) : null}
    </>
  );
}
