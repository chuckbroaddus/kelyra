import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DevicePicker } from '@/components/DevicePicker';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { ClassTabs } from '@/components/ui/ClassTabs';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { radius, type } from '@/constants/theme';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { can } from '@/lib/school/matrix';
import { isOfficeRole } from '@/lib/school/roles';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getClass, setActiveClass } from '@/lib/classes/api';
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
import { Avatar } from '@/components/ui/Avatar';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { firstName } from '@/lib/format';
import { openMultiStudentFamilyThread, openStudentFamilyThread } from '@/lib/messages/api';
import {
  listLinkedParentsByStudentIds,
  type LinkedParentChip,
} from '@/lib/parents/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { RosterImportRow } from '@/lib/supabase/types';
import type { ClassRow } from '@/lib/supabase/types';
import { useFocusEffect } from 'expo-router';

export default function SetupScreen() {
  const { colors } = useTheme();
  const layout = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { teacher, profile, grants, setActiveClassId } = useAuth();
  const office = isOfficeRole(profile);
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
  const [messaging, setMessaging] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  /** student_id → profile id when known; null = lookup not finished yet */
  const [loginByStudentId, setLoginByStudentId] = useState<Record<string, string> | null>(null);
  /** student_id → linked parent chips (null = not loaded yet; shown under rows always once loaded) */
  const [parentsByStudentId, setParentsByStudentId] = useState<Record<string, LinkedParentChip[]> | null>(
    null,
  );
  /** CTA-adjacent send / login hint (not the buried bottom error) */
  const [sendHint, setSendHint] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!id || !teacher) return;
    try {
      const nextClass = await getClass(id);
      setKlass(nextClass);
      const nextRoster = await listRoster(id);
      setRoster(nextRoster);
      void listLinkedParentsByStudentIds(nextRoster.map((row) => row.id))
        .then((map) => setParentsByStudentId(map))
        .catch(() => setParentsByStudentId({}));
      if (office) {
        setAvailable(await listAvailableStudents(id));
        setImports(await listPendingRosterImports(id));
      } else {
        setAvailable([]);
        setImports([]);
      }
      await setActiveClass(teacher.id, id);
      setActiveClassId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load class');
    }
  }, [id, teacher, office, setActiveClassId]);

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
    if (!office) {
      setError('Only the office may add a new student.');
      return;
    }
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
    if (!office) {
      setError('Only the office may add a new student.');
      return;
    }
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

  const familyGate = useCallback(
    (studentId: string): 'ok' | 'needs_student_login' | 'needs_parents' | 'needs_parent_login' | 'unknown' => {
      if (loginByStudentId == null || parentsByStudentId == null) return 'unknown';
      if (!loginByStudentId[studentId]) return 'needs_student_login';
      const parents = parentsByStudentId[studentId] ?? [];
      if (!parents.length) return 'needs_parents';
      if (!parents.some((parent) => parent.hasLogin)) return 'needs_parent_login';
      return 'ok';
    },
    [loginByStudentId, parentsByStudentId],
  );

  const gateStatusLabel = (gate: ReturnType<typeof familyGate>): string | undefined => {
    if (gate === 'needs_student_login') return 'Needs login';
    if (gate === 'needs_parents') return 'Needs parents';
    if (gate === 'needs_parent_login') return 'Needs parent login';
    return undefined;
  };

  const selectableStudentIds = useMemo(() => {
    if (loginByStudentId == null || parentsByStudentId == null) {
      return roster.map((student) => student.id);
    }
    return roster.filter((student) => familyGate(student.id) === 'ok').map((student) => student.id);
  }, [roster, loginByStudentId, parentsByStudentId, familyGate]);

  const allSelected = useMemo(
    () =>
      selectableStudentIds.length > 0 &&
      selectableStudentIds.every((id) => picked.includes(id)),
    [selectableStudentIds, picked],
  );

  const hasBlockedRows = useMemo(
    () =>
      loginByStudentId != null &&
      parentsByStudentId != null &&
      roster.some((student) => familyGate(student.id) !== 'ok'),
    [roster, loginByStudentId, parentsByStudentId, familyGate],
  );

  const exitMessaging = () => {
    setMessaging(false);
    setPicked([]);
    setLoginByStudentId(null);
    setSendHint(null);
  };

  const loadMessagingMeta = (studentIds: string[]) => {
    setLoginByStudentId(null);
    setParentsByStudentId(null);
    if (!studentIds.length) {
      setLoginByStudentId({});
      setParentsByStudentId({});
      return;
    }
    void (async () => {
      const [{ data, error: queryError }, parentsMap] = await Promise.all([
        requireSupabase().from('profiles').select('id, student_id').in('student_id', studentIds),
        listLinkedParentsByStudentIds(studentIds).catch(() => {
          const empty: Record<string, LinkedParentChip[]> = {};
          for (const id of studentIds) empty[id] = [];
          return empty;
        }),
      ]);
      if (queryError) {
        setLoginByStudentId({});
      } else {
        const map: Record<string, string> = {};
        for (const row of data ?? []) {
          if (row.student_id) map[row.student_id] = row.id;
        }
        setLoginByStudentId(map);
      }
      setParentsByStudentId(parentsMap);
    })();
  };

  const enterMessaging = () => {
    setMessaging(true);
    setPicked([]);
    setSendHint(null);
    loadMessagingMeta(roster.map((student) => student.id));
  };

  const togglePick = (studentId: string) => {
    setSendHint(null);
    setPicked((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId],
    );
  };

  const toggleSelectAll = () => {
    setSendHint(null);
    setPicked(allSelected ? [] : selectableStudentIds);
  };

  // Select UX still caps picks; ≥2 eligible → one shared family_lock group (cap 12 members in SQL).
  const overCap = picked.length > 11;
  const blockedAmongPicked =
    loginByStudentId == null || parentsByStudentId == null
      ? 0
      : picked.filter((id) => familyGate(id) !== 'ok').length;
  const noneMessageable =
    loginByStudentId != null &&
    parentsByStudentId != null &&
    picked.length > 0 &&
    blockedAmongPicked === picked.length;

  const sendMessage = () => {
    if (!picked.length || overCap) return;
    setSendHint(null);
    void (async () => {
      // Refresh gates before open.
      const [{ data, error: queryError }, parentsMap] = await Promise.all([
        requireSupabase().from('profiles').select('id, student_id').in('student_id', picked),
        listLinkedParentsByStudentIds(picked),
      ]);
      if (queryError) {
        setSendHint(queryError.message || 'Could not look up student logins.');
        return;
      }
      const loginMap: Record<string, string> = {};
      for (const row of data ?? []) {
        if (row.student_id) loginMap[row.student_id] = row.id;
      }
      setLoginByStudentId((current) => ({ ...(current ?? {}), ...loginMap }));
      setParentsByStudentId((current) => ({ ...(current ?? {}), ...parentsMap }));

      const gateFor = (studentId: string) => {
        if (!loginMap[studentId]) return 'needs_student_login' as const;
        const parents = parentsMap[studentId] ?? [];
        if (!parents.length) return 'needs_parents' as const;
        if (!parents.some((parent) => parent.hasLogin)) return 'needs_parent_login' as const;
        return 'ok' as const;
      };

      const eligible = picked.filter((id) => gateFor(id) === 'ok');
      const skipped = picked.length - eligible.length;
      if (!eligible.length) {
        setSendHint(
          picked.length === 1
            ? 'That student needs a login and at least one parent login first.'
            : 'Those students need logins and at least one parent login each first.',
        );
        return;
      }

      let threadId: string;
      try {
        if (eligible.length === 1) {
          threadId = await openStudentFamilyThread(eligible[0]);
        } else {
          threadId = await openMultiStudentFamilyThread(eligible);
        }
      } catch (err) {
        setSendHint(err instanceof Error ? err.message : 'Could not open family chat');
        return;
      }

      const parts: string[] = [];
      if (eligible.length === 1) {
        parts.push('Opened 1 chat — parents included');
      } else {
        parts.push(
          `Opened 1 shared group with ${eligible.length} students — parents included`,
        );
      }
      if (skipped > 0) {
        parts.push(`${skipped} skipped (need student + at least one parent login)`);
      }
      setSendHint(parts.join(' · '));
      router.push(`/messages/${threadId}` as never);
    })().catch((err) =>
      setSendHint(err instanceof Error ? err.message : 'Could not start family chats'),
    );
  };

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
      <SectionHeader label="Students enrolled" first={!office || layout.isSplit} />
      {roster.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>
          {office
            ? 'No students yet. A name is enough.'
            : 'No students enrolled yet. The office manages the class roster.'}
        </Text>
      ) : null}
      {messaging && roster.length ? (
        <View style={styles.selectAllRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            accessibilityLabel="Select all students"
            onPress={toggleSelectAll}
            style={styles.selectAll}
          >
            <CheckBox checked={allSelected} />
            <Text style={[styles.selectAllLabel, { color: colors.mute }]}>Select all</Text>
          </Pressable>
          <GhostButton align="left" label="Cancel" onPress={exitMessaging} />
        </View>
      ) : null}
      {roster.map((student) => {
        const checked = picked.includes(student.id);
        const gate = messaging ? familyGate(student.id) : 'unknown';
        const gateKnown = messaging && loginByStudentId != null && parentsByStudentId != null;
        const parents = parentsByStudentId?.[student.id] ?? [];
        const statusLabel = messaging && gateKnown ? gateStatusLabel(gate) : undefined;
        const row = (
          <ListRow
            title={student.display_name}
            status={statusLabel}
            statusNode={parents.length ? <LinkedParents parents={parents} /> : undefined}
            photoUrl={student.photoUrl}
            hasPhoto={Boolean(student.photo_asset_id)}
            selected={messaging ? checked : false}
            chevron={!messaging}
            onPress={() => {
              if (messaging) {
                if (gateKnown && gate !== 'ok') {
                  setSendHint(
                    gate === 'needs_parents'
                      ? 'Link at least one parent before messaging this student.'
                      : gate === 'needs_parent_login'
                        ? 'At least one linked parent needs a login first.'
                        : 'That student needs a login first.',
                  );
                  return;
                }
                togglePick(student.id);
                return;
              }
              router.push(`/class/${id}/student/${student.id}`);
            }}
            trailing={
              messaging || !office
                ? undefined
                : [
                    {
                      key: 'remove',
                      label: 'Remove',
                      tone: 'wash' as const,
                      onPress: () => {
                        if (!id) return;
                        void removeEnrollment(id, student.id)
                          .then(() => load())
                          .catch((err) =>
                            setError(err instanceof Error ? err.message : 'Could not remove student'),
                          );
                      },
                    },
                  ]
            }
          />
        );
        if (!messaging) {
          return <View key={student.id}>{row}</View>;
        }
        return (
          <View
            key={student.id}
            style={[styles.selectRow, gateKnown && gate !== 'ok' ? { opacity: 0.55 } : null]}
          >
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: gateKnown && gate !== 'ok' }}
              accessibilityLabel={
                gateKnown && gate !== 'ok'
                  ? `${student.display_name}, ${statusLabel ?? 'not messageable'}`
                  : `Select ${student.display_name}`
              }
              disabled={gateKnown && gate !== 'ok'}
              onPress={() => {
                if (gateKnown && gate !== 'ok') {
                  setSendHint(
                    gate === 'needs_parents'
                      ? 'Link at least one parent before messaging this student.'
                      : gate === 'needs_parent_login'
                        ? 'At least one linked parent needs a login first.'
                        : 'That student needs a login first.',
                  );
                  return;
                }
                togglePick(student.id);
              }}
              style={styles.checkHit}
            >
              <CheckBox checked={checked} />
            </Pressable>
            <View style={styles.selectRowBody}>{row}</View>
          </View>
        );
      })}
      {roster.length ? (
        messaging ? (
          <View style={styles.footer}>
            {overCap ? (
              <Text style={[type.meta, { color: colors.mute }]}>
                Group chats stay small. Pick at most 11 students (shared group caps at 12 people total with parents).
              </Text>
            ) : null}
            {!overCap && blockedAmongPicked > 0 ? (
              <Text style={[type.meta, { color: colors.mute }]}>
                {blockedAmongPicked === picked.length
                  ? picked.length === 1
                    ? 'That student needs a login and at least one parent login first.'
                    : 'Those students need logins and at least one parent login each first.'
                  : `${blockedAmongPicked} of these need student + at least one parent login — send will open the rest`}
              </Text>
            ) : null}
            {!overCap && sendHint ? (
              <Text
                style={[
                  type.meta,
                  {
                    color:
                      sendHint.startsWith('Opened ') || sendHint.startsWith('Messaging ')
                        ? colors.mute
                        : colors.danger,
                  },
                ]}
              >
                {sendHint}
              </Text>
            ) : null}
            <PrimaryButton
              label={
                picked.length
                  ? `Message ${picked.length} student${picked.length === 1 ? '' : 's'}`
                  : 'Message these students'
              }
              disabled={!picked.length || overCap || noneMessageable}
              onPress={sendMessage}
            />
            <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>
              Parents are always included and cannot be removed. One student opens that family's chat;
              two or more open one shared group.
            </Text>
            {hasBlockedRows ? (
              <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>
                Grayed-out students need a student login, at least one linked parent, and at least one
                parent login. The office can create logins and link guardians.
              </Text>
            ) : null}
          </View>
        ) : (
          <PrimaryButton label="Message these students" onPress={enterMessaging} />
        )
      ) : null}
      {office ? (
        <>
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
        </>
      ) : null}
    </View>
  );

  return (
    <Screen keyboard collapse={id ? <ClassTabs classId={id} /> : null}>
      {layout.isSplit && office ? (
        <View style={styles.split}>
          <View style={styles.col}>{addCard}</View>
          <View style={styles.col}>{rosterBlock}</View>
        </View>
      ) : (
        <>
          {office ? addCard : null}
          {rosterBlock}
        </>
      )}

      {office && imports[0] && !suggestions.length ? (
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

      {office && suggestions.length ? (
        <GhostButton align="left" label="Delete" onPress={() => setConfirm({ kind: 'suggestions' })} />
      ) : null}

      {klass && office && can(profile, 'classes.delete', 'school', grants) ? (
        <GhostButton align="left" label="Delete class" onPress={() => setConfirm({ kind: 'class' })} />
      ) : null}

      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
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

function LinkedParents({ parents }: { parents: LinkedParentChip[] }) {
  const { colors } = useTheme();
  if (!parents.length) return null;
  return (
    <View style={styles.parents}>
      {parents.map((parent) => (
        <View key={parent.id} style={[styles.parentChip, !parent.hasLogin ? { opacity: 0.55 } : null]}>
          <Avatar name={parent.display_name} photoUrl={parent.photoUrl} size={28} />
          <MarqueeText
            text={firstName(parent.display_name)}
            align="start"
            fadeColor={colors.bg}
            style={[styles.parentName, { color: colors.ink }]}
          />
          {!parent.hasLogin ? (
            <Text style={[styles.parentNeeds, { color: colors.mute }]}>Needs login</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.messageCheck,
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
  empty: type.body,
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 4,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    flexShrink: 1,
  },
  selectAllLabel: {
    ...type.meta,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkHit: {
    paddingTop: 14,
    paddingRight: 10,
    paddingLeft: 4,
  },
  selectRowBody: {
    flex: 1,
    minWidth: 0,
  },
  messageCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: 8,
    marginTop: 8,
  },
  parents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  parentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 140,
  },
  parentName: {
    ...type.badge,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  parentNeeds: {
    ...type.badge,
    fontWeight: '600',
  },
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
