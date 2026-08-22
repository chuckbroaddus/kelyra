import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DevicePicker } from '@/components/DevicePicker';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { AvatarTray } from '@/components/ui/AvatarTray';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { ClassTabs } from '@/components/ui/ClassTabs';
import { FeedIconRow } from '@/components/ui/FeedIconPicker';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { radius, type } from '@/constants/theme';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getClass, setActiveClass } from '@/lib/classes/api';
import { setClassFeedIcon } from '@/lib/feeds/api';
import { asFeedIcon, DEFAULT_CLASS_FEED_ICON } from '@/lib/feeds/icons';
import { deleteClass } from '@/lib/classes/delete';
import { invokeAi } from '@/lib/ai/invoke';
import {
  existingRosterMatch,
  interpretSpokenStudentName,
  namesAreEquivalent,
} from '@/lib/matching/spokenName';
import { getPreferredDeviceId, setPreferredDeviceId } from '@/lib/media/devices';
import { normalizePhoto } from '@/lib/media/photo';
import { pickNormalizedPhoto, webCameraNeeded } from '@/lib/media/pickPhoto';
import { startLiveRecording, type LiveRecording } from '@/lib/media/recorder';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import {
  addConfirmedStudents,
  addTypedStudent,
  createRosterImport,
  deleteRosterImport,
  listPendingRosterImports,
  enrollExistingStudent,
  listAvailableStudents,
  listRoster,
  markRosterImportConfirmed,
  renameStudent,
  suggestRosterFromPhoto,
  type RosterStudent,
  type SuggestedRosterName,
} from '@/lib/students/api';
import type { StudentRow } from '@/lib/supabase/types';
import { deleteStudent, removeEnrollment } from '@/lib/students/delete';
import { firstName } from '@/lib/format';
import type { RosterImportRow } from '@/lib/supabase/types';
import type { ClassRow } from '@/lib/supabase/types';
import { useFocusEffect } from 'expo-router';

export default function SetupScreen() {
  const { colors } = useTheme();
  const layout = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { teacher } = useAuth();
  const chrome = useChrome();
  const [klass, setKlass] = useState<ClassRow | null>(null);
  usePushedTitle(klass?.name ?? 'Class');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [available, setAvailable] = useState<Array<StudentRow & { photoUrl: string | null }>>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [readingList, setReadingList] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedRosterName[]>([]);
  const [recording, setRecording] = useState<LiveRecording | null>(null);
  const [micId, setMicId] = useState<string | null>(null);
  const [deviceTick, setDeviceTick] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [hearing, setHearing] = useState(false);
  const [possibleMatch, setPossibleMatch] = useState<{
    studentId: string;
    displayName: string;
    exact: boolean;
  } | null>(null);
  const [imports, setImports] = useState<RosterImportRow[]>([]);
  const [confirm, setConfirm] = useState<
    | { kind: 'class' }
    | { kind: 'student'; student: RosterStudent }
    | { kind: 'remove'; student: RosterStudent; other: string }
    | { kind: 'import'; row: RosterImportRow }
    | { kind: 'suggestions' }
    | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [parkedAssetId, setParkedAssetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !teacher) return;
    try {
      const nextClass = await getClass(id);
      setKlass(nextClass);
      setRoster(await listRoster(id));
      setAvailable(await listAvailableStudents(id));
      setImports(await listPendingRosterImports(id));
      await setActiveClass(teacher.id, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load class');
    }
  }, [id, teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void getPreferredDeviceId('audio').then(setMicId);
    }, [load]),
  );

  const startNameRecording = async () => {
    if (hearing) return;
    setStatus(null);
    setError(null);
    setHeard(null);
    setPossibleMatch(null);
    try {
      setRecording(await startLiveRecording(micId));
      setDeviceTick((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the microphone.');
    }
  };

  const stopNameRecording = async () => {
    if (!recording || !id || !teacher || hearing) return;
    setHearing(true);
    setStatus('Hearing and understanding the name…');
    try {
      const captured = await recording.stop();
      setRecording(null);
      const asset = await uploadTeacherAsset({
        teacherId: teacher.id,
        kind: 'audio',
        uri: captured.uri,
        mimeType: captured.mimeType,
      });
      const audioUrl = await signedUrlForAsset('audio', asset.storage_path);
      if (!audioUrl) throw new Error('Could not open that recording.');
      const { text } = await invokeAi<{ text?: string }>('transcribe-audio', {
        audioUrl,
        keyterms: roster.map((student) => student.display_name.split(/\s+/)[0]).filter(Boolean),
      });
      const spoken = (text ?? '').trim();
      setHeard(spoken || null);
      const extracted = await interpretSpokenStudentName(spoken);
      if (!extracted) {
        setName('');
        setPossibleMatch(null);
        setStatus('I heard you, but no student name was clear. Say the name again or type it.');
        return;
      }
      setName(extracted);
      const existing = existingRosterMatch(
        extracted,
        roster.map((student) => ({
          studentId: student.id,
          displayName: student.display_name,
          aliases: student.name_aliases,
        })),
      );
      setPossibleMatch(existing);
      setStatus(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not hear that name');
    } finally {
      setRecording(null);
      setHearing(false);
    }
  };

  const onRenameMatch = async () => {
    if (!possibleMatch || !name.trim()) return;
    setStatus(null);
    setError(null);
    try {
      await renameStudent(possibleMatch.studentId, name, possibleMatch.displayName);
      setRoster(await listRoster(id!));
      setPossibleMatch(null);
      setHeard(null);
      setName('');
      setStatus(`Updated ${possibleMatch.displayName} to ${name.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that name');
    }
  };

  const onAdd = async () => {
    if (!id || !teacher) return;
    setStatus(null);
    setError(null);
    try {
      const student = await addTypedStudent(id, teacher.id, name);
      setRoster((current) => [...current, student]);
      setName('');
      setHeard(null);
      setPossibleMatch(null);
      const login = student.login;
      setStatus(
        login?.created && login.tempPassword
          ? `${student.display_name} is on the roster as @${login.username}. Temporary password ${login.tempPassword} — they must change it on first sign-in.`
          : `${student.display_name} is on the roster.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add student');
    }
  };

  const readListPhoto = async (uri: string, mimeType: string) => {
    if (!id || !teacher) return;
    setReadingList(true);
    setError(null);
    setStatus('Reading names from the list…');
    try {
      const prepared = await normalizePhoto(uri, mimeType);
      const asset = await uploadTeacherAsset({
        teacherId: teacher.id,
        kind: 'photo',
        uri: prepared.uri,
        mimeType: prepared.mimeType,
      });
      const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
      if (!imageUrl) throw new Error('Could not open that photo.');
      const next = await suggestRosterFromPhoto(
        imageUrl,
        roster.map((student) => student.display_name),
      );
      setSuggestions(next);
      const parked = await createRosterImport({
        classId: id,
        photoAssetId: asset.id,
        suggestions: next.map((row) => ({
          name: row.name,
          selected: row.selected,
          already_enrolled: row.alreadyHere,
        })),
      });
      setParkedAssetId(asset.id);
      setImports((current) => [parked, ...current.filter((row) => row.id !== parked.id)]);
      setStatus(
        next.length
          ? 'Confirm every name. Nothing is added until you tap Add.'
          : 'No student names found. Try a clearer photo or type names below.',
      );
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not read that list');
    } finally {
      setReadingList(false);
    }
  };

  const onPickList = async (fromCamera: boolean) => {
    setStatus(null);
    setError(null);
    if (webCameraNeeded(fromCamera)) {
      setCameraOpen(true);
      return;
    }
    try {
      const photo = await pickNormalizedPhoto(fromCamera);
      if (!photo) return;
      await readListPhoto(photo.uri, photo.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that photo');
    }
  };

  const onAddFromPhoto = async () => {
    if (!id || !teacher) return;
    const selected = suggestions.filter((row) => row.selected && !row.alreadyHere && row.name.trim());
    if (!selected.length) {
      setError('Check at least one new name.');
      return;
    }
    setStatus(null);
    setError(null);
    try {
      const result = await addConfirmedStudents({
        classId: id,
        teacherId: teacher.id,
        names: selected.map((row) => row.name),
        createdVia: 'photo_list',
      });
      setRoster(await listRoster(id));
      if (imports[0]) await markRosterImportConfirmed(imports[0].id);
      setSuggestions([]);
      setParkedAssetId(null);
      setImports(await listPendingRosterImports(id));
      setName('');
      const extra = result.skipped.length ? ` Skipped already on roster: ${result.skipped.join(', ')}.` : '';
      const logins = result.added
        .map((row) => row.login)
        .filter((row): row is NonNullable<typeof row> => Boolean(row?.created && row.tempPassword))
        .map((row) => `@${row.username} ${row.tempPassword}`)
        .join(' · ');
      setStatus(
        `Added ${result.added.length} student${result.added.length === 1 ? '' : 's'}.${extra}${
          logins ? ` Logins: ${logins}. They must change the password on first sign-in.` : ''
        }`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add those students');
    }
  };

  const selectedCount = suggestions.filter((row) => row.selected && !row.alreadyHere && row.name.trim()).length;
  const exactMatch = Boolean(possibleMatch && namesAreEquivalent(possibleMatch.displayName, name));

  const addCard = (
    <View>
      <SectionHeader label="Add students" first />
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        Speak a name, photograph the printed list, or type. Confirm every name.
      </Text>
      {cameraOpen ? (
        <WebCameraCapture
          onCapture={(uri, mimeType) => {
            setCameraOpen(false);
            void readListPhoto(uri, mimeType);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      ) : (
        <Card>
          {suggestions.length ? (
            <>
              <Text style={[type.meta, { color: colors.mute }]}>Confirm every name. Nothing is added until you tap Add.</Text>
              {suggestions.map((row) => (
                <View key={row.key} style={styles.suggestRow}>
                  <Pressable
                    disabled={row.alreadyHere}
                    style={[
                      styles.check,
                      { borderColor: colors.line },
                      row.selected && !row.alreadyHere ? { backgroundColor: colors.brandSoft, borderColor: colors.brand } : null,
                    ]}
                    onPress={() =>
                      setSuggestions((current) =>
                        current.map((item) =>
                          item.key === row.key ? { ...item, selected: !item.selected } : item,
                        ),
                      )
                    }
                  >
                    <Text style={[styles.checkText, { color: colors.ink }]}>{row.alreadyHere ? '—' : row.selected ? '✓' : ''}</Text>
                  </Pressable>
                  <View style={styles.suggestField}>
                    <TextField
                      value={row.name}
                      editable={!row.alreadyHere}
                      onChangeText={(value) =>
                        setSuggestions((current) =>
                          current.map((item) => (item.key === row.key ? { ...item, name: value } : item)),
                        )
                      }
                    />
                  </View>
                  {row.alreadyHere ? <Text style={[type.meta, { color: colors.mute }]}>already here</Text> : null}
                </View>
              ))}
              <PrimaryButton
                disabled={readingList}
                label={`Add ${selectedCount} student${selectedCount === 1 ? '' : 's'}`}
                onPress={() => void onAddFromPhoto()}
              />
              <GhostButton align="left" label="Cancel list" onPress={() => setSuggestions([])} />
            </>
          ) : (
            <>
              <View style={styles.mediaHits}>
                <IconButton
                  name="capture"
                  label="Photo of list"
                  disabled={readingList}
                  onPress={() => void onPickList(true)}
                />
              </View>
              <GhostButton
                align="left"
                disabled={readingList}
                label="Choose list photo"
                onPress={() => void onPickList(false)}
              />
              <DevicePicker
                kind="audio"
                selectedId={micId}
                nonce={deviceTick}
                onSelect={(deviceId) => {
                  setMicId(deviceId);
                  void setPreferredDeviceId('audio', deviceId);
                }}
              />
              {readingList ? <WorkingLine text="Asking AI…" /> : null}
              {hearing ? (
                <WorkingLine text="Hearing the name…" />
              ) : (
                <IconButton
                  name="mic"
                  tone={recording ? 'danger' : 'wash'}
                  live={Boolean(recording)}
                  label={recording ? 'Stop recording' : 'Record a name'}
                  onPress={() => void (recording ? stopNameRecording() : startNameRecording())}
                />
              )}
              {heard ? <Text style={[type.meta, { color: colors.mute }]}>Heard: {heard}</Text> : null}
              {exactMatch ? (
                <Text style={[type.body, { color: colors.mute }]}>
                  {possibleMatch?.displayName} is already on this roster.
                </Text>
              ) : possibleMatch ? (
                <Text style={[type.body, { color: colors.mute }]}>
                  That sounds like {possibleMatch.displayName}. Update their name, or add a new student if
                  this is someone else.
                </Text>
              ) : null}
              <TextField placeholder="First and last name" value={name} onChangeText={setName} />
              {!exactMatch && possibleMatch ? (
                <PrimaryButton
                  label={`Rename ${possibleMatch.displayName} to ${name.trim() || 'this name'}`}
                  onPress={() => void onRenameMatch()}
                />
              ) : null}
              {!exactMatch ? (
                possibleMatch ? (
                  <SecondaryButton
                    label={name.trim() ? `Add ${name.trim()} as a new student` : 'Add student'}
                    onPress={() => void onAdd()}
                  />
                ) : (
                  <PrimaryButton
                    label={name.trim() ? `Add ${name.trim()}` : 'Add student'}
                    onPress={() => void onAdd()}
                  />
                )
              ) : null}
            </>
          )}
        </Card>
      )}
    </View>
  );

  const rosterBlock = (
    <View>
      <SectionHeader label="Students" />
      {roster.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>No students yet. A name is enough.</Text>
      ) : (
        <>
          <AvatarTray
            people={roster.map((student) => ({
              id: student.id,
              name: student.display_name,
              photoUrl: student.photoUrl,
              hasPhoto: Boolean(student.photo_asset_id),
            }))}
            onPress={(person) => router.push(`/class/${id}/student/${person.id}`)}
          />
          {roster.map((student) => (
            <ListRow
              key={student.id}
              title={student.display_name}
              photoUrl={student.photoUrl}
              hasPhoto={Boolean(student.photo_asset_id)}
              onPress={() => router.push(`/class/${id}/student/${student.id}`)}
              trailing={[
                {
                  key: 'remove',
                  label: 'Remove',
                  tone: 'wash',
                  onPress: () => {
                    if (!id) return;
                    void removeEnrollment(id, student.id)
                      .then(() => load())
                      .catch((err) => setError(err instanceof Error ? err.message : 'Could not remove student'));
                  },
                },
              ]}
            />
          ))}
        </>
      )}
      <SectionHeader label="All students" />
      {available.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          Students from other classes at this school show up here. Swipe left to add.
        </Text>
      ) : null}
      {available.map((student) => (
        <ListRow
          key={student.id}
          title={student.display_name}
          photoUrl={student.photoUrl}
          hasPhoto={Boolean(student.photo_asset_id)}
          onPress={() => router.push(`/class/${id}/student/${student.id}`)}
          trailing={[
            {
              key: 'add',
              label: 'Add',
              tone: 'brand',
              onPress: () => {
                if (!id) return;
                void enrollExistingStudent(id, student.id)
                  .then(() => load())
                  .catch((err) => setError(err instanceof Error ? err.message : 'Could not add student'));
              },
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <Screen keyboard>
      {id ? <ClassTabs classId={id} /> : null}
      {klass ? (
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
      ) : null}
      {layout.isSplit ? (
        <View style={styles.split}>
          <View style={styles.col}>{addCard}</View>
          <View style={styles.col}>{rosterBlock}</View>
        </View>
      ) : (
        <>
          {addCard}
          {rosterBlock}
        </>
      )}

      {imports[0] && !suggestions.length ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>
            {imports[0].suggestions.length} names waiting
          </Text>
          <GhostButton
            align="left"
            label="Open"
            onPress={() => {
              setSuggestions(
                imports[0]!.suggestions.map((row) => ({
                  key: row.name.toLowerCase(),
                  name: row.name,
                  selected: row.selected !== false && !row.already_enrolled,
                  alreadyHere: Boolean(row.already_enrolled),
                })),
              );
            }}
          />
          <GhostButton align="left" label="Delete" onPress={() => setConfirm({ kind: 'import', row: imports[0]! })} />
        </Card>
      ) : null}

      {suggestions.length ? (
        <GhostButton align="left" label="Delete" onPress={() => setConfirm({ kind: 'suggestions' })} />
      ) : null}

      {klass ? (
        <GhostButton align="left" label="Delete class" onPress={() => setConfirm({ kind: 'class' })} />
      ) : null}

      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PhaseBanner
        phase={1}
        detail={
          klass
            ? `${klass.name} is the subject context AI will use. A name like “Room 14 math” is enough.`
            : 'Name the class so AI knows the subject. Then add students.'
        }
      />

      <ConfirmSheet
        visible={Boolean(confirm)}
        title={
          confirm?.kind === 'class'
            ? `Delete ${klass?.name ?? 'class'}?`
            : confirm?.kind === 'student'
              ? `Delete ${confirm.student.display_name}?`
              : confirm?.kind === 'remove'
                ? `Remove ${firstName(confirm.student.display_name)} from ${klass?.name ?? 'class'}?`
                : confirm?.kind === 'import' || confirm?.kind === 'suggestions'
                  ? 'Throw away this list?'
                  : ''
        }
        body={
          confirm?.kind === 'class'
            ? 'This deletes the class, its homework, practice, and grade book. Students who are only in this class will be deleted. Students who are also in another class will stay on those rosters. This cannot be undone.'
            : confirm?.kind === 'student'
              ? `This deletes ${firstName(confirm.student.display_name)} from every class, including their work, grades, parent links, and photo. This cannot be undone.`
              : confirm?.kind === 'remove'
                ? `Their work in this class will be deleted. They will stay in ${confirm.other}. This cannot be undone.`
                : 'No students will be added. This cannot be undone.'
        }
        confirmLabel={
          confirm?.kind === 'class'
            ? `Delete ${klass?.name ?? 'class'}`
            : confirm?.kind === 'student'
              ? `Delete ${firstName(confirm.student.display_name)}`
              : confirm?.kind === 'remove'
                ? 'Remove'
                : 'Delete'
        }
        typeName={
          confirm?.kind === 'class' ? klass?.name : confirm?.kind === 'student' ? confirm.student.display_name : undefined
        }
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          setBusy(true);
          void (async () => {
            if (confirm.kind === 'class' && klass) {
              await deleteClass(klass.id);
              setConfirm(null);
              router.replace('/?switch=1');
              return;
            }
            if (confirm.kind === 'student') await deleteStudent(confirm.student.id);
            if (confirm.kind === 'remove' && id) await removeEnrollment(id, confirm.student.id);
            if (confirm.kind === 'import') await deleteRosterImport(confirm.row.id);
            if (confirm.kind === 'suggestions') {
              if (imports[0]) await deleteRosterImport(imports[0].id);
              setSuggestions([]);
              setParkedAssetId(null);
            }
            setConfirm(null);
            await load();
          })()
            .catch((err) => {
              setError(err instanceof Error ? err.message : 'Could not delete');
            })
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: type.body,
  mediaHits: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestField: {
    flex: 1,
    minWidth: 0,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontWeight: '700',
  },
  split: {
    flexDirection: 'row',
    gap: 24,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  error: {
    ...type.body,
    marginTop: 8,
  },
});
