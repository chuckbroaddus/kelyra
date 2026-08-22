import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { HandleLink } from '@/components/ui/HandleLink';
import { ProfileDetails } from '@/components/ui/ProfileDetails';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getProfile, setAlsoHat, setAlsoParent as saveAlsoParent } from '@/lib/school/api';
import {
  canAlsoBeAdministrator,
  canAlsoBeTeacher,
  canEditProfile,
  formatHandle,
  isAdminRole,
  isAlsoParent,
  isStaffRole,
  roleStatus,
} from '@/lib/school/roles';
import { listStudentEnrollments } from '@/lib/students/delete';
import { listChildrenForParent, loadParentProgress } from '@/lib/parents/api';
import { listClasses, listSchoolClasses } from '@/lib/classes/api';
import {
  clearProfilePhoto,
  photoUrlsForProfiles,
  pickAndSetProfilePhoto,
  signedProfileUrlForAssetId,
  uploadProfilePhoto,
} from '@/lib/people/photos';
import type { ClassRow, ProfileRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

const STAFF_TABS = [
  { key: 'classes', label: 'Classes', icon: 'classes' as const },
  { key: 'role', label: 'Role', icon: 'person' as const },
  { key: 'children', label: 'Children', icon: 'children' as const },
  { key: 'details', label: 'Details', icon: 'details' as const },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { session, teacher, profile, refresh, refreshTeacher, signOut } = useAuth();
  const { person } = useLocalSearchParams<{ person?: string }>();
  const chrome = useChrome();
  const router = useRouter();
  const [parentPhoto, setParentPhoto] = useState<string | null>(null);
  const [faceUrl, setFaceUrl] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ProfileRow | null>(null);
  const [tab, setTab] = useState('classes');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [children, setChildren] = useState<Array<{ id: string; display_name: string; photoUrl: string | null }>>(
    [],
  );
  const [hatBusy, setHatBusy] = useState(false);

  const targetId = typeof person === 'string' && person ? person : profile?.id ?? null;
  const mine = Boolean(profile && targetId === profile.id);
  const shown = mine ? profile : viewing;
  const editable = canEditProfile(profile, shown);
  const staffPerson = isStaffRole(shown);
  const office = isAdminRole(profile);
  const name = shown?.display_name?.trim() || teacher?.display_name?.trim() || shown?.username || 'Teacher';
  usePushedTitle(mine || !shown ? 'Profile' : name);

  useEffect(() => {
    setTab('classes');
  }, [shown?.id]);

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
    let live = true;
    void (async () => {
      if (shown) {
        const urls = await photoUrlsForProfiles([shown]);
        if (live) setFaceUrl(urls.get(shown.id) ?? null);
        return;
      }
      if (teacher?.photo_asset_id) {
        const url = await signedProfileUrlForAssetId(teacher.photo_asset_id);
        if (live) setFaceUrl(url);
        return;
      }
      if (live) setFaceUrl(parentPhoto);
    })();
    return () => {
      live = false;
    };
  }, [shown?.id, shown?.student_id, shown?.parent_id, teacher?.photo_asset_id, parentPhoto, photoBusy]);

  useEffect(() => {
    if (!shown) {
      setClasses([]);
      setChildren([]);
      return;
    }
    let live = true;
    void (async () => {
      try {
        const all = office ? await listSchoolClasses() : await listClasses();
        if (live) setClasses(all.filter((row) => row.teacher_id === shown.id));
      } catch {
        if (live) setClasses([]);
      }
      if (shown.parent_id) {
        try {
          const kids = await listChildrenForParent(shown.parent_id);
          if (live) setChildren(kids);
        } catch {
          if (live) setChildren([]);
        }
      } else if (live) {
        setChildren([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [shown?.id, shown?.parent_id, office]);

  useFocusEffect(
    useCallback(() => {
      if (!targetId || mine) {
        setViewing(null);
        return;
      }
      void getProfile(targetId)
        .then(setViewing)
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not load profile'));
    }, [targetId, mine]),
  );

  useEffect(() => {
    if (chrome.role === 'none') {
      router.replace('/');
    }
  }, [chrome.role, router]);

  useEffect(() => {
    if (!shown?.student_id || mine || !isStaffRole(profile)) return;
    let cancelled = false;
    void listStudentEnrollments(shown.student_id).then((rows) => {
      if (cancelled || !rows[0]) return;
      router.replace(`/class/${rows[0].class_id}/student/${shown.student_id}`);
    });
    return () => {
      cancelled = true;
    };
  }, [shown?.student_id, shown?.id, mine, profile, router]);

  if (chrome.role === 'parent' && !profile) {
    return (
      <Screen centered maxWidth={480}>
        <View style={styles.hero}>
          <Avatar name={chrome.parentTokens[0]?.displayName ?? 'Parent'} photoUrl={parentPhoto ?? faceUrl} size={72} />
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
            onPress={() => router.replace('/parent')}
          />
        ))}
      </Screen>
    );
  }

  const applyHat = async (work: () => Promise<unknown>) => {
    if (!shown) return;
    setHatBusy(true);
    setError(null);
    try {
      await work();
      const next = await getProfile(shown.id);
      setViewing(next);
      if (mine) await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update role');
    } finally {
      setHatBusy(false);
    }
  };

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
      else if (result === 'set') {
        await refreshTeacher();
        chrome.refreshChrome();
      }
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
      chrome.refreshChrome();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Screen keyboard maxWidth={560}>
      <View style={styles.hero}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editable ? `Change photo, ${name}` : name}
          onPress={photoBusy || !editable ? undefined : () => setPhotoOpen(true)}
          style={styles.photoHit}
        >
          <Avatar name={name} photoUrl={faceUrl ?? parentPhoto} hasPhoto={Boolean(faceUrl || parentPhoto || teacher?.photo_asset_id)} size={72} />
        </Pressable>
        {shown?.username ? (
          <HandleLink
            username={shown.username}
            profileId={shown.id}
            center
            style={[styles.name, { color: colors.ink }]}
          />
        ) : null}
        {shown ? (
          <Text style={[styles.meta, { color: colors.mute }]}>{roleStatus(shown)}</Text>
        ) : null}
        {photoBusy ? <WorkingLine text="Working…" /> : editable ? (
          <Text style={[styles.meta, { color: colors.mute }]}>Tap the circle to change your photo</Text>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {shown && staffPerson ? <PersonTabs tabs={STAFF_TABS} value={tab} onChange={setTab} /> : null}
      {shown && (!staffPerson || tab === 'details') ? (
        <>
          <ProfileDetails
            profile={shown}
            canEdit={editable}
            onSaved={(next) => {
              setViewing(next);
              if (mine) void refresh();
            }}
          />
          {staffPerson && mine ? (
            <>
              <GhostButton align="left" label="Change password" onPress={() => router.push('/password')} />
              <GhostButton
                tone="danger"
                label="Sign out"
                onPress={() => {
                  void signOut().then(() => router.replace('/'));
                }}
              />
            </>
          ) : null}
        </>
      ) : null}
      {shown && staffPerson && tab === 'classes' ? (
        <>
          {classes.length === 0 ? (
            <Text style={[styles.meta, { color: colors.mute }]}>No classes yet.</Text>
          ) : null}
          {classes.map((klass) => (
            <ListRow
              key={klass.id}
              title={klass.name}
              status={chrome.classId === klass.id ? 'Active class' : undefined}
              onPress={() => router.push(`/class/${klass.id}`)}
            />
          ))}
        </>
      ) : null}
      {shown && staffPerson && tab === 'children' ? (
        <>
          {mine && isAlsoParent(shown) ? (
            <ListRow title="My children" status="Progress for your own kids" onPress={() => router.push('/parent')} />
          ) : null}
          {children.map((child) => (
            <ListRow
              key={child.id}
              title={child.display_name}
              photoUrl={child.photoUrl}
              avatarName={child.display_name}
              onPress={() => {
                const classId = chrome.classId ?? chrome.classes[0]?.id;
                if (classId) router.push(`/class/${classId}/student/${child.id}`);
              }}
            />
          ))}
          {children.length === 0 && !(mine && isAlsoParent(shown)) ? (
            <Text style={[styles.meta, { color: colors.mute }]}>Not linked as a parent.</Text>
          ) : null}
        </>
      ) : null}
      {shown && staffPerson && tab === 'role' ? (
        <>
          <Text style={[styles.meta, { color: colors.ink, textAlign: 'left' }]}>{roleStatus(shown)}</Text>
          {office ? (
            <>
              {canAlsoBeAdministrator(shown.role) ? (
                <GhostButton
                  align="left"
                  disabled={hatBusy}
                  label={shown.also_administrator ? 'Not an administrator' : 'Also an administrator'}
                  onPress={() =>
                    void applyHat(() => setAlsoHat(shown.id, 'administrator', !shown.also_administrator))
                  }
                />
              ) : null}
              {canAlsoBeTeacher(shown.role) ? (
                <GhostButton
                  align="left"
                  disabled={hatBusy}
                  label={shown.also_teacher ? 'Not a teacher' : 'Also a teacher'}
                  onPress={() => void applyHat(() => setAlsoHat(shown.id, 'teacher', !shown.also_teacher))}
                />
              ) : null}
              <GhostButton
                align="left"
                disabled={hatBusy}
                label={isAlsoParent(shown) ? 'Not a parent' : 'Also a parent'}
                onPress={() => void applyHat(() => saveAlsoParent(shown.id, !isAlsoParent(shown)))}
              />
            </>
          ) : null}
          {hatBusy ? <WorkingLine text="Updating role…" /> : null}
        </>
      ) : null}
      {shown && !staffPerson && mine && chrome.className ? (
        <ListRow
          title={`Active class · ${chrome.className}`}
          onPress={() => router.push(chrome.classId ? `/class/${chrome.classId}` : '/')}
        />
      ) : null}
      {shown && !staffPerson && mine && isAlsoParent(profile) ? (
        <ListRow title="My children" status="Progress for your own kids" onPress={() => router.push('/parent')} />
      ) : null}
      {shown && !staffPerson && mine ? (
        <GhostButton
          tone="danger"
          label="Sign out"
          onPress={() => {
            void signOut().then(() => router.replace('/'));
          }}
        />
      ) : null}
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
    alignSelf: 'stretch',
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  photoHit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...type.title,
    textAlign: 'center',
    width: '100%',
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
});
