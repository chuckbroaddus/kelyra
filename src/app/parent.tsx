import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { AvatarTray } from '@/components/ui/AvatarTray';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { EmailLink } from '@/components/ui/EmailLink';
import { FormSheet } from '@/components/ui/FormSheet';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { firstName } from '@/lib/format';
import {
  formatLessonStatus,
  formatPracticeStatus,
  loadParentProgressMine,
  type ParentChildProgress,
  type ParentProgress,
} from '@/lib/parents/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { isAlsoParent } from '@/lib/school/roles';
import { touchParentLastSeen } from '@/lib/parents/session';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { parseBirthdayInput, STUDENT_DETAIL_FIELDS, metaString, setMetaKey } from '@/lib/people/metadata';
import { getStudent, renameStudent, updateStudentMetadata } from '@/lib/students/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ParentScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const { profile } = useAuth();
  const [progress, setProgress] = useState<ParentProgress | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const canEditChildren = Boolean(profile?.id && isAlsoParent(profile));
  const signedInParent = isAlsoParent(profile);
  const refreshChrome = chrome.refreshChrome;
  usePushedTitle(progress?.parentName ?? 'Home');

  useFocusEffect(
    useCallback(() => {
      void touchParentLastSeen();
      if (signedInParent) {
        void loadParentProgressMine()
          .then((next) => {
            if (!next) {
              setStatus('No children are linked to this login yet.');
              return;
            }
            setProgress(next);
            setActiveChildId((current) => current ?? next.children[0]?.student_id ?? null);
            refreshChrome();
          })
          .catch((err) => {
            setStatus(err instanceof Error ? err.message : 'Could not load your children');
          });
        return;
      }
      setStatus('Sign in with the parent login the school assigned.');
    }, [signedInParent, refreshChrome]),
  );

  if (!progress) {
    return (
      <Screen centered maxWidth={480}>
        <Text style={[type.title, { color: colors.ink }]}>Progress</Text>
        <Text style={[styles.lead, { color: colors.mute }]}>{status ?? 'Loading…'}</Text>
      </Screen>
    );
  }

  const child =
    progress.children.find((item) => item.student_id === activeChildId) ?? progress.children[0] ?? null;

  return (
    <Screen centered maxWidth={480}>
      <Avatar name={progress.parentName} photoUrl={progress.parentPhotoUrl} size={72} />
      <MarqueeText
        text={progress.parentName}
        align="center"
        accessible
        fadeColor={colors.bg}
        style={[styles.parentName, { color: colors.ink }]}
      />
      {progress.children.length > 1 ? (
        <AvatarTray
          people={progress.children.map((item) => ({
            id: item.student_id,
            name: item.preferred_name || item.display_name,
            photoUrl: item.photoUrl,
          }))}
          onPress={(person) => setActiveChildId(person.id)}
        />
      ) : null}
      {child ? (
        <ChildCard
          child={child}
          canEdit={canEditChildren}
          onSaved={() => {
            if (isAlsoParent(profile)) {
              void loadParentProgressMine().then((next) => {
                if (next) setProgress(next);
              });
            }
          }}
        />
      ) : (
        <Text style={[styles.empty, { color: colors.mute }]}>No children are linked yet.</Text>
      )}
      {progress.phone || progress.email || progress.address || progress.preferredContact ? (
        <View style={styles.block}>
          <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Your contact</Text>
          {progress.relationship ? <Text style={[type.meta, { color: colors.mute }]}>{progress.relationship}</Text> : null}
          {progress.phone ? <Text style={[type.body, { color: colors.ink }]}>{progress.phone}</Text> : null}
          {progress.email ? <EmailLink email={progress.email} /> : null}
          {progress.address ? <Text style={[type.body, { color: colors.ink }]}>{progress.address}</Text> : null}
          {progress.preferredContact ? (
            <Text style={[type.meta, { color: colors.mute }]}>Prefers {progress.preferredContact}</Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function ChildCard({
  child,
  canEdit,
  onSaved,
}: {
  child: ParentChildProgress;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownName = child.preferred_name || child.display_name;
  const childFirst = firstName(shownName);
  const practice = formatPracticeStatus(child.practice_status);
  const lesson = formatLessonStatus(child.lesson_status);
  const empty = !child.focus_label && !child.parent_sentence && !child.practice_status && !child.lesson_status;
  const practiceColor =
    practice === 'Graded' ? colors.good : practice === 'None yet' ? colors.mute : colors.warn;

  const openEdit = async () => {
    setError(null);
    try {
      const student = await getStudent(child.student_id);
      const next: Record<string, string> = { display_name: student.display_name };
      for (const field of STUDENT_DETAIL_FIELDS) {
        next[field.key] = metaString(student.metadata, field.key) ?? '';
      }
      setDraft(next);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load child details');
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const student = await getStudent(child.student_id);
      const nextName = (draft.display_name ?? '').replace(/\s+/g, ' ').trim();
      if (nextName && nextName !== student.display_name) {
        await renameStudent(student.id, nextName, student.display_name);
      }
      let metadata = { ...student.metadata };
      for (const field of STUDENT_DETAIL_FIELDS) {
        const raw = draft[field.key] ?? '';
        metadata = setMetaKey(metadata, field.key, field.key === 'birthday' ? parseBirthdayInput(raw) ?? raw : raw);
      }
      await updateStudentMetadata(student, metadata);
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save child details');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.child}>
      <Avatar name={shownName} photoUrl={child.photoUrl} size={56} />
      <Text style={[styles.kicker, { color: colors.mute }]} numberOfLines={1}>
        {child.class_name}
      </Text>
      <MarqueeText
        text={shownName}
        align="center"
        accessible
        fadeColor={colors.bg}
        style={[styles.name, { color: colors.ink }]}
      />
      {child.birthday_md ? (
        <Text style={[type.meta, { color: colors.mute, textAlign: 'center' }]}>{child.birthday_md}</Text>
      ) : null}
      {empty ? (
        <Text style={[styles.empty, { color: colors.mute }]}>Your teacher has not shared an update yet.</Text>
      ) : (
        <>
          <Text style={[styles.leadCenter, { color: colors.mute }]}>This week {childFirst} is working on</Text>
          <Text style={[type.title, { textAlign: 'center', color: colors.ink }]}>
            {child.focus_label ?? 'a skill the teacher will name soon'}
          </Text>
          <View style={styles.block}>
            <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Practice</Text>
            <Text style={[type.body, { fontWeight: '600', color: practiceColor }]}>{practice}</Text>
          </View>
          {lesson !== 'None yet' ? (
            <View style={styles.block}>
              <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Lesson</Text>
              <Text
                style={[
                  type.body,
                  {
                    fontWeight: '600',
                    color: lesson === 'Graded' ? colors.good : lesson === 'None yet' ? colors.mute : colors.warn,
                  },
                ]}
              >
                {lesson}
              </Text>
            </View>
          ) : null}
          {child.parent_sentence ? (
            <View style={styles.block}>
              <Card>
                <Text style={[type.meta, { color: colors.mute }]}>From the teacher</Text>
                <Text style={[type.body, { color: colors.ink }]}>{child.parent_sentence}</Text>
              </Card>
            </View>
          ) : null}
        </>
      )}
      {canEdit ? <GhostButton label="Edit details" onPress={() => void openEdit()} /> : null}
      {error && !open ? <Text style={[styles.empty, { color: colors.danger }]}>{error}</Text> : null}
      <FormSheet visible={open} title={`Edit ${shownName}`} onClose={() => setOpen(false)}>
        <TextField
          label="Name"
          value={draft.display_name ?? ''}
          onChangeText={(value) => setDraft((current) => ({ ...current, display_name: value }))}
        />
        {STUDENT_DETAIL_FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            value={draft[field.key] ?? ''}
            multiline={field.key === 'address' || field.key === 'allergies' || field.key === 'notes'}
            onChangeText={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
          />
        ))}
        {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={() => void save()} />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  parentName: {
    ...type.meta,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  child: {
    width: '100%',
    alignItems: 'center',
  },
  kicker: {
    ...type.meta,
    textAlign: 'center',
    marginTop: 12,
  },
  name: {
    ...type.display,
    textAlign: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  empty: {
    ...type.body,
    textAlign: 'center',
    marginTop: 16,
  },
  lead: {
    ...type.body,
    marginTop: 8,
    textAlign: 'center',
  },
  leadCenter: {
    ...type.meta,
    textAlign: 'center',
    marginTop: 24,
  },
  block: {
    marginTop: 24,
    width: '100%',
    gap: 8,
  },
});
