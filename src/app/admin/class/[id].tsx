import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { OFFICE_CLASS_TABS, tabsWithFeedIcon } from '@/components/ui/ClassTabs';
import { FeedPane } from '@/components/ui/FeedPane';
import { FeedIconRow } from '@/components/ui/FeedIconPicker';
import { FormSheet } from '@/components/ui/FormSheet';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import {
  addTeacherToClass,
  getClass,
  listAvailableTeachers,
  listClassTeachers,
  removeTeacherFromClass,
  type ClassTeacher,
} from '@/lib/classes/api';
import { setClassFeedIcon } from '@/lib/feeds/api';
import { asFeedIcon, DEFAULT_CLASS_FEED_ICON } from '@/lib/feeds/icons';
import { firstName } from '@/lib/format';
import { listChildrenForParent, listOfficeClassParents, removeParentFromClass, type ClassParent } from '@/lib/parents/api';
import { formatHandle, isAdminRole } from '@/lib/school/roles';
import { useAuth } from '@/lib/auth/AuthProvider';
import { addTypedStudent, enrollExistingStudent, listAvailableStudents, listRoster, type RosterStudent } from '@/lib/students/api';
import { removeEnrollment } from '@/lib/students/delete';
import type { ClassRow, StudentRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ClassOfficeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const chrome = useChrome();
  const admin = isAdminRole(profile);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [teachers, setTeachers] = useState<ClassTeacher[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<ClassTeacher[]>([]);
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [availableStudents, setAvailableStudents] = useState<Array<StudentRow & { photoUrl: string | null }>>([]);
  const [linkedParents, setLinkedParents] = useState<ClassParent[]>([]);
  const [availableParents, setAvailableParents] = useState<ClassParent[]>([]);
  const [picking, setPicking] = useState<ClassParent | null>(null);
  const [pickedKids, setPickedKids] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('teacher');
  const [newStudentName, setNewStudentName] = useState('');
  const [creatingStudent, setCreatingStudent] = useState(false);
  usePushedTitle(klass?.name ?? 'Class');

  const load = useCallback(async () => {
    if (!admin) {
      setError('Only the school office can open this card.');
      return;
    }
    if (!id) {
      setError('Missing class.');
      return;
    }
    const next = await getClass(id);
    setKlass(next);
    const [assigned, extras, names, others] = await Promise.all([
      listClassTeachers(id),
      listAvailableTeachers(id),
      listRoster(id),
      listAvailableStudents(id),
    ]);
    setTeachers(assigned);
    setAvailableTeachers(extras);
    setRoster(names);
    setAvailableStudents(others);
    try {
      const family = await listOfficeClassParents(names);
      setLinkedParents(family.linked);
      setAvailableParents(family.available);
    } catch (err) {
      setLinkedParents([]);
      setAvailableParents([]);
      throw err;
    }
  }, [admin, id]);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void load().catch((err) => {
        if (live) setError(err instanceof Error ? err.message : 'Could not load class');
      });
      return () => {
        live = false;
      };
    }, [load]),
  );

  const addStudent = async (studentId: string) => {
    if (!id) return;
    setError(null);
    try {
      await enrollExistingStudent(id, studentId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that student');
    }
  };

  const addNewStudent = async () => {
    if (!id || !klass) return;
    const name = newStudentName.trim();
    if (!name) return;
    setCreatingStudent(true);
    setError(null);
    try {
      const ownerId = klass.teacher_id;
      if (!ownerId) throw new Error('This class has no teacher.');
      await addTypedStudent(id, ownerId, name);
      setNewStudentName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that student');
    } finally {
      setCreatingStudent(false);
    }
  };

  const addParent = async (parent: ClassParent, childIds?: string[]) => {
    if (!id) return;
    setError(null);
    let kids = parent.children;
    if (!kids.length) {
      try {
        const fetched = await listChildrenForParent(parent.id);
        kids = fetched.map((child) => ({
          id: child.id,
          display_name: child.display_name,
          photoUrl: child.photoUrl,
        }));
        parent = { ...parent, children: kids };
      } catch {
        kids = [];
      }
    }
    if (!kids.length) {
      setError('Link a child to that parent first.');
      return;
    }
    if (kids.length > 1 && !childIds) {
      setPicking(parent);
      setPickedKids([]);
      return;
    }
    const selected = childIds ?? kids.map((child) => child.id);
    try {
      for (const childId of selected) {
        await enrollExistingStudent(id, childId);
      }
      setPicking(null);
      setPickedKids([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that parent');
    }
  };

  if (error && !klass) {
    return (
      <Screen>
        <Text style={[type.body, { color: colors.danger }]}>{error}</Text>
      </Screen>
    );
  }

  if (!klass) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  const feedIcon = asFeedIcon(klass.feed_icon, DEFAULT_CLASS_FEED_ICON);
  const tabs = tabsWithFeedIcon(OFFICE_CLASS_TABS, feedIcon);
  const pane = tabs.some((item) => item.key === tab) ? tab : 'teacher';

  return (
    <Screen keyboard maxWidth={640} scroll={pane !== 'feed'} avoidKeyboard={pane !== 'feed'}>
      <Text style={[type.display, { color: colors.ink }]}>{klass.name}</Text>
      <Text style={[styles.lead, { color: colors.mute }]}>
        School office card. This is not the teacher desk — no capture, no grade book from here.
      </Text>
      <PersonTabs tabs={tabs} value={pane} onChange={setTab} />
      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}

      {pane === 'teacher' ? (
        <>
          <FeedIconRow
            value={asFeedIcon(klass.feed_icon, DEFAULT_CLASS_FEED_ICON)}
            onPick={async (icon) => {
              try {
                await setClassFeedIcon(klass.id, icon);
                setKlass({ ...klass, feed_icon: icon });
                chrome.refreshChrome();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not save the feed icon');
              }
            }}
          />
          <SectionHeader label="Teachers" first />
          {teachers.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute }]}>No teacher yet. Add one from the list.</Text>
          ) : null}
          {teachers.map((teacher) => (
            <ListRow
              key={teacher.id}
              title={teacher.display_name}
              status={teacher.username ? formatHandle(teacher.username) : undefined}
              avatarName={teacher.display_name}
              photoUrl={teacher.photoUrl}
              chevron={false}
              trailing={[
                {
                  key: 'remove',
                  label: 'Remove',
                  tone: 'wash',
                  onPress: () => {
                    void removeTeacherFromClass(klass.id, teacher.id)
                      .then(() => load())
                      .catch((err) => setError(err instanceof Error ? err.message : 'Could not remove teacher'));
                  },
                },
              ]}
            />
          ))}
          <SectionHeader label="All teachers" />
          {availableTeachers.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute }]}>
              Teachers at this school show up here. Swipe left to add.
            </Text>
          ) : null}
          {availableTeachers.map((teacher) => (
            <ListRow
              key={teacher.id}
              title={teacher.display_name}
              status={teacher.username ? formatHandle(teacher.username) : undefined}
              avatarName={teacher.display_name}
              photoUrl={teacher.photoUrl}
              chevron={false}
              trailing={[
                {
                  key: 'add',
                  label: 'Add',
                  tone: 'brand',
                  onPress: () => {
                    void addTeacherToClass(klass.id, teacher.id)
                      .then(() => load())
                      .catch((err) => setError(err instanceof Error ? err.message : 'Could not add teacher'));
                  },
                },
              ]}
            />
          ))}
        </>
      ) : null}

      {pane === 'parents' ? (
        <>
          <SectionHeader label="In this class" first />
          {linkedParents.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute }]}>No parents yet.</Text>
          ) : null}
          {linkedParents.map((parent) => (
            <ListRow
              key={parent.id}
              title={parent.display_name}
              status={parent.children.map((child) => firstName(child.display_name)).join(', ') || undefined}
              photoUrl={parent.photoUrl}
              hasPhoto={Boolean(parent.photo_asset_id)}
              onPress={() => router.push(`/class/${klass.id}/parent/${parent.id}`)}
              trailing={[
                {
                  key: 'remove',
                  label: 'Remove',
                  tone: 'wash',
                  onPress: () => {
                    void removeParentFromClass(klass.id, parent.id)
                      .then(() => load())
                      .catch((err) => setError(err instanceof Error ? err.message : 'Could not remove parent'));
                  },
                },
              ]}
            />
          ))}
          <SectionHeader label="All parents" />
          {availableParents.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute }]}>
              Parents not yet on this class show up here. Swipe left to add.
            </Text>
          ) : null}
          {availableParents.map((parent) => (
            <ListRow
              key={parent.id}
              title={parent.display_name}
              status={parent.children.map((child) => firstName(child.display_name)).join(', ') || undefined}
              photoUrl={parent.photoUrl}
              hasPhoto={Boolean(parent.photo_asset_id)}
              onPress={() => router.push(`/class/${klass.id}/parent/${parent.id}`)}
              trailing={[
                {
                  key: 'add',
                  label: 'Add',
                  tone: 'brand',
                  onPress: () => void addParent(parent),
                },
              ]}
            />
          ))}
        </>
      ) : null}

      {pane === 'students' ? (
        <>
          <SectionHeader label="Students" first />
          <View style={styles.mint}>
            <Text style={[type.meta, { color: colors.mute }]}>
              New names on the school roster. Teachers enroll existing students into a class they teach.
            </Text>
            <TextField
              placeholder="First and last name"
              value={newStudentName}
              onChangeText={setNewStudentName}
            />
            <PrimaryButton
              label={creatingStudent ? 'Adding…' : newStudentName.trim() ? `Add ${newStudentName.trim()}` : 'Add student'}
              disabled={creatingStudent || !newStudentName.trim()}
              onPress={() => void addNewStudent()}
            />
          </View>
          {roster == null ? <WorkingLine /> : null}
          {roster && roster.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute }]}>No students yet.</Text>
          ) : null}
          {roster?.map((student) => (
            <ListRow
              key={student.id}
              title={student.display_name}
              avatarName={student.display_name}
              photoUrl={student.photoUrl}
              onPress={() => router.push(`/class/${klass.id}/student/${student.id}`)}
              trailing={[
                {
                  key: 'remove',
                  label: 'Remove',
                  tone: 'wash',
                  onPress: () => {
                    void removeEnrollment(klass.id, student.id)
                      .then(() => load())
                      .catch((err) => setError(err instanceof Error ? err.message : 'Could not remove student'));
                  },
                },
              ]}
            />
          ))}
          <SectionHeader label="All students" />
          {availableStudents.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute }]}>
              Students from other classes at this school show up here. Swipe left to add.
            </Text>
          ) : null}
          {availableStudents.map((student) => (
            <ListRow
              key={student.id}
              title={student.display_name}
              photoUrl={student.photoUrl}
              hasPhoto={Boolean(student.photo_asset_id)}
              onPress={() => router.push(`/class/${klass.id}/student/${student.id}`)}
              trailing={[
                {
                  key: 'add',
                  label: 'Add',
                  tone: 'brand',
                  onPress: () => void addStudent(student.id),
                },
              ]}
            />
          ))}
        </>
      ) : null}

      {pane === 'feed' ? <FeedPane classId={klass.id} scope="class" fill /> : null}

      <FormSheet
        visible={Boolean(picking)}
        title={picking ? `Add ${picking.display_name}'s children` : 'Add children'}
        onClose={() => {
          setPicking(null);
          setPickedKids([]);
        }}
      >
        <Text style={[type.body, { color: colors.mute }]}>
          This parent has more than one child. Choose who should join this class.
        </Text>
        {picking?.children.map((child) => {
          const checked = pickedKids.includes(child.id);
          return (
            <ListRow
              key={child.id}
              title={child.display_name}
              photoUrl={child.photoUrl}
              selected={checked}
              chevron={false}
              avatar={<CheckBox checked={checked} />}
              onPress={() =>
                setPickedKids((current) =>
                  current.includes(child.id) ? current.filter((item) => item !== child.id) : [...current, child.id],
                )
              }
            />
          );
        })}
        <PrimaryButton
          label={pickedKids.length ? `Add ${pickedKids.length}` : 'Add'}
          disabled={!pickedKids.length}
          onPress={() => {
            if (!picking) return;
            void addParent(picking, pickedKids);
          }}
        />
      </FormSheet>
    </Screen>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.check,
        {
          borderColor: checked ? colors.brand : colors.line,
          backgroundColor: checked ? colors.brand : colors.card,
        },
      ]}
    >
      {checked ? <Icon name="check" color={colors.brandInk} size={16} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lead: {
    ...type.body,
    marginTop: 8,
    marginBottom: 8,
  },
  mint: {
    gap: 12,
    marginBottom: 16,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
