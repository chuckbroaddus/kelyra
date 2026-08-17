import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppearanceControl } from '@/components/ui/AppearanceControl';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { loadParentProgress } from '@/lib/parents/api';
import {
  clearProfilePhoto,
  pickAndSetProfilePhoto,
  signedProfileUrl,
  signedProfileUrlForAssetId,
  uploadProfilePhoto,
} from '@/lib/people/photos';
import { clearStudentSession } from '@/lib/student-session/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { session, teacher, refreshTeacher, signOut } = useAuth();
  const chrome = useChrome();
  const router = useRouter();
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [parentPhoto, setParentPhoto] = useState<string | null>(null);
  const [teacherPhoto, setTeacherPhoto] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chrome.studentSession?.photoPath) {
      setStudentPhoto(null);
      return;
    }
    void signedProfileUrl(chrome.studentSession.photoPath).then(setStudentPhoto);
  }, [chrome.studentSession?.photoPath]);

  useEffect(() => {
    const token = chrome.parentTokens[0]?.token;
    if (!token) {
      setParentPhoto(null);
      return;
    }
    void loadParentProgress(token)
      .then((progress) => setParentPhoto(progress?.parentPhotoUrl ?? null))
      .catch(() => setParentPhoto(null));
  }, [chrome.parentTokens]);

  useEffect(() => {
    if (!teacher?.photo_asset_id) {
      setTeacherPhoto(null);
      return;
    }
    void signedProfileUrlForAssetId(teacher.photo_asset_id).then(setTeacherPhoto);
  }, [teacher?.photo_asset_id]);

  useEffect(() => {
    if (chrome.role === 'none') {
      router.replace(chrome.studentSession ? '/todo' : '/');
    }
  }, [chrome.role, chrome.studentSession, router]);

  if (chrome.role === 'student' && chrome.studentSession) {
    return (
      <Screen centered maxWidth={480}>
        <View style={styles.hero}>
          <Avatar name={chrome.studentSession.displayName} photoUrl={studentPhoto} size={72} />
          <MarqueeText
            text={chrome.studentSession.displayName}
            align="center"
            accessible
            fadeColor={colors.bg}
            style={[styles.name, { color: colors.ink }]}
          />
          <Text style={[styles.meta, { color: colors.mute }]}>{chrome.studentSession.className}</Text>
        </View>
        <GhostButton
          label="Leave class"
          onPress={() => {
            void clearStudentSession().then(() => router.replace('/join'));
          }}
        />
      </Screen>
    );
  }

  if (chrome.role === 'parent') {
    return (
      <Screen centered maxWidth={480}>
        <View style={styles.hero}>
          <Avatar name={chrome.parentTokens[0]?.displayName ?? 'Parent'} photoUrl={parentPhoto} size={72} />
          <MarqueeText
            text="Parent"
            align="center"
            accessible
            fadeColor={colors.bg}
            style={[styles.name, { color: colors.ink }]}
          />
        </View>
        {chrome.parentTokens.map((child) => (
          <ListRow
            key={child.token}
            title={`Child · ${child.displayName}`}
            status={child.className}
            avatarName={child.displayName}
            onPress={() => router.replace(`/parent?t=${child.token}`)}
          />
        ))}
      </Screen>
    );
  }

  const email = session?.user.email ?? teacher?.email ?? '';
  const name = teacher?.display_name?.trim() || email || 'Teacher';

  const onPickPhoto = async (fromCamera: boolean) => {
    if (!teacher) return;
    setPhotoOpen(false);
    setPhotoBusy(true);
    setError(null);
    try {
      const result = await pickAndSetProfilePhoto({
        teacherId: teacher.id,
        kind: 'teacher',
        personId: teacher.id,
        fromCamera,
      });
      if (result === 'camera-web') setCameraOpen(true);
      else if (result === 'set') await refreshTeacher();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const onWebCapture = async (uri: string, mimeType: string) => {
    if (!teacher) return;
    setCameraOpen(false);
    setPhotoBusy(true);
    setError(null);
    try {
      await uploadProfilePhoto({
        teacherId: teacher.id,
        kind: 'teacher',
        personId: teacher.id,
        uri,
        mimeType,
      });
      await refreshTeacher();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Screen centered maxWidth={480}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Change photo, ${name}`}
        onPress={photoBusy ? undefined : () => setPhotoOpen(true)}
        style={styles.hero}
      >
        {({ pressed }) => (
          <>
        <Avatar name={name} photoUrl={teacherPhoto} size={72} />
        <MarqueeText
          text={name}
          align="center"
          paused={pressed}
          fadeColor={colors.bg}
          style={[styles.name, { color: colors.ink }]}
        />
        {email && email !== name ? (
          <Text style={[styles.meta, { color: colors.mute }]}>{email}</Text>
        ) : null}
        {photoBusy ? <WorkingLine text="Working…" /> : (
          <Text style={[styles.meta, { color: colors.mute }]}>Tap the circle to change your photo</Text>
        )}
          </>
        )}
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {chrome.className ? (
        <ListRow
          title={`Active class · ${chrome.className}`}
          onPress={() => router.push(chrome.classId ? `/class/${chrome.classId}` : '/')}
        />
      ) : null}
      <Text style={[styles.section, { color: colors.mute }]}>Appearance</Text>
      <AppearanceControl />
      <GhostButton
        tone="danger"
        label="Sign out"
        onPress={() => {
          void signOut().then(() => router.replace('/'));
        }}
      />
      <PhotoSheet
        visible={photoOpen}
        hasPhoto={Boolean(teacher?.photo_asset_id)}
        onTake={() => void onPickPhoto(true)}
        onLibrary={() => void onPickPhoto(false)}
        onRemove={() => {
          setPhotoOpen(false);
          setRemoveOpen(true);
        }}
        onCancel={() => setPhotoOpen(false)}
      />
      <ConfirmSheet
        visible={removeOpen}
        title="Remove this photo?"
        body="Your account stays. The circle goes back to initials."
        confirmLabel="Remove photo"
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => {
          if (!teacher) return;
          setRemoveOpen(false);
          setPhotoBusy(true);
          void clearProfilePhoto('teacher', teacher.id)
            .then(() => refreshTeacher())
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not remove photo'))
            .finally(() => setPhotoBusy(false));
        }}
      />
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <WebCameraCapture onCapture={(uri, mime) => void onWebCapture(uri, mime)} onCancel={() => setCameraOpen(false)} />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  name: {
    ...type.title,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  meta: {
    ...type.meta,
    textAlign: 'center',
  },
  error: {
    ...type.meta,
    textAlign: 'center',
    marginBottom: 12,
  },
  section: {
    ...type.section,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 16,
  },
});
