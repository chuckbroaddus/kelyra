import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { officeClassPersonTabs } from '@/components/ui/ClassTabs';
import { FeedPane } from '@/components/ui/FeedPane';
import { ClassAvatarRow } from '@/components/ui/ClassAvatarRow';
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
  const tabs = officeClassPersonTabs(feedIcon);
  const pane = tabs.some((item) => item.key === tab) ? tab : 'teacher';

  // Stable FlushBody + Feed host (same as office home): no scroll/avoidKeyboard toggle,
  // Feed host stays mounted so PersonTabs rowWidth does not jump on first-tab morph.
  return (
    <Screen keyboard maxWidth={640} scroll={false} avoidKeyboard={false}>
      <View style={styles.officeColumn}>
      <Text style={[type.display, { color: colors.ink }]}>{klass.name}</Text>
      <PersonTabs tabs={tabs} value={pane} onChange={setTab} />
      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}

      <View
        style={pane === 'feed' ? styles.feedOn : styles.feedOff}
        pointerEvents={pane === 'feed' ? 'auto' : 'none'}
        accessibilityElementsHidden={pane !== 'feed'}
        importantForAccessibility={pane === 'feed' ? 'yes' : 'no-hide-descendants'}
      >
        <FeedPane classId={klass.id} scope="class" fill />
      </View>

      {pane !== 'feed' ? (
        <ScrollView
          style={[
            styles.paneScroll,
            Platform.OS === 'web' ? ({ scrollbarGutter: 'stable' } as object) : null,
          ]}
          contentContainerStyle={styles.paneScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
      {pane === 'teacher' ? (
        <>
          <ClassAvatarRow klass={klass} onChange={setKlass} onError={setError} quiet />
          <FeedIconRow
            hint={false}
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
            <Text style={[type.meta, { color: colors.mute }]}>No teacher yet.</Text>
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
          {availableTeachers.length ? <SectionHeader label="All teachers" /> : null}
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
          {availableParents.length ? <SectionHeader label="All parents" /> : null}
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
          {availableStudents.length ? <SectionHeader label="All students" /> : null}
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

        </ScrollView>
      ) : null}
      </View>

      <FormSheet
        visible={Boolean(picking)}
        title={picking ? `Add ${picking.display_name}'s children` : 'Add children'}
        onClose={() => {
          setPicking(null);
          setPickedKids([]);
        }}
      >
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
  officeColumn: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
  },
  feedOn: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  feedOff: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
    width: '100%',
  },
  paneScroll: {
    flex: 1,
    width: '100%',
    minWidth: 0,
  },
  paneScrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: '100%',
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
