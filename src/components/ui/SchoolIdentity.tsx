import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { ListRow } from '@/components/ui/ListRow';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { TextField } from '@/components/ui/TextField';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { pickNormalizedPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { uploadFramedSchoolLogo } from '@/lib/school/frameLogo';
import { DEFAULT_MONTHLY_CAP_USD, formatUsd } from '@/lib/ai/policy';
import { getSchoolIdentity, setSchoolAiCap, setSchoolLogo, setSchoolName, type SchoolIdentity } from '@/lib/school/identity';

type Props = {
  identity: SchoolIdentity | null;
  onChange: (next: SchoolIdentity) => void;
  onError: (message: string | null) => void;
};

export function SchoolIdentityFields({ identity, onChange, onError }: Props) {
  const { teacher } = useAuth();
  const chrome = useChrome();
  const [name, setName] = useState(identity?.name ?? '');
  const [cap, setCap] = useState(String(identity?.aiMonthlyCapUsd ?? DEFAULT_MONTHLY_CAP_USD));
  const [saving, setSaving] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (identity?.name) setName(identity.name);
  }, [identity?.name]);

  const saveCap = async () => {
    const usd = Number(cap);
    if (!Number.isFinite(usd) || usd < 0) {
      onError('Need a monthly AI budget of 0 or more.');
      return;
    }
    setSaving(true);
    onError(null);
    try {
      await setSchoolAiCap(usd);
      const fresh = await getSchoolIdentity();
      if (fresh) onChange(fresh);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save the AI budget');
    } finally {
      setSaving(false);
    }
  };

  const saveName = async () => {
    const next = name.trim();
    if (!next) {
      onError('Need a school name.');
      return;
    }
    if (next === identity?.name) return;
    setSaving(true);
    onError(null);
    try {
      const saved = await setSchoolName(next);
      const fresh = (await getSchoolIdentity()) ?? {
        id: identity?.id ?? '',
        name: saved,
        logoAssetId: identity?.logoAssetId ?? null,
        logoUrl: identity?.logoUrl ?? null,
        aiMonthlyCapUsd: identity?.aiMonthlyCapUsd ?? DEFAULT_MONTHLY_CAP_USD,
        aiSpendUsd: identity?.aiSpendUsd ?? 0,
      };
      onChange(fresh);
      chrome.refreshChrome();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save the school name');
    } finally {
      setSaving(false);
    }
  };

  const applyLogo = useCallback(
    async (uri: string, mimeType: string) => {
      if (!teacher) {
        onError('Sign in to attach a logo.');
        return;
      }
      setSaving(true);
      setCutting(true);
      onError(null);
      try {
        const asset = await uploadFramedSchoolLogo({
          teacherId: teacher.id,
          uri,
          mimeType,
        });
        await setSchoolLogo(asset.id);
        const fresh = await getSchoolIdentity();
        if (fresh) onChange(fresh);
        chrome.refreshChrome();
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Could not save the school logo');
      } finally {
        setSaving(false);
        setCutting(false);
      }
    },
    [chrome, onChange, onError, teacher],
  );

  const pickLogo = async (fromCamera: boolean) => {
    if (webCameraNeeded(fromCamera)) {
      setSheetOpen(false);
      setCameraOpen(true);
      return;
    }
    try {
      if (Platform.OS !== 'web') {
        setSheetOpen(false);
        await waitForModalDismiss();
      }
      const photo = await pickNormalizedPhoto(fromCamera);
      setSheetOpen(false);
      if (photo) await applyLogo(photo.uri, photo.mimeType);
    } catch (err) {
      setSheetOpen(false);
      onError(err instanceof Error ? err.message : 'Could not pick a logo');
    }
  };

  const clearLogo = async () => {
    setSheetOpen(false);
    setSaving(true);
    onError(null);
    try {
      await setSchoolLogo(null);
      const fresh = await getSchoolIdentity();
      if (fresh) onChange(fresh);
      chrome.refreshChrome();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not remove the logo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TextField
        label="School name"
        placeholder="School name"
        value={name}
        onChangeText={setName}
        returnKeyType="done"
        onSubmitEditing={() => void saveName()}
      />
      <View style={styles.gap} />
      <PrimaryButton
        label={saving ? 'Saving…' : 'Save name'}
        disabled={saving || name.trim() === (identity?.name ?? '')}
        onPress={() => void saveName()}
      />
      <View style={styles.gap} />
      <TextField
        label="Monthly AI budget (USD)"
        placeholder="50"
        value={cap}
        keyboardType="decimal-pad"
        onChangeText={setCap}
        returnKeyType="done"
        onSubmitEditing={() => void saveCap()}
      />
      <ListRow
        title="AI this month"
        status={`${formatUsd(identity?.aiSpendUsd ?? 0) || '$0'} of ${formatUsd(identity?.aiMonthlyCapUsd ?? DEFAULT_MONTHLY_CAP_USD) || '$50'}`}
      />
      <PrimaryButton
        label={saving ? 'Saving…' : 'Save AI budget'}
        disabled={saving}
        onPress={() => void saveCap()}
      />
      <ListRow
        title="School logo"
        status={
          cutting
            ? 'Cutting out the background…'
            : identity?.logoUrl
              ? 'Shown next to the name in the header'
              : 'None yet'
        }
        icon={identity?.logoUrl ? undefined : 'photo'}
        avatar={
          identity?.logoUrl ? (
            <RemoteImage
              uri={identity.logoUrl}
              accessibilityLabel="School logo"
              contentFit="contain"
              style={styles.preview}
            />
          ) : undefined
        }
        onPress={() => setSheetOpen(true)}
      />
      <PhotoSheet
        visible={sheetOpen}
        title="School logo"
        hasPhoto={Boolean(identity?.logoUrl)}
        onTake={() => void pickLogo(true)}
        onLibrary={() => void pickLogo(false)}
        onRemove={identity?.logoUrl ? () => void clearLogo() : undefined}
        onCancel={() => setSheetOpen(false)}
      />
      {cameraOpen ? (
        <WebCameraCapture
          onCapture={(uri, mime) => {
            setCameraOpen(false);
            void applyLogo(uri, mime);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  gap: { height: 10 },
  preview: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
});
