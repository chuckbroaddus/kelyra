import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DevicePicker } from '@/components/DevicePicker';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { colors, theme } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getClass, setActiveClass } from '@/lib/classes/api';
import { loadClassOverview, type ClassOverview } from '@/lib/classes/overview';
import { invokeAi } from '@/lib/ai/invoke';
import {
  existingRosterMatch,
  interpretSpokenStudentName,
  namesAreEquivalent,
} from '@/lib/matching/spokenName';
import { pickNormalizedPhoto, webCameraNeeded } from '@/lib/media/pickPhoto';
import { normalizePhoto } from '@/lib/media/photo';
import { getPreferredDeviceId, setPreferredDeviceId } from '@/lib/media/devices';
import { startLiveRecording, type LiveRecording } from '@/lib/media/recorder';
import { signedUrlForAsset, uploadTeacherAsset } from '@/lib/media/upload';
import { buildFamilyDigest, shareFamilyDigest } from '@/lib/parents/digest';
import {
  addConfirmedStudents,
  addTypedStudent,
  listRoster,
  renameStudent,
  suggestRosterFromPhoto,
  type RosterStudent,
  type SuggestedRosterName,
} from '@/lib/students/api';
import type { ClassRow } from '@/lib/supabase/types';
import { useFocusEffect } from 'expo-router';

export default function ClassHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teacher } = useAuth();
  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
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

  const load = useCallback(async () => {
    if (!id || !teacher) return;
    try {
      const nextClass = await getClass(id);
      setKlass(nextClass);
      setRoster(await listRoster(id));
      setOverview(await loadClassOverview(id));
      await setActiveClass(teacher.id, id);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load class');
    }
  }, [id, teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void getPreferredDeviceId('audio').then(setMicId);
    }, [load]),
  );

  const onCopyDigest = async () => {
    if (!id || !klass) return;
    setStatus(null);
    try {
      const text = await buildFamilyDigest(id, klass.name);
      const result = await shareFamilyDigest(text);
      setStatus(result === 'copied' ? 'Family update copied.' : 'Family update shared.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not copy update');
    }
  };

  const startNameRecording = async () => {
    if (hearing) return;
    setStatus(null);
    setHeard(null);
    setPossibleMatch(null);
    try {
      setRecording(await startLiveRecording(micId));
      setDeviceTick((value) => value + 1);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not start the microphone.');
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
      setStatus(err instanceof Error ? err.message : 'Could not hear that name');
    } finally {
      setRecording(null);
      setHearing(false);
    }
  };

  const onRenameMatch = async () => {
    if (!possibleMatch || !name.trim()) return;
    setStatus(null);
    try {
      await renameStudent(possibleMatch.studentId, name, possibleMatch.displayName);
      setRoster(await listRoster(id!));
      setPossibleMatch(null);
      setHeard(null);
      setName('');
      setStatus(`Updated ${possibleMatch.displayName} to ${name.trim()}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not update that name');
    }
  };

  const onAdd = async () => {
    if (!id || !teacher) return;
    setStatus(null);
    try {
      const student = await addTypedStudent(id, teacher.id, name);
      setRoster((current) => [...current, student]);
      setName('');
      setHeard(null);
      setPossibleMatch(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not add student');
    }
  };

  const readListPhoto = async (uri: string, mimeType: string) => {
    if (!id || !teacher) return;
    setReadingList(true);
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
      setStatus(
        next.length
          ? 'Uncheck anything that is not a student. Edit a name if Grok misread it.'
          : 'Grok did not find student names. Try a clearer photo or type names below.',
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not read that list');
    } finally {
      setReadingList(false);
    }
  };

  const onPickList = async (fromCamera: boolean) => {
    setStatus(null);
    if (webCameraNeeded(fromCamera)) {
      setCameraOpen(true);
      return;
    }
    try {
      const photo = await pickNormalizedPhoto(fromCamera);
      if (!photo) return;
      await readListPhoto(photo.uri, photo.mimeType);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not open that photo');
    }
  };

  const onAddFromPhoto = async () => {
    if (!id || !teacher) return;
    const selected = suggestions.filter((row) => row.selected && !row.alreadyHere && row.name.trim());
    if (!selected.length) {
      setStatus('Check at least one new name.');
      return;
    }
    setStatus(null);
    try {
      const result = await addConfirmedStudents({
        classId: id,
        teacherId: teacher.id,
        names: selected.map((row) => row.name),
        createdVia: 'photo_list',
      });
      setRoster(await listRoster(id));
      setSuggestions([]);
      setName('');
      const extra = result.skipped.length ? ` Skipped already on roster: ${result.skipped.join(', ')}.` : '';
      setStatus(`Added ${result.added.length} student${result.added.length === 1 ? '' : 's'}.${extra}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not add those students');
    }
  };

  const selectedCount = suggestions.filter((row) => row.selected && !row.alreadyHere && row.name.trim()).length;
  const exactMatch = Boolean(
    possibleMatch && namesAreEquivalent(possibleMatch.displayName, name),
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{klass?.name ?? 'Class'}</Text>
      {klass ? <Text style={styles.meta}>Join code {klass.join_code}</Text> : null}
      {overview ? (
        <View>
          <Text style={styles.section}>This week</Text>
          <Text style={styles.body}>
            Unassigned {overview.unassignedCount} · Drafts {overview.draftCount}
          </Text>
          {overview.commonGaps.length ? (
            <>
              <Text style={styles.meta}>Common gaps</Text>
              {overview.commonGaps.map((gap) => (
                <Text key={gap.label} style={styles.body}>
                  {gap.label} · {gap.count}
                </Text>
              ))}
            </>
          ) : null}
          {overview.focusStudents.length ? (
            <>
              <Text style={styles.meta}>Current focus</Text>
              {overview.focusStudents.map((row) => (
                <Link key={row.id} href={`/class/${id}/student/${row.id}`} style={styles.link}>
                  <Text style={styles.body}>
                    {row.displayName}: {row.focusLabel}
                  </Text>
                </Link>
              ))}
            </>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.section}>Roster</Text>
      {roster.length === 0 ? (
        <Text style={styles.body}>No students yet. A student can be only a name.</Text>
      ) : (
        roster.map((student) => (
          <Link key={student.id} href={`/class/${id}/student/${student.id}`} style={styles.link}>
            <Text style={styles.row}>{student.display_name}</Text>
          </Link>
        ))
      )}
      {cameraOpen ? (
        <WebCameraCapture
          onCapture={(uri, mimeType) => {
            setCameraOpen(false);
            void readListPhoto(uri, mimeType);
          }}
          onCancel={() => setCameraOpen(false)}
        />
      ) : suggestions.length ? (
        <View style={styles.card}>
          <Text style={styles.meta}>Confirm every name. Nothing is added until you tap Add.</Text>
          {suggestions.map((row) => (
            <View key={row.key} style={styles.suggestRow}>
              <Pressable
                disabled={row.alreadyHere}
                style={[styles.check, row.selected && !row.alreadyHere ? styles.checkOn : null]}
                onPress={() =>
                  setSuggestions((current) =>
                    current.map((item) =>
                      item.key === row.key ? { ...item, selected: !item.selected } : item,
                    ),
                  )
                }
              >
                <Text style={styles.checkText}>{row.alreadyHere ? '—' : row.selected ? '✓' : ''}</Text>
              </Pressable>
              <TextInput
                style={styles.suggestInput}
                value={row.name}
                editable={!row.alreadyHere}
                placeholderTextColor={colors.muted}
                onChangeText={(value) =>
                  setSuggestions((current) =>
                    current.map((item) => (item.key === row.key ? { ...item, name: value } : item)),
                  )
                }
              />
              {row.alreadyHere ? <Text style={styles.meta}>already here</Text> : null}
            </View>
          ))}
          <Pressable disabled={readingList} style={styles.button} onPress={() => void onAddFromPhoto()}>
            <Text style={styles.buttonText}>
              Add {selectedCount} student{selectedCount === 1 ? '' : 's'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => setSuggestions([])}>
            <Text style={styles.linkText}>Cancel list</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Pressable
            disabled={readingList}
            style={styles.secondary}
            onPress={() => void onPickList(true)}
          >
            <Text style={styles.linkText}>{readingList ? 'Reading list…' : 'Photo of list'}</Text>
          </Pressable>
          <Pressable
            disabled={readingList}
            style={styles.secondary}
            onPress={() => void onPickList(false)}
          >
            <Text style={styles.linkText}>Choose list photo</Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.section}>Or add one name</Text>
      <DevicePicker
        kind="audio"
        selectedId={micId}
        nonce={deviceTick}
        onSelect={(deviceId) => {
          setMicId(deviceId);
          void setPreferredDeviceId('audio', deviceId);
        }}
      />
      {hearing ? (
        <Pressable disabled style={styles.secondary}>
          <Text style={styles.linkText}>Hearing and understanding the name…</Text>
        </Pressable>
      ) : recording ? (
        <Pressable style={styles.danger} onPress={() => void stopNameRecording()}>
          <Text style={styles.buttonText}>Stop recording</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.secondary} onPress={() => void startNameRecording()}>
          <Text style={styles.linkText}>Record a name</Text>
        </Pressable>
      )}
      {heard ? <Text style={styles.meta}>Heard: {heard}</Text> : null}
      {exactMatch ? (
        <Text style={styles.body}>{possibleMatch?.displayName} is already on this roster.</Text>
      ) : possibleMatch ? (
        <Text style={styles.body}>
          That sounds like {possibleMatch.displayName}. Update their name, or add a new student if
          this is someone else.
        </Text>
      ) : null}
      <TextInput
        placeholder="First and last name"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={name}
        onChangeText={setName}
      />
      {!exactMatch && possibleMatch ? (
        <Pressable style={styles.button} onPress={() => void onRenameMatch()}>
          <Text style={styles.buttonText}>
            Rename {possibleMatch.displayName} to {name.trim() || 'this name'}
          </Text>
        </Pressable>
      ) : null}
      {!exactMatch ? (
        <Pressable
          style={possibleMatch ? styles.secondary : styles.button}
          onPress={() => void onAdd()}
        >
          <Text style={possibleMatch ? styles.linkText : styles.buttonText}>
            {name.trim()
              ? possibleMatch
                ? `Add ${name.trim()} as a new student`
                : `Add ${name.trim()}`
              : 'Add student'}
          </Text>
        </Pressable>
      ) : null}
      {status ? <Text style={styles.error}>{status}</Text> : null}
      <Link href="/capture" style={styles.link}>
        <Text style={styles.linkText}>Capture homework</Text>
      </Link>
      <Link href="/inbox" style={styles.link}>
        <Text style={styles.linkText}>Unassigned inbox</Text>
      </Link>
      <Link href={`/class/${id}/gradebook`} style={styles.link}>
        <Text style={styles.linkText}>Grade book</Text>
      </Link>
      <Pressable onPress={() => void onCopyDigest()}>
        <Text style={styles.linkText}>Copy family update</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: theme.scroll,
  title: theme.title,
  meta: theme.meta,
  section: {
    ...theme.section,
    marginTop: 8,
  },
  body: theme.body,
  row: {
    color: colors.text,
    fontSize: 17,
  },
  input: {
    ...theme.input,
    marginTop: 8,
  },
  button: theme.button,
  buttonText: theme.buttonText,
  danger: {
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondary: theme.secondary,
  card: {
    gap: 10,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.chipOn,
  },
  checkText: {
    color: colors.text,
    fontWeight: '700',
  },
  suggestInput: {
    ...theme.input,
    flex: 1,
    marginTop: 0,
  },
  error: theme.error,
  link: {
    paddingVertical: 4,
  },
  linkText: theme.linkText,
});
