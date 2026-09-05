import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { CreateLoginForm, PeopleDirectory } from '@/components/ui/PeopleAdmin';
import { FeedIconRow } from '@/components/ui/FeedIconPicker';
import { SchoolIdentityFields } from '@/components/ui/SchoolIdentity';
import { HandleLink } from '@/components/ui/HandleLink';
import { ListRow } from '@/components/ui/ListRow';
import { FeedPane } from '@/components/ui/FeedPane';
import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import { Screen } from '@/components/ui/Screen';
import { SplashLanding } from '@/components/ui/SplashLanding';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { isOfficeChromeRole } from '@/lib/chrome/seat';
import { can } from '@/lib/school/matrix';
import { isAlsoParent, isOfficeRole, roleStatus } from '@/lib/school/roles';
import { createClass, listClasses, listSchoolClasses, type SchoolClass } from '@/lib/classes/api';
import { listGradeLessonRollup, type ClassLessonRollup } from '@/lib/lessons/api';
import { listMyFeeds, setSchoolFeedIcon, type FeedRef } from '@/lib/feeds/api';
import { getSchoolIdentity, type SchoolIdentity } from '@/lib/school/identity';
import { deleteClass } from '@/lib/classes/delete';
import type { ClassRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';
import type { IconName } from '@/components/ui/Icon';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { switch: pick, tab: tabParam } = useLocalSearchParams<{ switch?: string; tab?: string }>();
  const { configured, loading, teacher, profile, grants, error } = useAuth();
  const chrome = useChrome();
  const officeSeat = isOfficeChromeRole(chrome.role);
  const teacherSeat = chrome.role === 'teacher';
  const [classes, setClasses] = useState<Array<ClassRow | SchoolClass> | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<ClassRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('classes');
  const [newKind, setNewKind] = useState('person');
  const [schoolFeed, setSchoolFeed] = useState<FeedRef | null>(null);
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity | null>(null);
  const [lessonRollup, setLessonRollup] = useState<ClassLessonRollup[]>([]);

  useEffect(() => {
    const next = Array.isArray(tabParam) ? tabParam[0] : tabParam;
    if (next === 'classes' || next === 'feed' || next === 'new' || next === 'people') setTab(next);
    if (next === 'manage' || next === 'school') setTab('manage');
  }, [tabParam]);

  const load = useCallback(async () => {
    if (!teacher && !officeSeat) return;
    try {
      const next = officeSeat ? await listSchoolClasses() : await listClasses();
      setClasses(next);
      if (teacherSeat) {
        try {
          setLessonRollup(await listGradeLessonRollup());
        } catch {
          setLessonRollup([]);
        }
      } else {
        setLessonRollup([]);
      }
      if (officeSeat && profile) {
        const feeds = await listMyFeeds(profile);
        setSchoolFeed(feeds.find((item) => item.kind === 'school') ?? null);
        try {
          setSchoolIdentity(await getSchoolIdentity());
        } catch {
          setSchoolIdentity(null);
        }
      }
      if (teacherSeat && next.length === 1 && next[0] && !pick) {
        router.replace(`/class/${next[0].id}`);
      }
    } catch (err) {
      setClasses([]);
      setStatus(err instanceof Error ? err.message : 'Could not load classes');
    }
  }, [officeSeat, pick, profile, router, teacher, teacherSeat]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (profile?.role === 'student') router.replace('/todo');
    else if (profile?.role === 'parent') router.replace('/parent');
  }, [profile?.role, router]);

  if (!configured) {
    return (
      <Screen centered maxWidth={480}>
        <Text style={[type.display, { color: colors.ink }]}>Kelyra</Text>
        <Text style={[styles.lead, { color: colors.mute }]}>
          Slice 01 needs a Supabase project. Copy .env.example to .env, then apply
          supabase/migrations/20260812000000_slice01_foundation.sql. See docs/slice-01.md.
        </Text>
      </Screen>
    );
  }

  if (loading || (teacher && classes === null && !officeSeat)) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  if (profile?.role === 'student' || profile?.role === 'parent') {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  if (!teacher) {
    return <SplashLanding error={error} />;
  }

  const onCreate = async () => {
    setStatus(null);
    setCreating(true);
    try {
      const created = await createClass(name);
      setName('');
      // Office card only — teachers must not land on /admin/class/[id].
      if (isOfficeRole(profile)) router.replace(`/admin/class/${created.id}`);
      else router.replace('/?switch=1');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create class');
    } finally {
      setCreating(false);
    }
  };

  const empty = (classes ?? []).length === 0;
  // Matrix grants drive chrome; server/RLS remains the hard gate (Q14).
  const canCreateClass = officeSeat && can(profile, 'classes.create', 'own', grants);
  const showCreateClass = canCreateClass;
  const canCreateLogin = officeSeat && can(profile, 'accounts.create', 'own', grants);
  const canViewActivity = officeSeat && can(profile, 'audit.view', 'school', grants);
  const canEditMatrix = can(profile, 'school.matrix', 'all', grants);
  const canCreate = showCreateClass || canCreateLogin;
  const openClass = (id: string) => {
    if (teacherSeat) router.push(`/class/${id}`);
    else router.push(`/admin/class/${id}`);
  };
  const feedIcon = (schoolFeed?.icon ?? 'feedSchool') as IconName;
  const tabs = officeSeat
    ? schoolHomeTabs({
        admin: officeSeat,
        canCreate,
        canCreateClass: showCreateClass,
        canCreateLogin,
        feedIcon,
      })
    : [];
  const pane = officeSeat ? (tabs.some((item) => item.key === tab) ? tab : 'classes') : 'classes';
  const newTabs: PersonTab[] = [
    ...(canCreateLogin ? [{ key: 'person', label: 'People', icon: 'person' as const }] : []),
    ...(showCreateClass ? [{ key: 'class', label: 'Classes', icon: 'classes' as const }] : []),
  ];
  const newPane = newTabs.some((item) => item.key === newKind) ? newKind : (newTabs[0]?.key ?? 'class');

  return (
    <Screen
      keyboard
      maxWidth={pane === 'feed' || pane === 'people' ? 640 : 480}
      scroll={pane !== 'feed'}
      avoidKeyboard={pane !== 'feed'}
    >
      {profile ? (
        <Text style={[type.meta, { color: colors.mute }]}>
          <HandleLink username={profile.username} profileId={profile.id} inline />
          {` · ${roleStatus(profile)}`}
        </Text>
      ) : null}
      {officeSeat && tabs.length ? (
        <PersonTabs
          tabs={tabs}
          value={pane}
          onChange={(key) => {
            setTab(key);
            router.setParams({ tab: key });
          }}
        />
      ) : null}
      {status ? <Text style={[styles.error, { color: colors.danger }]}>{status}</Text> : null}

      {pane === 'manage' && officeSeat ? (
        <>
          {profile?.role === 'superintendent' ? (
            <SchoolIdentityFields
              identity={schoolIdentity}
              onChange={setSchoolIdentity}
              onError={setStatus}
            />
          ) : null}
          {schoolFeed ? (
            <FeedIconRow
              title="School feed icon"
              value={schoolFeed.icon}
              onPick={async (icon) => {
                try {
                  await setSchoolFeedIcon(icon);
                  setSchoolFeed({ ...schoolFeed, icon });
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Could not save the feed icon');
                }
              }}
            />
          ) : null}
          {isAlsoParent(profile) ? (
            <ListRow
              title="My children"
              status="Progress for your own kids"
              icon="children"
              onPress={() => router.push('/parent')}
            />
          ) : null}
          <ListRow
            title="Dismissal curb"
            status="Walk line, checkout, attach plate"
            icon="work"
            onPress={() => router.push('/ride')}
          />
          <ListRow
            title="Ride office"
            status="Lines, restrictions, archive"
            icon="manage"
            onPress={() => router.push('/admin/ride')}
          />
          {canViewActivity ? (
            <ListRow
              title="Activity"
              status="Immutable change log"
              icon="history"
              onPress={() => router.push('/activity')}
            />
          ) : null}
          {canEditMatrix ? (
            <ListRow
              title="Responsibilities"
              status="Who may do what (UI chrome; server stays the hard gate)"
              icon="details"
              onPress={() => router.push('/admin/matrix')}
            />
          ) : null}
        </>
      ) : null}

      {pane === 'feed' && officeSeat ? <FeedPane scope="school" fill /> : null}

      {pane === 'people' && officeSeat ? <PeopleDirectory /> : null}

      {pane === 'classes' ? (
        <>
          <Text style={[styles.lead, { color: colors.mute }]}>
            {empty
              ? showCreateClass
                ? 'Create a class on New, then assign a teacher.'
                : 'No classes yet. The office assigns the classes you teach.'
              : officeSeat
                ? 'Every class in the school. Open a card for teacher and roster.'
                : 'Open a class to see what needs you today.'}
          </Text>
          {empty ? (
            <Text style={[type.meta, { color: colors.mute }]}>
              {showCreateClass ? 'Name a class on New.' : 'No classes yet.'}
            </Text>
          ) : null}
          {teacherSeat && !empty ? (
            <GhostButton align="left" label="Assign" onPress={() => router.push('/assignment/new')} />
          ) : null}
          {(classes ?? []).map((item) => {
            const lesson = lessonRollup.find((row) => row.classId === item.id);
            return (
            <ListRow
              key={item.id}
              title={item.name}
              status={
                lesson
                  ? `${lesson.title} · ${lesson.done}/${lesson.total} done`
                  : 'teacherName' in item
                    ? item.teacherName
                    : undefined
              }
              avatarName={item.name}
              onPress={() => openClass(item.id)}
              trailing={
                can(profile, 'classes.delete', teacherSeat ? 'own' : 'school', grants)
                  ? [
                      {
                        key: 'delete',
                        label: 'Delete',
                        tone: 'danger',
                        autoCommit: false,
                        onPress: () => setPending(item),
                      },
                    ]
                  : []
              }
            />
            );
          })}
        </>
      ) : null}

      {pane === 'new' && officeSeat && canCreate ? (
        <>
          {newTabs.length > 1 ? (
            <PersonTabs tabs={newTabs} value={newPane} onChange={setNewKind} />
          ) : null}
          {newPane === 'person' && canCreateLogin ? <CreateLoginForm /> : null}
          {newPane === 'class' && showCreateClass ? (
            <>
              <TextField
                placeholder="Name of Class"
                value={name}
                onChangeText={setName}
                returnKeyType="done"
                onSubmitEditing={() => void onCreate()}
              />
              <View style={styles.gap} />
              <PrimaryButton
                label={creating ? 'Creating…' : 'Create class'}
                disabled={creating}
                onPress={() => void onCreate()}
              />
            </>
          ) : null}
        </>
      ) : null}
      <ConfirmSheet
        visible={Boolean(pending)}
        title={`Delete ${pending?.name ?? 'class'}?`}
        body="This deletes the class, its homework, practice, and grade book. Students who are only in this class will be deleted. Students who are also in another class will stay on those rosters. This cannot be undone."
        confirmLabel={`Delete ${pending?.name ?? 'class'}`}
        typeName={pending?.name}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          setBusy(true);
          void deleteClass(pending.id)
            .then(async () => {
              setPending(null);
              const remaining = officeSeat ? await listSchoolClasses() : await listClasses();
              setClasses(remaining);
              router.replace('/?switch=1');
            })
            .catch((err) => {
              setStatus(err instanceof Error ? err.message : 'Could not delete class');
            })
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

/** Office home tabs only — teacher seat has no office PersonTabs. */
export function schoolHomeTabs(opts: {
  admin: boolean;
  canCreate: boolean;
  canCreateClass: boolean;
  canCreateLogin: boolean;
  feedIcon: IconName;
}): PersonTab[] {
  const tabs: PersonTab[] = [
    { key: 'feed', label: 'Feed', icon: opts.feedIcon },
    { key: 'classes', label: 'Classes', icon: 'classes' },
  ];
  if (opts.admin) tabs.push({ key: 'people', label: 'People', icon: 'person' });
  tabs.push({ key: 'manage', label: 'Manage', icon: 'manage' });
  if (opts.canCreate) {
    tabs.push({
      key: 'new',
      label: opts.canCreateClass && opts.canCreateLogin ? 'New' : opts.canCreateLogin ? 'New login' : 'New class',
      icon: 'plus',
    });
  }
  return tabs;
}

const styles = StyleSheet.create({
  lead: {
    ...type.body,
    marginTop: 8,
    marginBottom: 24,
  },
  gap: {
    height: 12,
  },
  error: {
    ...type.body,
    marginTop: 12,
  },
});
