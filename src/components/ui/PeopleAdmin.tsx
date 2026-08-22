import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { PrimaryButton } from '@/components/ui/Button';
import { HandleLink } from '@/components/ui/HandleLink';
import { ListRow } from '@/components/ui/ListRow';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import {
  createLogin,
  listDirectory,
  setAlsoHat,
  setAlsoParent as saveAlsoParent,
  type DirectoryPerson,
} from '@/lib/school/api';
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

export function PeopleDirectory() {
  const { colors } = useTheme();
  const { profile, refresh } = useAuth();
  const chrome = useChrome();
  const router = useRouter();
  const [rows, setRows] = useState<DirectoryPerson[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('staff');

  const load = useCallback(async () => {
    setRows(await listDirectory());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load people'));
    }, [load]),
  );

  const openPerson = (row: DirectoryPerson, group: 'staff' | 'students' | 'parents') => {
    const classId = row.classId ?? chrome.classId ?? chrome.classes[0]?.id ?? null;
    if (group === 'students' && row.student_id && classId) {
      router.push(`/class/${classId}/student/${row.student_id}`);
      return;
    }
    if (group === 'parents' && row.parent_id && classId) {
      router.push(`/class/${classId}/parent/${row.parent_id}`);
      return;
    }
    router.push(`/profile?person=${row.id}` as never);
  };

  const renderGroup = (group: DirectoryPerson[], kind: 'staff' | 'students' | 'parents') => (
    <>
      {group.length === 0 ? (
        <Text style={[type.meta, { color: colors.mute }]}>None yet.</Text>
      ) : null}
      {group.map((row) => {
        const parent = isAlsoParent(row);
        const trailing: ListSwipeAction[] = [];
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
        if (canAlsoBeAdministrator(row.role)) {
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
        if (canAlsoBeTeacher(row.role)) {
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
        if (isStaffRole(row)) {
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
        const extra = [roleStatus(row), row.className].filter(Boolean).join(' · ');
        return (
          <ListRow
            key={row.id}
            title={row.display_name || formatHandle(row.username)}
            status={`${formatHandle(row.username)} · ${extra}`}
            statusNode={
              <Text style={[type.meta, { color: colors.mute }]}>
                <HandleLink username={row.username} profileId={row.id} inline />
                {extra ? ` · ${extra}` : ''}
              </Text>
            }
            avatarName={row.display_name || row.username}
            photoUrl={row.photoUrl}
            onPress={() => openPerson(row, kind)}
            trailing={trailing}
          />
        );
      })}
    </>
  );

  const staff = rows?.filter((row) => isStaffRole(row)) ?? [];
  const students = rows?.filter((row) => row.role === 'student') ?? [];
  const parents = rows?.filter((row) => listedAsParent(row, rows)) ?? [];

  return (
    <>
      <PersonTabs tabs={PEOPLE_TABS} value={tab} onChange={setTab} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {rows == null ? <WorkingLine /> : null}
      {tab === 'staff' && rows ? renderGroup(staff, 'staff') : null}
      {tab === 'students' && rows ? renderGroup(students, 'students') : null}
      {tab === 'parents' && rows ? renderGroup(parents, 'parents') : null}
    </>
  );
}

export function CreateLoginForm({
  onCreated,
}: {
  onCreated?: (role: SchoolRole) => void;
}) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SchoolRole>('teacher');
  const [alsoParent, setAlsoParent] = useState(false);
  const [alsoAdministrator, setAlsoAdministrator] = useState(false);
  const [alsoTeacher, setAlsoTeacher] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setError(null);
    setStatus(null);
    if (!displayName.trim() && !username.trim()) {
      setError('Need a display name or @username.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Need a real email.');
      return;
    }
    if (password.length < 6) {
      setError('Temporary password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      await createLogin({
        email,
        password,
        username: username.trim() || displayName,
        role,
        displayName,
        mustChange: true,
        alsoParent: isStaffRole(role) && alsoParent,
        alsoAdministrator: canAlsoBeAdministrator(role) && alsoAdministrator,
        alsoTeacher: canAlsoBeTeacher(role) && alsoTeacher,
      });
      setEmail('');
      setUsername('');
      setDisplayName('');
      setPassword('');
      setAlsoParent(false);
      setAlsoAdministrator(false);
      setAlsoTeacher(false);
      setStatus(
        role === 'student'
          ? 'Account created. Add them to a class roster to attach the record, or open an existing student and assign this login. They must change the password on first sign-in.'
          : isStaffRole(role) && alsoParent
            ? 'Account created. Link their children from a class Parents list. They must change the password on first sign-in.'
            : 'Account created. They must change the password on first sign-in.',
      );
      onCreated?.(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      <TextField placeholder="Display name" value={displayName} onChangeText={setDisplayName} />
      <View style={styles.gap} />
      <TextField autoCapitalize="none" placeholder="@username" value={username} onChangeText={setUsername} />
      <View style={styles.gap} />
      <TextField
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <View style={styles.gap} />
      <TextField placeholder="Temporary password" value={password} onChangeText={setPassword} />
      <View style={styles.gap} />
      <ChipRow>
        {SCHOOL_ROLES.filter((item) => item !== 'superintendent' || profile?.role === 'superintendent').map((item) => (
          <Chip
            key={item}
            label={roleLabel(item)}
            selected={role === item}
            onPress={() => {
              setRole(item);
              if (!isStaffRole(item)) setAlsoParent(false);
              if (!canAlsoBeAdministrator(item)) setAlsoAdministrator(false);
              if (!canAlsoBeTeacher(item)) setAlsoTeacher(false);
            }}
          />
        ))}
      </ChipRow>
      {isStaffRole(role) ? (
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
      <PrimaryButton label={busy ? 'Creating…' : 'Create account'} disabled={busy} onPress={() => void create()} />
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
  gap: { height: 10 },
  error: { ...type.body, marginTop: 8 },
});
