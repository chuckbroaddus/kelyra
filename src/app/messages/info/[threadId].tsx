import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { WebCameraCapture } from '@/components/WebCameraCapture';
import { FormSheet } from '@/components/ui/FormSheet';
import { DangerButton, GhostButton, PrimaryButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { ThreadAvatar } from '@/components/ui/ThreadAvatar';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { pickGroupPhoto, signedMessageUrl } from '@/lib/messages/attachments';
import { webCameraNeeded } from '@/lib/media/pickPhoto';
import {
  addGroupMember,
  getThread,
  isThreadMuted,
  isThreadPinned,
  listMessageDirectory,
  listThreadMembers,
  removeGroupMember,
  replaceThreadPhoto,
  setThreadMuted,
  setThreadPhoto,
  setThreadPinned,
  setThreadTitle,
  type ThreadPerson,
} from '@/lib/messages/api';
import { attachProfilePhotos } from '@/lib/people/photos';
import { formatHandle, isAdminRole, isStaffRole, roleLabel } from '@/lib/school/roles';
import type { MessageThreadKind, ProfileRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ThreadInfoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { profile } = useAuth();
  const staff = isStaffRole(profile);
  const admin = isAdminRole(profile);
  const [kind, setKind] = useState<MessageThreadKind>('direct');
  const [title, setTitle] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [members, setMembers] = useState<ThreadPerson[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [muted, setMuted] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [candidates, setCandidates] = useState<Array<ProfileRow & { photoUrl: string | null }>>([]);
  const [pending, setPending] = useState<{ kind: 'leave' } | { kind: 'remove'; id: string; name: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const photoBusy = useRef(false);

  const others = members.filter((row) => row.id !== profile?.id);
  const faces = others.map((person) => ({
    name: person.display_name || person.username,
    photoUrl: person.photoUrl,
  }));
  const heading =
    kind === 'group'
      ? title.trim() || faces.map((face) => face.name.split(/\s+/)[0]).join(', ') || 'Group'
      : others[0]?.display_name || others[0]?.username || 'Message';

  const load = useCallback(async () => {
    if (!threadId || !profile || photoBusy.current) return;
    const [thread, nextMembers] = await Promise.all([getThread(threadId), listThreadMembers(threadId)]);
    if (photoBusy.current) return;
    setKind(thread.kind === 'group' ? 'group' : 'direct');
    setTitle(thread.title ?? '');
    setDraftTitle(thread.title ?? '');
    setMembers(nextMembers);
    setPhotoUrl(thread.photo_path ? await signedMessageUrl('photo', thread.photo_path) : null);
    setMuted(await isThreadMuted(threadId, profile.id));
    setPinned(await isThreadPinned(threadId, profile.id));
  }, [threadId, profile]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load'));
    }, [load]),
  );

  usePushedTitle(heading);

  const saveTitle = async () => {
    if (!threadId) return;
    setBusy(true);
    try {
      await setThreadTitle(threadId, draftTitle);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename');
    } finally {
      setBusy(false);
    }
  };

  const applyPhoto = async (uri: string, mimeType: string) => {
    if (!threadId || !profile) return;
    photoBusy.current = true;
    setBusy(true);
    setError(null);
    setPhotoUrl(uri);
    try {
      const next = await replaceThreadPhoto(threadId, profile.id, uri, mimeType);
      setPhotoUrl(next);
    } catch (err) {
      setPhotoUrl(null);
      setError(err instanceof Error ? err.message : 'Could not set photo');
    } finally {
      photoBusy.current = false;
      setBusy(false);
    }
  };

  const onPickPhoto = async (fromCamera: boolean) => {
    setPhotoOpen(false);
    if (fromCamera && webCameraNeeded(true)) {
      setCameraOpen(true);
      return;
    }
    photoBusy.current = true;
    try {
      const picked = await pickGroupPhoto(fromCamera);
      if (!picked) {
        photoBusy.current = false;
        return;
      }
      await applyPhoto(picked.uri, picked.mimeType);
    } catch (err) {
      photoBusy.current = false;
      setError(err instanceof Error ? err.message : 'Could not set photo');
    }
  };

  const openAdd = async () => {
    if (!threadId) return;
    try {
      const directory = await attachProfilePhotos(await listMessageDirectory());
      const have = new Set(members.map((row) => row.id));
      setCandidates(directory.filter((row) => !have.has(row.id)));
      setAddOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load people');
    }
  };

  return (
    <Screen keyboard maxWidth={640}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change group photo"
        onPress={() => setPhotoOpen(true)}
        style={styles.hero}
      >
        <ThreadAvatar name={heading} faces={faces} photoUrl={photoUrl} size={96} />
        {busy ? (
          <WorkingLine text="Saving photo…" />
        ) : (
          <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>
            {photoUrl ? 'Tap to change photo' : 'Tap to replace the automatic photo'}
          </Text>
        )}
      </Pressable>

      {kind === 'group' ? (
        <>
          <SectionHeader label="Name" first />
          <TextField value={draftTitle} onChangeText={setDraftTitle} placeholder="Group name" />
          <PrimaryButton label={busy ? 'Saving…' : 'Save name'} disabled={busy} onPress={() => void saveTitle()} />
        </>
      ) : null}

      <SectionHeader label="This chat" />
      <GhostButton
        align="left"
        label={pinned ? 'Remove from favorites' : 'Add to favorites'}
        onPress={() => {
          if (!threadId) return;
          void setThreadPinned(threadId, !pinned)
            .then(() => load())
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not update favorite'));
        }}
      />
      <GhostButton
        align="left"
        label={muted ? 'Unmute' : 'Mute'}
        onPress={() => {
          if (!threadId) return;
          void setThreadMuted(threadId, !muted)
            .then(() => load())
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not mute'));
        }}
      />
      {photoUrl ? (
        <GhostButton
          align="left"
          label="Use automatic photo"
          onPress={() => {
            if (!threadId) return;
            void setThreadPhoto(threadId, null)
              .then(() => load())
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not clear photo'));
          }}
        />
      ) : null}

      <SectionHeader label={kind === 'group' ? `People · ${members.length}` : 'People'} />
      {members.map((person) => (
        <ListRow
          key={person.id}
          title={person.display_name || formatHandle(person.username)}
          status={
            person.id === profile?.id
              ? 'You'
              : `${formatHandle(person.username)} · ${roleLabel(person.role)}`
          }
          avatarName={person.display_name || person.username}
          photoUrl={person.photoUrl}
          chevron={false}
          trailing={
            kind === 'group' && person.id !== profile?.id && admin
              ? [
                  {
                    key: 'remove',
                    label: 'Remove',
                    tone: 'danger',
                    autoCommit: false,
                    onPress: () =>
                      setPending({
                        kind: 'remove',
                        id: person.id,
                        name: person.display_name || person.username,
                      }),
                  },
                ]
              : []
          }
        />
      ))}
      {kind === 'group' && (staff || admin) && members.length < 12 ? (
        <GhostButton align="left" label="Add people" onPress={() => void openAdd()} />
      ) : null}
      {kind === 'group' ? (
        <DangerButton label="Leave group" onPress={() => setPending({ kind: 'leave' })} />
      ) : null}

      {members.length === 0 ? <WorkingLine /> : null}
      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}

      <PhotoSheet
        visible={photoOpen}
        title={kind === 'group' ? 'Group photo' : 'Photo'}
        hasPhoto={Boolean(photoUrl)}
        onTake={() => void onPickPhoto(true)}
        onLibrary={() => void onPickPhoto(false)}
        onRemove={
          photoUrl
            ? () => {
                setPhotoOpen(false);
                if (!threadId) return;
                void setThreadPhoto(threadId, null).then(() => load());
              }
            : undefined
        }
        onCancel={() => setPhotoOpen(false)}
      />
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <WebCameraCapture
          onCapture={(uri, mime) => {
            setCameraOpen(false);
            void applyPhoto(uri, mime);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      </Modal>
      <FormSheet visible={addOpen} title="Add to group" onClose={() => setAddOpen(false)}>
        {candidates.length === 0 ? (
          <Text style={[type.meta, { color: colors.mute }]}>Nobody else you may add.</Text>
        ) : null}
        {candidates.map((person) => (
          <ListRow
            key={person.id}
            title={person.display_name || formatHandle(person.username)}
            status={`${formatHandle(person.username)} · ${roleLabel(person.role)}`}
            photoUrl={person.photoUrl}
            avatarName={person.display_name || person.username}
            onPress={() => {
              if (!threadId) return;
              void addGroupMember(threadId, person.id)
                .then(() => {
                  setAddOpen(false);
                  return load();
                })
                .catch((err) => setError(err instanceof Error ? err.message : 'Could not add'));
            }}
          />
        ))}
      </FormSheet>
      <FormSheet
        visible={Boolean(pending)}
        title={pending?.kind === 'remove' ? `Remove ${pending.name}?` : 'Leave this group?'}
        onClose={() => setPending(null)}
      >
        <Text style={[type.body, { color: colors.mute }]}>
          {pending?.kind === 'remove' ? 'They can be added again later.' : 'You will stop seeing new messages here.'}
        </Text>
        <DangerButton
          label={pending?.kind === 'remove' ? 'Remove' : 'Leave'}
          onPress={() => {
            if (!threadId || !profile || !pending) return;
            void (async () => {
              try {
                if (pending.kind === 'leave') {
                  await removeGroupMember(threadId, profile.id);
                  setPending(null);
                  router.replace('/messages');
                  return;
                }
                await removeGroupMember(threadId, pending.id);
                setPending(null);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not update group');
              }
            })();
          }}
        />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginBottom: 16,
  },
});
