import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { PrimaryButton } from '@/components/ui/Button';
import { HandleLink } from '@/components/ui/HandleLink';
import { NoticePopup } from '@/components/ui/NoticePopup';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import {
  canDeactivatePerson,
  deactivateConfirmCopy,
  purgeConfirmCopy,
  purgedStatus,
  deactivatedStatus,
  isDeactivated,
  restoredStatus,
} from '@/lib/school/deactivate';
import { ListRow } from '@/components/ui/ListRow';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { ResetPasswordSheet } from '@/components/ui/ResetPasswordSheet';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  createLogin,
  getProfile,
  listDirectory,
  setPersonActive,
  purgePerson,
  listProfiles,
  resetLoginPassword,
  setAlsoHat,
  setAlsoParent as saveAlsoParent,
  updateProfileDetails,
  type DirectoryPerson,
} from '@/lib/school/api';
import {
  fieldForServerError,
  firstCreateLoginError,
  validateCreateLogin,
  type CreateLoginErrors,
  type CreateLoginField,
} from '@/lib/school/createLoginValidation';
import { pickNormalizedPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { uploadProfilePhoto } from '@/lib/people/photos';
import { prepareFramedPortrait } from '@/lib/people/framePortrait';
import {
  createAccountErrorNotice,
  createdAccountNotice,
  type CreateLoginNotice,
} from '@/lib/school/createLoginNotice';
import { canShowOfficeReset, peopleDirectoryPersonHref, RESET_PASSWORD_COPY } from '@/lib/school/resetPassword';
import {
  canAlsoBeAdministrator,
  canAlsoBeTeacher,
  formatHandle,
  isAlsoParent,
  isStaffRole,
  roleLabel,
  roleStatus,
  SCHOOL_ROLES,
} from '@/lib/school/roles';
import type { ListSwipeAction } from '@/components/ui/ListRow';
import type { SchoolRole } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

const PEOPLE_TABS = [
  { key: 'staff', label: 'Staff', icon: 'person' as const },
  { key: 'parents', label: 'Parents', icon: 'parents' as const },
  { key: 'students', label: 'Students', icon: 'setup' as const },
];

export function PeopleDirectory({
  tab: tabProp,
  onTabChange,
  highlightId,
}: {
  /** AFTER-CREATE-JUMP: host-controlled sub-tab so a new login opens on its list. */
  tab?: string;
  onTabChange?: (tab: string) => void;
  /** Row tinted (selected) so the just-created person is easy to spot. */
  highlightId?: string | null;
} = {}) {
  const { colors } = useTheme();
  const { profile, refresh } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<DirectoryPerson[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownTab, setOwnTab] = useState('staff');
  const tab = tabProp ?? ownTab;
  const setTab = (next: string) => {
    setOwnTab(next);
    onTabChange?.(next);
  };
  const [resetTarget, setResetTarget] = useState<{ id: string; username: string } | null>(null);
  // PEOPLE-DEACTIVATE: swipe "Delete" deactivates; deleted people sit behind a toggle with Restore.
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; handle: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  // PEOPLE-PURGE: deleted rows also get "Permanently delete" (typed-name confirm).
  const [purgeTarget, setPurgeTarget] = useState<{ id: string; name: string } | null>(null);
  const [purging, setPurging] = useState(false);

  const load = useCallback(async () => {
    setRows(await listDirectory({ includeDeactivated: true }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load people'));
    }, [load]),
  );

  const openPerson = (row: DirectoryPerson) => {
    router.push(peopleDirectoryPersonHref(row.id) as never);
  };

  const renderGroup = (group: DirectoryPerson[], deleted = false) => (
    <>
      {group.length === 0 && !deleted ? (
        <Text style={[type.meta, { color: colors.mute }]}>None yet.</Text>
      ) : null}
      {group.map((row) => {
        const parent = isAlsoParent(row);
        const trailing: ListSwipeAction[] = [];
        const name = row.display_name || formatHandle(row.username);
        const apply = async (work: () => Promise<void>, ok: string) => {
          setError(null);
          setStatus(null);
          try {
            await work();
            setStatus(ok);
            await load();
            if (row.id === profile?.id) await refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update hats');
          }
        };
        if (deleted) {
          if (canDeactivatePerson(profile, row)) {
            trailing.push({
              key: 'restore',
              label: 'Restore',
              tone: 'brand',
              onPress: () => {
                void apply(() => setPersonActive(row.id, true), restoredStatus(formatHandle(row.username)));
              },
            });
            trailing.push({
              key: 'purge',
              label: 'Permanently delete',
              tone: 'danger',
              onPress: () => setPurgeTarget({ id: row.id, name }),
            });
          }
        }
        if (!deleted && canAlsoBeAdministrator(row.role)) {
          trailing.push({
            key: 'admin',
            label: row.also_administrator ? 'Not an administrator' : 'Also an administrator',
            tone: row.also_administrator ? 'wash' : 'brand',
            onPress: () => {
              void apply(
                () => setAlsoHat(row.id, 'administrator', !row.also_administrator),
                row.also_administrator
                  ? `${formatHandle(row.username)} is no longer also an administrator.`
                  : `${formatHandle(row.username)} is also an administrator.`,
              );
            },
          });
        }
        if (!deleted && canAlsoBeTeacher(row.role)) {
          trailing.push({
            key: 'teacher',
            label: row.also_teacher ? 'Not a teacher' : 'Also a teacher',
            tone: row.also_teacher ? 'wash' : 'brand',
            onPress: () => {
              void apply(
                () => setAlsoHat(row.id, 'teacher', !row.also_teacher),
                row.also_teacher
                  ? `${formatHandle(row.username)} is no longer also a teacher.`
                  : `${formatHandle(row.username)} is also a teacher. Capture and class tools turn on.`,
              );
            },
          });
        }
        if (!deleted && isStaffRole(row)) {
          trailing.push({
            key: 'parent',
            label: parent ? 'Not a parent' : 'Also a parent',
            tone: parent ? 'wash' : 'brand',
            onPress: () => {
              void apply(
                () => saveAlsoParent(row.id, !parent).then(() => undefined),
                parent
                  ? `${formatHandle(row.username)} is no longer marked as a parent. The parent card stays so children stay linked.`
                  : `${formatHandle(row.username)} is also a parent. Link children from a class Parents list.`,
              );
            },
          });
        }
        if (!deleted && canShowOfficeReset(profile, row)) {
          trailing.push({
            key: 'reset',
            label: RESET_PASSWORD_COPY.action,
            tone: 'brand',
            onPress: () => {
              setError(null);
              setStatus(null);
              setResetTarget({ id: row.id, username: row.username ?? '' });
            },
          });
        }
        if (!deleted && canDeactivatePerson(profile, row)) {
          trailing.push({
            key: 'delete',
            label: 'Delete',
            tone: 'danger',
            onPress: () => {
              setError(null);
              setStatus(null);
              setDeleteTarget({ id: row.id, name, handle: formatHandle(row.username) });
            },
          });
        }
        const extra = [roleStatus(row), row.className].filter(Boolean).join(' · ');
        return (
          <ListRow
            key={row.id}
            title={name}
            status={`${formatHandle(row.username)} · ${extra}`}
            statusNode={
              <Text style={[type.meta, { color: colors.mute }]}>
                <HandleLink username={row.username} profileId={row.id} inline />
                {extra ? ` · ${extra}` : ''}
              </Text>
            }
            avatarName={row.display_name || row.username}
            photoUrl={row.photoUrl}
            onPress={() => openPerson(row)}
            selected={row.id === highlightId}
            trailing={trailing}
          />
        );
      })}
    </>
  );

  const inTab = (row: DirectoryPerson) =>
    tab === 'staff' ? isStaffRole(row) : tab === 'students' ? row.role === 'student' : listedAsParent(row, rows ?? []);
  const active = rows?.filter((row) => !isDeactivated(row)) ?? [];
  const staff = active.filter((row) => isStaffRole(row));
  const students = active.filter((row) => row.role === 'student');
  const parents = active.filter((row) => listedAsParent(row, rows ?? []));
  const deletedHere = rows?.filter((row) => isDeactivated(row) && inTab(row)) ?? [];
  const confirmCopy = deactivateConfirmCopy(deleteTarget?.name ?? 'this person');
  const purgeCopy = purgeConfirmCopy(purgeTarget?.name ?? 'this person');

  return (
    <>
      <PersonTabs tabs={PEOPLE_TABS} value={tab} onChange={setTab} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {rows == null ? <WorkingLine /> : null}
      {tab === 'staff' && rows ? renderGroup(staff) : null}
      {tab === 'students' && rows ? renderGroup(students) : null}
      {tab === 'parents' && rows ? renderGroup(parents) : null}
      {rows && deletedHere.length ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowDeleted((open) => !open)}
            style={styles.deletedToggle}
          >
            <Text style={[type.meta, { color: colors.brand }]}>
              {showDeleted ? 'Hide deleted people' : `Show deleted people (${deletedHere.length})`}
            </Text>
          </Pressable>
          {showDeleted ? renderGroup(deletedHere, true) : null}
        </>
      ) : null}
      <ConfirmSheet
        visible={Boolean(deleteTarget)}
        title={confirmCopy.title}
        body={confirmCopy.body}
        confirmLabel={confirmCopy.confirmLabel}
        tone="primary"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          if (!target) return;
          setDeleting(true);
          setError(null);
          setStatus(null);
          void setPersonActive(target.id, false)
            .then(async () => {
              setStatus(deactivatedStatus(target.handle));
              setDeleteTarget(null);
              await load();
            })
            .catch((err) => {
              setDeleteTarget(null);
              setError(err instanceof Error ? err.message : 'Could not delete');
            })
            .finally(() => setDeleting(false));
        }}
      />
      <ConfirmSheet
        visible={Boolean(purgeTarget)}
        title={purgeCopy.title}
        body={purgeCopy.body}
        confirmLabel={purgeCopy.confirmLabel}
        tone="danger"
        typeName={purgeTarget?.name ?? null}
        busy={purging}
        onCancel={() => setPurgeTarget(null)}
        onConfirm={() => {
          const target = purgeTarget;
          if (!target) return;
          setPurging(true);
          setError(null);
          setStatus(null);
          void purgePerson(target.id)
            .then(async () => {
              setStatus(purgedStatus(target.name));
              setPurgeTarget(null);
              await load();
            })
            .catch((err) => {
              setPurgeTarget(null);
              setError(err instanceof Error ? err.message : 'Could not permanently delete');
            })
            .finally(() => setPurging(false));
        }}
      />
      <ResetPasswordSheet
        visible={Boolean(resetTarget)}
        username={resetTarget?.username}
        onClose={() => setResetTarget(null)}
        onReset={async (password) => {
          if (!resetTarget) return;
          await resetLoginPassword(resetTarget.id, password);
        }}
      />
    </>
  );
}

export function CreateLoginForm({
  onCreated,
}: {
  /** AFTER-CREATE-JUMP: host moves to People and shows the success notice itself (this form
   * unmounts when the pane changes, so its own popup would vanish). */
  onCreated?: (created: { id: string; role: SchoolRole; notice: CreateLoginNotice }) => void;
}) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  // NEW-PERSON-VALIDATION: no chip preselected; picking a role is required.
  const [role, setRole] = useState<SchoolRole | null>(null);
  const [alsoParent, setAlsoParent] = useState(false);
  const [alsoAdministrator, setAlsoAdministrator] = useState(false);
  const [alsoTeacher, setAlsoTeacher] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  // NEW-PERSON-AVATAR: picked locally, uploaded after the login exists.
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string; framed?: boolean } | null>(null);
  // AVATAR-PREVIEW: cutout + face-center runs right after the shot; Working K pops up meanwhile.
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CreateLoginErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // CREATE-ACCOUNT-POPUP: brief pop-up on success or failure (inline text stays for next steps).
  const [notice, setNotice] = useState<CreateLoginNotice | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const fail = (reason: string) => {
    setError(reason);
    setNotice(createAccountErrorNotice(reason));
  };
  const clearField = (field: CreateLoginField) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  const avatarAllowed = role !== 'student';

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      await waitForModalDismiss();
      const picked = await pickNormalizedPhoto(fromCamera && !webCameraNeeded(fromCamera));
      if (!picked) return;
      if (!profile) {
        setPhoto(picked);
        return;
      }
      setProcessingPhoto(true);
      try {
        const framed = await prepareFramedPortrait({
          teacherId: profile.id,
          uri: picked.uri,
          mimeType: picked.mimeType,
        });
        setPhoto({ ...framed, framed: true });
      } catch {
        // Processing is offline: keep the raw shot; create still frames it on save.
        setPhoto(picked);
      } finally {
        setProcessingPhoto(false);
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Could not open photos');
    }
  };

  const create = async () => {
    setError(null);
    setStatus(null);
    let existing: Awaited<ReturnType<typeof listProfiles>> = [];
    try {
      existing = await listProfiles();
    } catch {
      // Server still rejects a duplicate email; the rest re-checks there too.
    }
    const draft = { displayName, username, email, password, role };
    const errors = validateCreateLogin(draft, existing);
    setFieldErrors(errors);
    if (firstCreateLoginError(errors) || !role) return;
    setBusy(true);
    try {
      const newId = await createLogin({
        email,
        password,
        username,
        role,
        displayName,
        mustChange: true,
        alsoParent: isStaffRole(role) && alsoParent,
        alsoAdministrator: canAlsoBeAdministrator(role) && alsoAdministrator,
        alsoTeacher: canAlsoBeTeacher(role) && alsoTeacher,
      });
      const missed: string[] = [];
      if (phone.trim() || address.trim() || notes.trim()) {
        try {
          const saved = await getProfile(newId);
          await updateProfileDetails({
            profileId: newId,
            displayName: saved.display_name ?? displayName,
            username: saved.username,
            email: saved.email ?? email,
            phone,
            address,
            notes,
          });
        } catch {
          missed.push('phone, address, and notes');
        }
      }
      if (photo && avatarAllowed && profile) {
        try {
          const saved = await getProfile(newId);
          const staff = isStaffRole(role) || (canAlsoBeTeacher(role) && alsoTeacher);
          const personId = staff ? newId : saved.parent_id;
          if (!personId) throw new Error('No record for the photo');
          await uploadProfilePhoto({
            teacherId: profile.id,
            kind: staff ? 'teacher' : 'parent',
            personId,
            uri: photo.uri,
            mimeType: photo.mimeType,
            preframed: photo.framed,
          });
        } catch {
          missed.push('the photo');
        }
      }
      const createdNotice = createdAccountNotice(displayName, username, missed);
      if (!onCreated) setNotice(createdNotice);
      setEmail('');
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole(null);
      setAlsoParent(false);
      setAlsoAdministrator(false);
      setAlsoTeacher(false);
      setPhone('');
      setAddress('');
      setNotes('');
      setPhoto(null);
      setFieldErrors({});
      setStatus(
        role === 'student'
          ? 'Account created. Add them to a class roster to attach the record, or open an existing student and assign this login. They must change the password on first sign-in.'
          : isStaffRole(role) && alsoParent
            ? 'Account created. Link their children from a class Parents list. They must change the password on first sign-in.'
            : 'Account created. They must change the password on first sign-in.',
      );
      onCreated?.({ id: newId, role, notice: createdNotice });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create account';
      const field = fieldForServerError(message);
      if (field) setFieldErrors((prev) => ({ ...prev, [field]: message.replace(/^Could not create login:\s*/i, '') }));
      fail(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setBusy(false);
    }
  };

  const label = (text: string, required: boolean) => (
    <Text style={[styles.fieldLabel, { color: colors.mute }]}>
      {text}
      {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
    </Text>
  );
  const fieldError = (field: CreateLoginField) =>
    fieldErrors[field] ? (
      <Text style={[styles.fieldError, { color: colors.danger }]}>{fieldErrors[field]}</Text>
    ) : null;

  return (
    <>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {avatarAllowed ? (
        <View style={styles.avatarRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={photo ? 'Change photo' : 'Add photo'}
            onPress={() => setPhotoOpen(true)}
            style={styles.avatarPress}
          >
            <Avatar name={displayName.trim()} photoUrl={photo?.uri} unknown={!displayName.trim()} size={88} />
            <Text style={[type.meta, styles.avatarHint, { color: colors.brand }]}>
              {photo ? 'Change photo' : 'Add photo'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {label('Display name', true)}
      <TextField
        dictationSafe
        placeholder="Display name"
        value={displayName}
        onChangeText={(value) => {
          setDisplayName(value);
          clearField('displayName');
        }}
      />
      {fieldError('displayName')}
      <View style={styles.gap} />
      {label('Username', true)}
      <TextField
        dictationSafe
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="@username"
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          clearField('username');
        }}
      />
      {fieldError('username')}
      <View style={styles.gap} />
      {label('Email', true)}
      <TextField
        dictationSafe
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearField('email');
        }}
      />
      {fieldError('email')}
      <View style={styles.gap} />
      {label('Temporary password', true)}
      <TextField
        dictationSafe
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Temporary password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          clearField('password');
        }}
      />
      {fieldError('password')}
      <View style={styles.gap} />
      {label('Role', true)}
      <ChipRow>
        {SCHOOL_ROLES.filter((item) => item !== 'superintendent' || profile?.role === 'superintendent').map((item) => (
          <Chip
            key={item}
            label={roleLabel(item)}
            selected={role === item}
            onPress={() => {
              setRole(item);
              clearField('role');
              if (!isStaffRole(item)) setAlsoParent(false);
              if (!canAlsoBeAdministrator(item)) setAlsoAdministrator(false);
              if (!canAlsoBeTeacher(item)) setAlsoTeacher(false);
              if (item === 'student') setPhoto(null);
            }}
          />
        ))}
      </ChipRow>
      {fieldError('role')}
      {role && isStaffRole(role) ? (
        <ChipRow>
          {canAlsoBeAdministrator(role) ? (
            <Chip
              label="Also an administrator"
              tooltip="Same login also runs the school office"
              selected={alsoAdministrator}
              onPress={() => setAlsoAdministrator((value) => !value)}
            />
          ) : null}
          {canAlsoBeTeacher(role) ? (
            <Chip
              label="Also a teacher"
              tooltip="Same login also teaches classes"
              selected={alsoTeacher}
              onPress={() => setAlsoTeacher((value) => !value)}
            />
          ) : null}
          <Chip
            label="Also a parent"
            tooltip="Same login also has children at this school"
            selected={alsoParent}
            onPress={() => setAlsoParent((value) => !value)}
          />
        </ChipRow>
      ) : null}
      <View style={styles.gap} />
      <Text style={[type.meta, styles.optionalHead, { color: colors.mute }]}>Optional</Text>
      {label('Phone', false)}
      <TextField dictationSafe keyboardType="phone-pad" placeholder="Phone" value={phone} onChangeText={setPhone} />
      <View style={styles.gap} />
      {label('Address', false)}
      <TextField dictationSafe placeholder="Address" value={address} onChangeText={setAddress} />
      <View style={styles.gap} />
      {label('Notes', false)}
      <TextField dictationSafe multiline placeholder="Notes" value={notes} onChangeText={setNotes} />
      <View style={styles.gap} />
      <PrimaryButton label={busy ? 'Creating…' : 'Create account'} disabled={busy || processingPhoto} onPress={() => void create()} />
      <PhotoSheet
        visible={photoOpen}
        hasPhoto={Boolean(photo)}
        onTake={() => void pickPhoto(true)}
        onLibrary={() => void pickPhoto(false)}
        onRemove={() => {
          setPhotoOpen(false);
          setPhoto(null);
        }}
        onCancel={() => setPhotoOpen(false)}
      />
      <NoticePopup notice={notice} onDismiss={dismissNotice} working={busy ? 'Creating account…' : processingPhoto ? 'Processing photo…' : null} />
    </>
  );
}

function listedAsParent(row: DirectoryPerson, everyone: DirectoryPerson[] | null): boolean {
  const all = everyone ?? [];
  if (isStaffRole(row)) return Boolean(row.parent_id && row.hasChildren);
  if (row.role !== 'parent' && !row.parent_id) return false;
  const staffNames = new Set(
    all
      .filter((person) => isStaffRole(person))
      .flatMap((person) =>
        [person.username, person.display_name].map((value) => value?.trim().toLowerCase()).filter(Boolean),
      ),
  );
  const names = [row.username, row.display_name]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  const looksLikeStaffHat = names.some((name) => staffNames.has(name));
  if (looksLikeStaffHat) return row.hasChildren;
  return row.role === 'parent' || Boolean(row.parent_id);
}

const styles = StyleSheet.create({
  deletedToggle: {
    paddingVertical: 12,
  },
  gap: { height: 10 },
  error: { ...type.body, marginTop: 8 },
  fieldLabel: { ...type.meta, marginBottom: 6 },
  fieldError: { ...type.meta, marginTop: 4 },
  optionalHead: { marginTop: 6, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  avatarRow: { alignItems: 'center', marginBottom: 14 },
  avatarPress: { alignItems: 'center' },
  avatarHint: { marginTop: 6 },
});
