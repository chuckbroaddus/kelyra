import { useState } from 'react';
import { Platform } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { getClass } from '@/lib/classes/api';
import {
  pickAndSetClassAvatar,
  setClassAvatar,
  uploadClassAvatar,
} from '@/lib/classes/avatar';
import { webCameraNeeded } from '@/lib/media/pickPhoto';
import type { ClassRow } from '@/lib/supabase/types';

type Props = {
  klass: ClassRow;
  onChange: (next: ClassRow) => void;
  onError: (message: string | null) => void;
};

export function ClassAvatarRow({ klass, onChange, onError }: Props) {
  const { teacher } = useAuth();
  const chrome = useChrome();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasPhoto = Boolean(klass.avatar_asset_id || klass.avatarUrl);

  const refresh = async () => {
    const fresh = await getClass(klass.id);
    onChange(fresh);
    chrome.refreshChrome();
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
      const uploaded = await uploadClassAvatar({
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
        status={busy ? 'Saving…' : hasPhoto ? 'Shown next to the class name' : 'None yet'}
        avatarName={klass.name}
        photoUrl={klass.avatarUrl}
        hasPhoto={hasPhoto}
        onPress={() => setSheetOpen(true)}
      />
      <PhotoSheet
        visible={sheetOpen}
        title="Class avatar"
        hasPhoto={hasPhoto}
        onTake={() => void pick(true)}
        onLibrary={() => void pick(false)}
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
