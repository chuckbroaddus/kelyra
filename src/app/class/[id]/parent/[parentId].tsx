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
import { PersonTabs } from '@/components/ui/PersonTabs';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { listClassesForChildren } from '@/lib/classes/api';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { firstName } from '@/lib/format';

import {
  getParent,
  linkChild,
  listChildrenForParent,
  parentStatusLine,
  patchParentMetadata,
  renameParent,
  updateParentMetadata,
  type ClassParent,
} from '@/lib/parents/api';
import { deleteParent, unlinkChild } from '@/lib/parents/delete';
import { PARENT_DETAIL_FIELDS, metaString, relationshipLabel, setMetaKey } from '@/lib/people/metadata';
import {
  clearProfilePhoto,
  pickAndSetProfilePhoto,
  signedProfileUrlForAssetId,
  uploadProfilePhoto,
} from '@/lib/people/photos';
import { listProfiles, setParentCardLink } from '@/lib/school/api';
import { formatHandle, isAdminRole, isOfficeRole } from '@/lib/school/roles';
import { listStudentsForLinking } from '@/lib/students/api';
import type { ParentRow, ProfileRow, StudentRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type LinkStudent = StudentRow & { photoUrl: string | null };

type ConfirmKind =
  | { kind: 'delete' }
  | { kind: 'unlink'; student: LinkStudent }
  | { kind: 'remove-photo' }
  | { kind: 'clear'; key: string; label: string }
  | { kind: 'link'; student: LinkStudent }
  | { kind: 'unlink-login'; login: ProfileRow };

const PARENT_TABS = [
  { key: 'classes', label: 'Classes', icon: 'classes' as const },
  { key: 'children', label: 'Children', icon: 'children' as const },
  { key: 'details', label: 'Details', icon: 'details' as const },
];

export default function ParentPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const { teacher, profile } = useAuth();
  const canLinkChildren = isOfficeRole(profile);
  const canAssignLogin = isAdminRole(profile) || Boolean(teacher);
  const { id: classId, parentId } = useLocalSearchParams<{ id: string; parentId: string }>();
  const [parent, setParent] = useState<ParentRow | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [children, setChildren] = useState<LinkStudent[]>([]);
  const [students, setStudents] = useState<LinkStudent[]>([]);
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
  const [draftName, setDraftName] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [login, setLogin] = useState<ProfileRow | null>(null);
  const [loginChoices, setLoginChoices] = useState<ProfileRow[]>([]);
  const [tab, setTab] = useState('classes');
  const [childClasses, setChildClasses] = useState<Array<{ id: string; name: string; childNames: string[] }>>(
    [],
  );

  useEffect(() => {
    setTab('classes');
  }, [parentId]);

  const load = useCallback(async () => {
    if (!parentId) return;
    const next = await getParent(parentId);
    setParent(next);
    setPhotoUrl(await signedProfileUrlForAssetId(next.photo_asset_id));
    const kids = await listChildrenForParent(parentId);
    setChildren(kids);
    try {
      setChildClasses(await listClassesForChildren(kids));
    } catch {
      setChildClasses([]);
    }
    try {
      setStudents(await listStudentsForLinking(classId));
    } catch {
      setStudents([]);
    }
    try {
      const people = await listProfiles();
      setLogin(people.find((row) => row.parent_id === parentId) ?? null);
      setLoginChoices(
        people.filter((row) => (row.role === 'parent' || Boolean(row.parent_id)) && !row.parent_id),
      );
    } catch {
      setLogin(null);
      setLoginChoices([]);
    }
  }, [parentId, classId]);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load parent');
      });
    }, [load]),
  );

  usePushedTitle(parent?.display_name ?? 'Parent');

  const summary: ClassParent | null = parent
    ? {
        ...parent,
        photoUrl,
        children: children.map((child) => ({
          id: child.id,
          display_name: child.display_name,
          photoUrl: child.photoUrl,
        })),
        inviteCount: 0,
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

  const openAddChild = () => {
    setChildFilter('');
    setPickerOpen(true);
  };

  const linkNow = async (student: LinkStudent) => {
    if (!parent) return;
    setBusy(true);
    setError(null);
    try {
      await linkChild(parent.id, student.id);
      setPickerOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link that child');
    } finally {
      setBusy(false);
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
      if (confirm.kind === 'remove-photo') await clearProfilePhoto('parent', parent.id);
      if (confirm.kind === 'clear') await patchParentMetadata(parent, confirm.key, null);
      if (confirm.kind === 'link') {
        await linkChild(parent.id, confirm.student.id);
        setPickerOpen(false);
      }
      if (confirm.kind === 'unlink-login') await setParentCardLink(confirm.login.id, null);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish that');
    } finally {
      setBusy(false);
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

  const details = [
    { key: 'display_name', label: 'Name', value: parent.display_name },
    ...PARENT_DETAIL_FIELDS.map((field) => ({
      key: field.key,
      label: field.label,
      value:
        field.key === 'relationship'
          ? relationshipLabel(parent.metadata)
          : metaString(parent.metadata, field.key),
    })),
  ];

  const unlinkedStudents = students.filter((student) => !children.some((child) => child.id === student.id));
  const childNeedle = childFilter.trim().toLowerCase();
  const visibleUnlinked = childNeedle
    ? unlinkedStudents.filter((student) => student.display_name.toLowerCase().includes(childNeedle))
    : unlinkedStudents;

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
            <Avatar
              name={parent.display_name}
              photoUrl={photoUrl}
              hasPhoto={Boolean(parent.photo_asset_id)}
              size={72}
            />
            <View style={styles.heroText}>
              <MarqueeText
                text={parent.display_name}
                align="start"
                paused={pressed}
                fadeColor={colors.bg}
                style={[styles.heroName, { color: colors.ink }]}
              />
              {photoBusy ? (
                <WorkingLine text="Working…" />
              ) : (
                <Text style={[type.meta, { color: colors.mute }]}>
                  {summary ? parentStatusLine(summary) : 'Add details'}
                </Text>
              )}
            </View>
          </>
        )}
      </Pressable>
      <PersonTabs tabs={PARENT_TABS} value={tab} onChange={setTab} />

      {tab === 'classes' ? (
        <>
          {childClasses.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute }]}>
              No classes yet. Classes show up when a linked child is on a roster.
            </Text>
          ) : null}
          {childClasses.map((klass) => (
            <ListRow
              key={klass.id}
              title={klass.name}
              status={klass.childNames.join(' · ') || undefined}
              onPress={() => router.push(`/class/${klass.id}`)}
            />
          ))}
        </>
      ) : null}

      {tab === 'details' ? (
      <DetailsRows
        rows={details}
        onPress={openEdit}
        onClear={(row) => setConfirm({ kind: 'clear', key: row.key, label: row.label })}
      />
      ) : null}

      {tab === 'details' ? (
      <>
      <SectionHeader label="Login" />
      {login ? (
        <ListRow
          title={formatHandle(login.username)}
          status={login.email ?? 'Assigned login'}
          trailing={
            canAssignLogin
              ? [
                  {
                    key: 'unassign',
                    label: 'Unassign',
                    tone: 'wash',
                    autoCommit: false,
                    onPress: () => setConfirm({ kind: 'unlink-login', login }),
                  },
                ]
              : []
          }
        />
      ) : (
        <Text style={[type.meta, { color: colors.mute }]}>
          No login assigned. Parents sign in with the account you assign here.
        </Text>
      )}
      {canAssignLogin && !login
        ? loginChoices.map((choice) => (
            <ListRow
              key={choice.id}
              title={formatHandle(choice.username)}
              status={choice.display_name || choice.email || 'Unassigned parent login'}
              onPress={() => {
                void setParentCardLink(choice.id, parentId)
                  .then(() => load())
                  .catch((err) => setError(err instanceof Error ? err.message : 'Could not assign login'));
              }}
            />
          ))
        : null}
      {canAssignLogin && !login && loginChoices.length === 0 ? (
        isAdminRole(profile) ? (
          <GhostButton align="left" label="Create a login in People" onPress={() => router.push('/?tab=new')} />
        ) : (
          <Text style={[type.meta, { color: colors.mute }]}>
            Ask an administrator to create a parent login in People, then assign it here.
          </Text>
        )
      ) : null}
      <Text style={[type.meta, { color: colors.mute }]}>
        They sign in with their parent login. Linked children and the focus skill show up there automatically.
      </Text>
      </>
      ) : null}

      {tab === 'children' ? (
      <>
      <SectionHeader label="Children" first />
      {children.length ? (
        <AvatarTray
          people={children.map((child) => ({
            id: child.id,
            name: child.display_name,
            photoUrl: child.photoUrl,
            hasPhoto: Boolean(child.photo_asset_id),
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
          trailing={
            canLinkChildren
              ? [
                  {
                    key: 'unlink',
                    label: 'Unlink',
                    tone: 'wash',
                    autoCommit: false,
                    onPress: () => setConfirm({ kind: 'unlink', student: child }),
                  },
                ]
              : []
          }
        />
      ))}
      {canLinkChildren ? <GhostButton align="left" label="Add child" onPress={openAddChild} /> : null}
      </>
      ) : null}

      {tab === 'details' && parent ? (
        <GhostButton
          align="left"
          label={`Delete ${firstName(parent.display_name)}`}
          onPress={() => setConfirm({ kind: 'delete' })}
        />
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

      <FormSheet visible={editOpen} title="Details" onClose={() => setEditOpen(false)}>
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
        {busy ? <WorkingLine text="Linking…" /> : null}
        {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
        {unlinkedStudents.length > 8 ? (
          <TextField placeholder="Find a student" value={childFilter} onChangeText={setChildFilter} />
        ) : null}
        {visibleUnlinked.map((student) => (
          <ListRow
            key={student.id}
            title={student.display_name}
            photoUrl={student.photoUrl}
            onPress={() => void linkNow(student)}
          />
        ))}
        {unlinkedStudents.length === 0 ? (
          <Text style={[type.meta, { color: colors.mute }]}>Every student at this school is already linked.</Text>
        ) : unlinkedStudents.length > 8 && visibleUnlinked.length === 0 ? (
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
  if (confirm.kind === 'remove-photo') return 'Remove this photo?';
  if (confirm.kind === 'clear') return `Clear ${confirm.label}?`;
  if (confirm.kind === 'unlink-login') return `Unassign ${formatHandle(confirm.login.username)}?`;
  return `Link ${firstName(confirm.student.display_name)} to ${parentName}?`;
}

function confirmBody(confirm: ConfirmKind | null, parentName: string): string {
  if (!confirm) return '';
  if (confirm.kind === 'delete') return 'The parent card is removed. Students stay. This cannot be undone.';
  if (confirm.kind === 'unlink') {
    return `They will not see ${firstName(confirm.student.display_name)}’s note. This does not delete anyone. This cannot be undone.`;
  }
  if (confirm.kind === 'remove-photo') return `${parentName} stays. This cannot be undone.`;
  if (confirm.kind === 'clear') return 'This cannot be undone.';
  if (confirm.kind === 'unlink-login') {
    return `${firstName(parentName)} stays. The login can be assigned to another parent. This cannot be undone.`;
  }
  return `They will see ${firstName(confirm.student.display_name)}’s note home. This cannot be undone.`;
}

function confirmLabel(confirm: ConfirmKind | null, parentName: string): string {
  if (!confirm) return 'Delete';
  if (confirm.kind === 'delete') return `Delete ${firstName(parentName)}`;
  if (confirm.kind === 'unlink') return 'Unlink';
  if (confirm.kind === 'remove-photo') return 'Remove photo';
  if (confirm.kind === 'clear') return 'Clear';
  if (confirm.kind === 'unlink-login') return 'Unassign';
  return 'Link';
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  heroName: {
    ...type.title,
    width: '100%',
  },

  error: {
    ...type.body,
    marginTop: 12,
  },
});
