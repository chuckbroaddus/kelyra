import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { WebCameraCapture } from '@/components/WebCameraCapture';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarTray } from '@/components/ui/AvatarTray';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { FormSheet } from '@/components/ui/FormSheet';
import { DetailsRows } from '@/components/ui/DetailsRows';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { firstName, formatWhen } from '@/lib/format';
import {
  createParentInvite,
  getParent,
  linkChild,
  listChildrenForParent,
  listInvitesForParent,
  parentInviteUrl,
  parentStatusLine,
  patchParentMetadata,
  renameParent,
  updateParentMetadata,
  type ClassParent,
} from '@/lib/parents/api';
import { deleteParent, revokeInvite, unlinkChild } from '@/lib/parents/delete';
import { PARENT_DETAIL_FIELDS, metaString, relationshipLabel, setMetaKey } from '@/lib/people/metadata';
import {
  clearProfilePhoto,
  pickAndSetProfilePhoto,
  signedProfileUrlForAssetId,
  uploadProfilePhoto,
} from '@/lib/people/photos';
import { listRoster, type RosterStudent } from '@/lib/students/api';
import type { ParentAccessRow, ParentRow, StudentRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type ConfirmKind =
  | { kind: 'delete' }
  | { kind: 'unlink'; student: StudentRow & { photoUrl: string | null } }
  | { kind: 'revoke'; access: ParentAccessRow }
  | { kind: 'remove-photo' }
  | { kind: 'clear'; key: string; label: string }
  | { kind: 'link'; student: RosterStudent };

export default function ParentPage() {
  const { colors, scheme } = useTheme();
  const chrome = useChrome();
  const router = useRouter();
  const { teacher } = useAuth();
  const { id: classId, parentId } = useLocalSearchParams<{ id: string; parentId: string }>();
  const [parent, setParent] = useState<ParentRow | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [children, setChildren] = useState<Array<StudentRow & { photoUrl: string | null }>>([]);
  const [invites, setInvites] = useState<ParentAccessRow[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [childFilter, setChildFilter] = useState('');
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!parentId || !classId) return;
    const next = await getParent(parentId);
    setParent(next);
    setPhotoUrl(await signedProfileUrlForAssetId(next.photo_asset_id));
    setChildren(await listChildrenForParent(parentId));
    setInvites(await listInvitesForParent(parentId));
    setRoster(await listRoster(classId));
  }, [parentId, classId]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load parent');
      });
    }, [load]),
  );

  useEffect(() => {
    chrome.setPushedTitle(parent?.display_name ?? 'Parent');
    return () => chrome.setPushedTitle(null);
  }, [chrome, parent?.display_name]);

  const summary: ClassParent | null = parent
    ? {
        ...parent,
        photoUrl,
        children: children.map((child) => ({
          id: child.id,
          display_name: child.display_name,
          photoUrl: child.photoUrl,
        })),
        inviteCount: invites.length,
      }
    : null;

  const openEdit = () => {
    if (!parent) return;
    setDraftName(parent.display_name);
    const next: Record<string, string> = {};
    for (const field of PARENT_DETAIL_FIELDS) {
      next[field.key] = metaString(parent.metadata, field.key) ?? '';
    }
    next.relationship_other = metaString(parent.metadata, 'relationship_other') ?? '';
    setDraft(next);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!parent) return;
    setBusy(true);
    try {
      await renameParent(parent.id, draftName);
      let metadata = { ...parent.metadata };
      for (const field of PARENT_DETAIL_FIELDS) {
        metadata = setMetaKey(metadata, field.key, draft[field.key] ?? '');
      }
      metadata = setMetaKey(metadata, 'relationship_other', draft.relationship === 'other' ? draft.relationship_other : '');
      await updateParentMetadata(parent.id, metadata);
      setEditOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const onPickPhoto = async (fromCamera: boolean) => {
    if (!teacher || !parent) return;
    setPhotoOpen(false);
    setPhotoBusy(true);
    try {
      const result = await pickAndSetProfilePhoto({
        teacherId: teacher.id,
        kind: 'parent',
        personId: parent.id,
        fromCamera,
      });
      if (result === 'camera-web') setCameraOpen(true);
      else if (result === 'set') await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not set photo';
      setError(message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const onWebCapture = async (uri: string, mimeType: string) => {
    if (!teacher || !parent) return;
    setCameraOpen(false);
    setPhotoBusy(true);
    try {
      await uploadProfilePhoto({
        teacherId: teacher.id,
        kind: 'parent',
        personId: parent.id,
        uri,
        mimeType,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!parent || !confirm) return;
    setBusy(true);
    setError(null);
    try {
      if (confirm.kind === 'delete') {
        await deleteParent(parent.id);
        setConfirm(null);
        router.replace(`/class/${classId}/parents`);
        return;
      }
      if (confirm.kind === 'unlink') await unlinkChild(parent.id, confirm.student.id);
      if (confirm.kind === 'revoke') await revokeInvite(confirm.access.id);
      if (confirm.kind === 'remove-photo') await clearProfilePhoto('parent', parent.id);
      if (confirm.kind === 'clear') await patchParentMetadata(parent, confirm.key, null);
      if (confirm.kind === 'link') {
        await linkChild(parent.id, confirm.student.id);
        setPickerOpen(false);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish that');
    } finally {
      setBusy(false);
    }
  };

  const onCreateInvite = async () => {
    if (!parent) return;
    try {
      const token = await createParentInvite(parent.id, children[0]?.id);
      setCopied(parentInviteUrl(token));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite');
    }
  };

  if (!parent) {
    return (
      <Screen>
        {error ? (
          <Text style={[type.meta, { color: colors.danger }]}>{error}</Text>
        ) : (
          <WorkingLine />
        )}
      </Screen>
    );
  }

  const openPhotoSheet = () => {
    if (photoOpen) {
      setPhotoOpen(false);
      setTimeout(() => setPhotoOpen(true), 50);
      return;
    }
    setPhotoOpen(true);
  };

  const details = PARENT_DETAIL_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value:
      field.key === 'relationship'
        ? relationshipLabel(parent.metadata)
        : metaString(parent.metadata, field.key),
  }));

  const unlinkedRoster = roster.filter((student) => !children.some((child) => child.id === student.id));
  const childNeedle = childFilter.trim().toLowerCase();
  const visibleUnlinked = childNeedle
    ? unlinkedRoster.filter((student) => student.display_name.toLowerCase().includes(childNeedle))
    : unlinkedRoster;

  return (
    <Screen keyboard maxWidth={640}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Change photo, ${parent.display_name}`}
        onPress={photoBusy ? undefined : openPhotoSheet}
        style={styles.hero}
      >
        {({ pressed }) => (
          <>
        <Avatar name={parent.display_name} photoUrl={photoUrl} size={72} />
        <View style={styles.heroText}>
          <MarqueeText
            text={parent.display_name}
            align="start"
            paused={pressed}
            fadeColor={colors.bg}
            style={[styles.name, { color: colors.ink }]}
          />
          {photoBusy ? (
            <WorkingLine text="Working…" />
          ) : (
            <Text style={[type.meta, { color: colors.mute }]}>
              {summary ? parentStatusLine(summary) : ''}
            </Text>
          )}
        </View>
          </>
        )}
      </Pressable>

      <SectionHeader label="Details" first />
      <DetailsRows
        rows={details}
        onPress={openEdit}
        onClear={(row) => setConfirm({ kind: 'clear', key: row.key, label: row.label })}
      />

      <View style={styles.pills}>
        <GhostButton align="left" label="Edit" onPress={openEdit} />
        <GhostButton align="left" label="Photo" disabled={photoBusy} onPress={openPhotoSheet} />
        <GhostButton
          align="left"
          label="Add child"
          onPress={() => {
            setChildFilter('');
            setPickerOpen(true);
          }}
        />
        <GhostButton align="left" label={`Delete ${firstName(parent.display_name)}`} onPress={() => setConfirm({ kind: 'delete' })} />
      </View>

      <SectionHeader label="Children" />
      {children.length ? (
        <AvatarTray
          people={children.map((child) => ({
            id: child.id,
            name: child.display_name,
            photoUrl: child.photoUrl,
          }))}
          onPress={(person) => router.push(`/class/${classId}/student/${person.id}`)}
        />
      ) : (
        <Text style={[type.meta, { color: colors.mute }]}>No children linked yet.</Text>
      )}
      {children.map((child) => (
        <ListRow
          key={child.id}
          title={child.display_name}
          photoUrl={child.photoUrl}
          onPress={() => router.push(`/class/${classId}/student/${child.id}`)}
          trailing={[
            {
              key: 'unlink',
              label: 'Unlink',
              tone: 'wash',
              autoCommit: false,
              onPress: () => setConfirm({ kind: 'unlink', student: child }),
            },
          ]}
        />
      ))}
      <GhostButton
        align="left"
        label="Add a child"
        onPress={() => {
          setChildFilter('');
          setPickerOpen(true);
        }}
      />

      <SectionHeader label="Invite" />
      {invites.map((access) => (
        <ListRow
          key={access.id}
          title={`Created ${formatWhen(access.created_at)}`}
          status={access.accepted_at ? 'Opened' : 'Active'}
          chevron={false}
          trailing={[
            {
              key: 'revoke',
              label: 'Revoke',
              tone: 'danger',
              autoCommit: false,
              onPress: () => setConfirm({ kind: 'revoke', access }),
            },
          ]}
        />
      ))}
      <GhostButton align="left" label="Create invite link" onPress={() => void onCreateInvite()} />
      {copied ? (
        <Text selectable style={[type.meta, { color: colors.ink }]}>
          {copied}
        </Text>
      ) : null}

      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <PhotoSheet
        visible={photoOpen}
        hasPhoto={Boolean(parent.photo_asset_id)}
        onTake={() => void onPickPhoto(true)}
        onLibrary={() => void onPickPhoto(false)}
        onRemove={() => {
          setPhotoOpen(false);
          setConfirm({ kind: 'remove-photo' });
        }}
        onCancel={() => setPhotoOpen(false)}
      />

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <WebCameraCapture onCapture={(uri, mime) => void onWebCapture(uri, mime)} onCancel={() => setCameraOpen(false)} />
      </Modal>

      <FormSheet visible={editOpen} title="Edit" onClose={() => setEditOpen(false)}>
            <TextField label="Name" value={draftName} onChangeText={setDraftName} />
            <Text style={[type.meta, { color: colors.mute }]}>Relationship</Text>
            <ChipRow>
              {(['mother', 'father', 'guardian', 'other'] as const).map((rel) => (
                <Chip
                  key={rel}
                  label={rel === 'mother' ? 'Mother' : rel === 'father' ? 'Father' : rel === 'guardian' ? 'Guardian' : 'Other'}
                  selected={draft.relationship === rel}
                  onPress={() => setDraft((current) => ({ ...current, relationship: rel }))}
                />
              ))}
            </ChipRow>
            {draft.relationship === 'other' ? (
              <TextField
                label="Relationship"
                value={draft.relationship_other ?? ''}
                onChangeText={(value) => setDraft((current) => ({ ...current, relationship_other: value }))}
              />
            ) : null}
            <TextField
              label="Phone"
              keyboardType="phone-pad"
              value={draft.phone ?? ''}
              onChangeText={(value) => setDraft((current) => ({ ...current, phone: value }))}
            />
            <TextField
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={draft.email ?? ''}
              onChangeText={(value) => setDraft((current) => ({ ...current, email: value }))}
            />
            <TextField
              label="Address"
              multiline
              value={draft.address ?? ''}
              onChangeText={(value) => setDraft((current) => ({ ...current, address: value }))}
            />
            <Text style={[type.meta, { color: colors.mute }]}>Preferred contact</Text>
            <ChipRow>
              {(['call', 'text', 'email'] as const).map((pref) => (
                <Chip
                  key={pref}
                  label={pref === 'call' ? 'Call' : pref === 'text' ? 'Text' : 'Email'}
                  selected={draft.preferred_contact === pref}
                  onPress={() => setDraft((current) => ({ ...current, preferred_contact: pref }))}
                />
              ))}
            </ChipRow>
            <TextField
              label="Notes"
              multiline
              value={draft.notes ?? ''}
              onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))}
            />
            <Text style={[type.meta, { color: colors.mute }]}>Only you will see this.</Text>
            <PrimaryButton label={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={() => void saveEdit()} />
      </FormSheet>

      <FormSheet visible={pickerOpen} title="Add a child" onClose={() => setPickerOpen(false)}>
            {unlinkedRoster.length > 8 ? (
              <TextField placeholder="Find a student" value={childFilter} onChangeText={setChildFilter} />
            ) : null}
            {visibleUnlinked.map((student) => (
              <ListRow
                key={student.id}
                title={student.display_name}
                photoUrl={student.photoUrl}
                onPress={() => {
                  setPickerOpen(false);
                  setConfirm({ kind: 'link', student });
                }}
              />
            ))}
            {unlinkedRoster.length === 0 ? (
              <Text style={[type.meta, { color: colors.mute }]}>Every student in this class is already linked.</Text>
            ) : unlinkedRoster.length > 8 && visibleUnlinked.length === 0 ? (
              <Text style={[type.meta, { color: colors.mute }]}>No names match that search.</Text>
            ) : null}
      </FormSheet>

      <ConfirmSheet
        visible={Boolean(confirm)}
        title={confirmTitle(confirm, parent.display_name)}
        body={confirmBody(confirm, parent.display_name)}
        confirmLabel={confirmLabel(confirm, parent.display_name)}
        typeName={confirm?.kind === 'delete' ? parent.display_name : undefined}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void onConfirm()}
      />
    </Screen>
  );
}

function confirmTitle(confirm: ConfirmKind | null, parentName: string): string {
  if (!confirm) return '';
  if (confirm.kind === 'delete') return `Delete ${parentName}?`;
  if (confirm.kind === 'unlink') return `Unlink ${firstName(confirm.student.display_name)} from ${parentName}?`;
  if (confirm.kind === 'revoke') return 'Revoke this invite link?';
  if (confirm.kind === 'remove-photo') return 'Remove this photo?';
  if (confirm.kind === 'clear') return `Clear ${confirm.label}?`;
  return `Link ${firstName(confirm.student.display_name)} to ${parentName}?`;
}

function confirmBody(confirm: ConfirmKind | null, parentName: string): string {
  if (!confirm) return '';
  if (confirm.kind === 'delete') return 'Their invite links die. Students stay. This cannot be undone.';
  if (confirm.kind === 'unlink') {
    return `They will not see ${firstName(confirm.student.display_name)}’s note. This does not delete anyone. This cannot be undone.`;
  }
  if (confirm.kind === 'revoke') return 'Anyone with the link will lose access. This cannot be undone.';
  if (confirm.kind === 'remove-photo') return `${parentName} stays. This cannot be undone.`;
  if (confirm.kind === 'clear') return 'This cannot be undone.';
  return `They will see ${firstName(confirm.student.display_name)}’s note home. This cannot be undone.`;
}

function confirmLabel(confirm: ConfirmKind | null, parentName: string): string {
  if (!confirm) return 'Delete';
  if (confirm.kind === 'delete') return `Delete ${firstName(parentName)}`;
  if (confirm.kind === 'unlink') return 'Unlink';
  if (confirm.kind === 'revoke') return 'Revoke';
  if (confirm.kind === 'remove-photo') return 'Remove photo';
  if (confirm.kind === 'clear') return 'Clear';
  return 'Link';
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    ...type.title,
    width: '100%',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  error: {
    ...type.body,
    marginTop: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
