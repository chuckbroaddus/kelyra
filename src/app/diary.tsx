import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { FormSheet } from '@/components/ui/FormSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import {
  ackDiaryPrivacy,
  attachDiaryPhoto,
  createDiaryEntry,
  deleteDiaryEntry,
  hasAckedDiaryPrivacy,
  listDiaryEntries,
  listLedgerEvents,
  listParentLinkedChildren,
  takePendingDiaryDraft,
  updateDiaryEntry,
} from '@/lib/diary/api';
import { copyLedgerCsv, exportLedgerCsv } from '@/lib/diary/export';
import {
  DIARY_FERPA_NOTE,
  DIARY_PRIVACY_BODY,
  DIARY_PRIVACY_TITLE,
} from '@/lib/diary/privacy';
import { canOpenDiary, diarySeatForChrome } from '@/lib/diary/seat';
import type { DiaryDraft, DiaryEntryRow, LedgerEventRow } from '@/lib/diary/types';
import { firstName, formatWhen } from '@/lib/format';
import { listTaughtClasses } from '@/lib/lessons/api';
import { startLiveRecording, type LiveRecording } from '@/lib/media/recorder';
import { pickRawPhoto, waitForModalDismiss } from '@/lib/media/pickPhoto';
import { transcribeAudioDirect } from '@/lib/matching/captureSpeech';
import { listRoster } from '@/lib/students/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Segment = 'journal' | 'ledger';

const LEDGER_FAMILIES: Array<{ key: string | null; label: string }> = [
  { key: null, label: 'All' },
  { key: 'assign', label: 'Assign' },
  { key: 'grade', label: 'Grade' },
  { key: 'syllabus', label: 'Syllabus' },
  { key: 'capture', label: 'Capture' },
  { key: 'office', label: 'Office' },
  { key: 'other', label: 'Other' },
];

type TaughtClass = { id: string; name: string };
type RosterChip = { id: string; display_name: string };

export default function DiaryScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const chrome = useChrome();
  usePushedTitle('Diary');

  const seat = diarySeatForChrome({
    profile,
    chromeRole: chrome.role,
  });
  const allowed = canOpenDiary(profile) && seat != null;
  const teacherLike = seat === 'teacher' || seat === 'staff';

  const [segment, setSegment] = useState<Segment>('journal');
  const [entries, setEntries] = useState<DiaryEntryRow[] | null>(null);
  const [ledger, setLedger] = useState<LedgerEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string | null>(null);
  const [ledgerFrom, setLedgerFrom] = useState('');
  const [ledgerTo, setLedgerTo] = useState('');
  const [ledgerClassId, setLedgerClassId] = useState<string | null>(null);
  const [ledgerStudentId, setLedgerStudentId] = useState<string | null>(null);
  const [children, setChildren] = useState<Array<{ id: string; display_name: string }>>([]);
  const [focusedChildId, setFocusedChildId] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryEntryRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DiaryEntryRow | null>(null);
  const [draft, setDraft] = useState<DiaryDraft | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [tagsText, setTagsText] = useState('');
  const [studentPointer, setStudentPointer] = useState<string | null>(null);
  const [pointerClassId, setPointerClassId] = useState<string | null>(null);
  const [taughtClasses, setTaughtClasses] = useState<TaughtClass[]>([]);
  const [pointerRoster, setPointerRoster] = useState<RosterChip[]>([]);
  const [ledgerRoster, setLedgerRoster] = useState<RosterChip[]>([]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const liveRef = useRef<LiveRecording | null>(null);

  const multiChild = seat === 'parent' && children.length >= 2;
  const failClosedEmpty = multiChild && !focusedChildId;

  useEffect(() => {
    if (!teacherLike) {
      setTaughtClasses([]);
      return;
    }
    let cancelled = false;
    void listTaughtClasses()
      .then((rows) => {
        if (!cancelled) setTaughtClasses(rows.map((row) => ({ id: row.id, name: row.name })));
      })
      .catch(() => {
        if (!cancelled) setTaughtClasses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherLike]);

  useEffect(() => {
    if (!pointerClassId) {
      setPointerRoster([]);
      return;
    }
    let cancelled = false;
    void listRoster(pointerClassId)
      .then((rows) => {
        if (!cancelled) {
          setPointerRoster(rows.map((row) => ({ id: row.id, display_name: row.display_name })));
        }
      })
      .catch(() => {
        if (!cancelled) setPointerRoster([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pointerClassId]);

  useEffect(() => {
    if (!ledgerClassId) {
      setLedgerRoster([]);
      return;
    }
    let cancelled = false;
    void listRoster(ledgerClassId)
      .then((rows) => {
        if (!cancelled) {
          setLedgerRoster(rows.map((row) => ({ id: row.id, display_name: row.display_name })));
        }
      })
      .catch(() => {
        if (!cancelled) setLedgerRoster([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ledgerClassId]);

  const refresh = useCallback(async () => {
    if (!allowed || !seat || !profile?.id) {
      setEntries([]);
      setLedger([]);
      return;
    }
    setError(null);
    try {
      let kids: Array<{ id: string; display_name: string }> = [];
      let focus = focusedChildId;
      if (seat === 'parent') {
        kids = await listParentLinkedChildren();
        setChildren(kids);
        if (focus && !kids.some((k) => k.id === focus)) focus = null;
        if (!focus && kids.length === 1) focus = kids[0]!.id;
        if (focus !== focusedChildId) setFocusedChildId(focus);
      } else {
        setChildren([]);
        if (focusedChildId) setFocusedChildId(null);
        focus = null;
      }

      const ack = await hasAckedDiaryPrivacy(profile.id);
      if (!ack) setPrivacyOpen(true);

      const pending = await takePendingDiaryDraft(profile.id);
      if (pending?.body) {
        setDraft(pending);
        setEditing(null);
        setTitle(pending.title ?? '');
        setBody(pending.body);
        setEntryDate(pending.entry_date ?? new Date().toISOString().slice(0, 10));
        setTagsText('');
        setStudentPointer(null);
        setPointerClassId(null);
        setComposerOpen(true);
      }

      if (segment === 'journal') {
        if (seat === 'parent' && kidsNeedFocus(kids, focus)) {
          setEntries([]);
        } else {
          const rows = await listDiaryEntries({
            seat,
            childStudentId: seat === 'parent' ? focus : null,
            query: query.trim() || null,
          });
          setEntries(rows);
        }
        setLedger(null);
      } else if (seat === 'parent') {
        setLedger([]);
        setEntries(null);
      } else {
        const rows = await listLedgerEvents({
          seat,
          actionFamily: family,
          query: query.trim() || null,
          fromIso: ledgerFrom.trim() ? `${ledgerFrom.trim()}T00:00:00.000Z` : null,
          toIso: ledgerTo.trim() ? `${ledgerTo.trim()}T23:59:59.999Z` : null,
          classId: ledgerClassId,
          studentId: ledgerStudentId,
        });
        setLedger(rows);
        setEntries(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Diary');
      setEntries([]);
      setLedger([]);
    }
  }, [
    allowed,
    family,
    focusedChildId,
    ledgerClassId,
    ledgerFrom,
    ledgerStudentId,
    ledgerTo,
    profile?.id,
    query,
    seat,
    segment,
  ]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const groupedEntries = useMemo(() => groupByDay(entries ?? []), [entries]);
  const groupedLedger = useMemo(() => groupLedgerByDay(ledger ?? []), [ledger]);

  function openNew(prefill?: DiaryDraft | null) {
    setEditing(null);
    setDraft(prefill ?? null);
    setTitle(prefill?.title ?? '');
    setBody(prefill?.body ?? '');
    setEntryDate(prefill?.entry_date ?? new Date().toISOString().slice(0, 10));
    setTagsText('');
    setStudentPointer(null);
    setPointerClassId(null);
    setComposerOpen(true);
  }

  function openEdit(row: DiaryEntryRow) {
    setEditing(row);
    setTitle(row.title ?? '');
    setBody(row.body);
    setEntryDate(row.entry_date);
    setTagsText((row.tags ?? []).join(', '));
    setStudentPointer(row.student_id);
    setPointerClassId(null);
    setComposerOpen(true);
  }

  async function saveEntry() {
    if (!profile?.id || !seat) return;
    setBusy(true);
    setError(null);
    try {
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const childId = seat === 'parent' ? focusedChildId ?? (children.length === 1 ? children[0]!.id : null) : null;
      if (seat === 'parent' && children.length >= 2 && !childId) {
        throw new Error('Pick a child before saving.');
      }
      if (editing) {
        await updateDiaryEntry(editing.id, {
          body,
          title,
          entryDate,
          tags,
          studentId: studentPointer,
          childStudentId: childId,
        });
      } else {
        const created = await createDiaryEntry({
          ownerProfileId: profile.id,
          seat,
          body,
          title,
          entryDate,
          tags,
          studentId: studentPointer,
          childStudentId: childId,
        });
        setEditing(created);
        setDraft(null);
        await refresh();
        return; // keep composer open so photo attach works on the new entry
      }
      setComposerOpen(false);
      setDraft(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function attachPhoto() {
    if (!profile?.id || !seat || !editing) return;
    setBusy(true);
    try {
      await waitForModalDismiss();
      const photo = await pickRawPhoto(false);
      if (!photo) return;
      await attachDiaryPhoto({
        ownerProfileId: profile.id,
        seat,
        entryId: editing.id,
        uri: photo.uri,
        mimeType: photo.mimeType,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach photo');
    } finally {
      setBusy(false);
    }
  }

  async function startDictate() {
    if (recording || liveRef.current) return;
    setError(null);
    setNotice(null);
    try {
      const live = await startLiveRecording();
      liveRef.current = live;
      setRecording(true);
    } catch (err) {
      liveRef.current = null;
      setRecording(false);
      setError(err instanceof Error ? err.message : 'Could not start mic');
    }
  }

  async function stopDictate() {
    const live = liveRef.current;
    liveRef.current = null;
    if (!live) {
      setRecording(false);
      return;
    }
    setBusy(true);
    try {
      const audio = await live.stop();
      const text = await transcribeAudioDirect({ uri: audio.uri, mimeType: audio.mimeType });
      if (text) setBody((current) => (current.trim() ? `${current.trim()} ${text}` : text));
      setNotice('Transcript added — edit before Save.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not transcribe');
    } finally {
      setRecording(false);
      setBusy(false);
    }
  }

  async function onExportLedger() {
    if (!ledger?.length) return;
    setNotice(null);
    try {
      const result = await exportLedgerCsv(ledger);
      setNotice(result === 'downloaded' ? 'Ledger CSV downloaded.' : 'Ledger CSV shared.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export ledger');
    }
  }

  async function onCopyLedger() {
    if (!ledger?.length) return;
    setNotice(null);
    const result = await copyLedgerCsv(ledger);
    if (result === 'copied') setNotice('Ledger CSV copied to clipboard.');
    else if (result === 'shared') setNotice('Ledger CSV shared.');
    else setError('Could not copy ledger CSV.');
  }

  if (!allowed || !seat) {
    return (
      <Screen centered maxWidth={480}>
        <Text style={[type.title, { color: colors.ink }]}>Diary</Text>
        <Text style={[styles.lead, { color: colors.mute }]}>
          Diary is for teachers, staff, and parents. Student seat has no Diary.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen maxWidth={720} keyboard>
      <PersonTabs
        tabs={[
          { key: 'journal', label: 'Journal', icon: 'compose' },
          { key: 'ledger', label: 'Ledger', icon: 'history' },
        ]}
        value={segment}
        onChange={(key) => setSegment(key as Segment)}
      />

      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>{DIARY_FERPA_NOTE}</Text>

      {seat === 'parent' && children.length >= 2 ? (
        <>
          <Text style={[styles.filterLabel, { color: colors.mute }]}>Child</Text>
          <ChipRow>
            {children.map((child) => (
              <Chip
                key={child.id}
                label={firstName(child.display_name)}
                selected={focusedChildId === child.id}
                onPress={() => setFocusedChildId(child.id)}
              />
            ))}
          </ChipRow>
        </>
      ) : null}

      <TextField
        label="Search"
        value={query}
        onChangeText={setQuery}
        placeholder={segment === 'journal' ? 'Search journal' : 'Search ledger summary'}
        autoCapitalize="none"
      />
      <GhostButton label="Apply filters" onPress={() => void refresh()} />

      {segment === 'ledger' && seat !== 'parent' ? (
        <>
          <Text style={[styles.filterLabel, { color: colors.mute }]}>Action</Text>
          <ChipRow>
            {LEDGER_FAMILIES.map((item) => (
              <Chip
                key={item.label}
                label={item.label}
                selected={family === item.key}
                onPress={() => setFamily(item.key)}
              />
            ))}
          </ChipRow>
          <TextField label="From date (YYYY-MM-DD)" value={ledgerFrom} onChangeText={setLedgerFrom} autoCapitalize="none" />
          <TextField label="To date (YYYY-MM-DD)" value={ledgerTo} onChangeText={setLedgerTo} autoCapitalize="none" />

          <Text style={[styles.filterLabel, { color: colors.mute }]}>Class (taught)</Text>
          {taughtClasses.length ? (
            <ChipRow>
              <Chip
                label="All classes"
                selected={ledgerClassId == null}
                onPress={() => {
                  setLedgerClassId(null);
                  setLedgerStudentId(null);
                }}
              />
              {taughtClasses.map((klass) => (
                <Chip
                  key={klass.id}
                  label={klass.name}
                  selected={ledgerClassId === klass.id}
                  onPress={() => {
                    setLedgerClassId(klass.id);
                    setLedgerStudentId(null);
                  }}
                />
              ))}
            </ChipRow>
          ) : (
            <Text style={[type.meta, { color: colors.mute }]}>
              No taught classes on this seat — class filter unavailable.
            </Text>
          )}

          {ledgerClassId ? (
            <>
              <Text style={[styles.filterLabel, { color: colors.mute }]}>Student (roster)</Text>
              <ChipRow>
                <Chip
                  label="All students"
                  selected={ledgerStudentId == null}
                  onPress={() => setLedgerStudentId(null)}
                />
                {ledgerRoster.map((student) => (
                  <Chip
                    key={student.id}
                    label={firstName(student.display_name)}
                    selected={ledgerStudentId === student.id}
                    onPress={() => setLedgerStudentId(student.id)}
                  />
                ))}
              </ChipRow>
            </>
          ) : null}
        </>
      ) : null}

      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
      {notice ? <Text style={[type.meta, { color: colors.mute }]}>{notice}</Text> : null}

      {segment === 'journal' ? (
        <>
          <PrimaryButton label="New entry" onPress={() => openNew(draft)} />
          {failClosedEmpty ? (
            <Text style={[styles.lead, { color: colors.mute }]}>
              Pick a child to open that journal. Twin streams never mix.
            </Text>
          ) : entries == null ? (
            <WorkingLine />
          ) : entries.length === 0 ? (
            <Text style={[styles.lead, { color: colors.mute }]}>
              No entries yet. New entry keeps notes private to you in Kelyra — not Feed, not the student Log.
            </Text>
          ) : (
            groupedEntries.map((group) => (
              <View key={group.day}>
                <SectionHeader label={group.day} first={group === groupedEntries[0]} />
                {group.rows.map((row) => (
                  <Pressable
                    key={row.id}
                    onPress={() => openEdit(row)}
                    style={[styles.card, { borderColor: colors.line, backgroundColor: colors.elevated }]}
                  >
                    <Text style={[type.meta, { color: colors.mute }]}>
                      {formatWhen(row.updated_at)}
                      {row.updated_at !== row.created_at ? ' · edited' : ''}
                    </Text>
                    {row.title ? (
                      <Text style={[type.title, { color: colors.ink }]} numberOfLines={2}>
                        {row.title}
                      </Text>
                    ) : null}
                    <Text style={[type.body, { color: colors.ink }]} numberOfLines={4}>
                      {row.body}
                    </Text>
                    {(row.tags ?? []).length ? (
                      <Text style={[type.meta, { color: colors.mute }]}>{(row.tags ?? []).join(' · ')}</Text>
                    ) : null}
                    <GhostButton label="Delete" onPress={() => setPendingDelete(row)} />
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </>
      ) : seat === 'parent' ? (
        <Text style={[styles.lead, { color: colors.mute }]}>
          Parent My Ledger is deferred in v1. Journal is available above.
        </Text>
      ) : ledger == null ? (
        <WorkingLine />
      ) : ledger.length === 0 ? (
        <Text style={[styles.lead, { color: colors.mute }]}>
          My Ledger lists your own Kelyra actions (assign, grade, file capture
          {seat === 'staff' ? ', office changes' : ''}). It is not Office Activity and not your journal.
        </Text>
      ) : (
        <>
          <View style={styles.exportRow}>
            <GhostButton label="Export CSV" onPress={() => void onExportLedger()} />
            <GhostButton label="Copy CSV" onPress={() => void onCopyLedger()} />
          </View>
          <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
            Exports only your currently filtered ledger rows — not other teachers, not Office Activity.
          </Text>
          {groupedLedger.map((group) => (
            <View key={group.day}>
              <SectionHeader label={group.day} first={group === groupedLedger[0]} />
              {group.rows.map((row) => (
                <View
                  key={row.id}
                  style={[styles.card, { borderColor: colors.line, backgroundColor: colors.elevated }]}
                >
                  <Text style={[type.meta, { color: colors.mute }]}>
                    {formatWhen(row.created_at)} · {row.action_family}
                  </Text>
                  <Text style={[type.body, { color: colors.ink }]}>{row.summary}</Text>
                </View>
              ))}
            </View>
          ))}
        </>
      )}

      <FormSheet
        visible={composerOpen}
        title={editing ? 'Edit entry' : 'New entry'}
        onClose={() => {
          setComposerOpen(false);
          setDraft(null);
          if (recording) void stopDictate();
        }}
      >
        <TextField label="Title (optional)" value={title} onChangeText={setTitle} />
        <TextField
          label="Date (YYYY-MM-DD)"
          value={entryDate}
          onChangeText={setEntryDate}
          autoCapitalize="none"
        />
        <TextField
          label="Body"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={6}
          placeholder="Personal reflection — not the official student file."
        />
        <TextField
          label="Tags (comma-separated)"
          value={tagsText}
          onChangeText={setTagsText}
          autoCapitalize="none"
        />
        {teacherLike ? (
          <>
            <Text style={[styles.filterLabel, { color: colors.mute }]}>
              Soft student pointer (private search only — not an ACL)
            </Text>
            {taughtClasses.length ? (
              <>
                <ChipRow>
                  <Chip
                    label="No class"
                    selected={pointerClassId == null && studentPointer == null}
                    onPress={() => {
                      setPointerClassId(null);
                      setStudentPointer(null);
                    }}
                  />
                  {taughtClasses.map((klass) => (
                    <Chip
                      key={klass.id}
                      label={klass.name}
                      selected={pointerClassId === klass.id}
                      onPress={() => {
                        setPointerClassId(klass.id);
                        setStudentPointer(null);
                      }}
                    />
                  ))}
                </ChipRow>
                {pointerClassId ? (
                  <ChipRow>
                    {pointerRoster.map((student) => (
                      <Chip
                        key={student.id}
                        label={firstName(student.display_name)}
                        selected={studentPointer === student.id}
                        onPress={() =>
                          setStudentPointer((current) => (current === student.id ? null : student.id))
                        }
                      />
                    ))}
                  </ChipRow>
                ) : studentPointer ? (
                  <Text style={[type.meta, { color: colors.mute }]}>
                    Pointer set — pick a taught class to change it, or Clear.
                  </Text>
                ) : (
                  <Text style={[type.meta, { color: colors.mute }]}>
                    Optional: pick a taught class, then a roster student for your search only.
                  </Text>
                )}
                {studentPointer ? (
                  <GhostButton
                    label="Clear student pointer"
                    onPress={() => {
                      setStudentPointer(null);
                      setPointerClassId(null);
                    }}
                  />
                ) : null}
              </>
            ) : (
              <Text style={[type.meta, { color: colors.mute }]}>
                Soft student pointer needs a taught class roster. Teachers do not create classes from Diary.
              </Text>
            )}
          </>
        ) : null}

        {recording ? (
          <>
            <Text style={[type.meta, { color: colors.danger, marginTop: 8 }]}>
              Recording… tap Stop when finished. Transcript lands in the body for edit before Save.
            </Text>
            <GhostButton
              label={busy ? 'Transcribing…' : 'Stop recording'}
              tone="danger"
              onPress={() => void stopDictate()}
              disabled={busy}
            />
          </>
        ) : (
          <GhostButton label="Start recording" onPress={() => void startDictate()} disabled={busy} />
        )}
        {editing ? <GhostButton label="Attach photo" onPress={() => void attachPhoto()} /> : null}
        <PrimaryButton label={busy ? 'Saving…' : 'Save'} onPress={() => void saveEntry()} disabled={busy || recording} />
      </FormSheet>

      <ConfirmSheet
        visible={privacyOpen}
        title={DIARY_PRIVACY_TITLE}
        body={`${DIARY_PRIVACY_BODY}\n\n${DIARY_FERPA_NOTE}`}
        confirmLabel="Got it"
        onCancel={() => setPrivacyOpen(false)}
        onConfirm={() => {
          if (profile?.id) void ackDiaryPrivacy(profile.id);
          setPrivacyOpen(false);
        }}
      />

      <ConfirmSheet
        visible={Boolean(pendingDelete)}
        title="Delete entry?"
        body="This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const row = pendingDelete;
          setPendingDelete(null);
          if (!row) return;
          void deleteDiaryEntry(row.id)
            .then(() => refresh())
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not delete'));
        }}
      />
    </Screen>
  );
}

function kidsNeedFocus(
  kids: Array<{ id: string }>,
  focused: string | null,
): boolean {
  return kids.length >= 2 && !focused;
}

function groupByDay(rows: DiaryEntryRow[]): Array<{ day: string; rows: DiaryEntryRow[] }> {
  const map = new Map<string, DiaryEntryRow[]>();
  for (const row of rows) {
    const day = row.entry_date;
    const list = map.get(day) ?? [];
    list.push(row);
    map.set(day, list);
  }
  return [...map.entries()].map(([day, group]) => ({ day, rows: group }));
}

function groupLedgerByDay(rows: LedgerEventRow[]): Array<{ day: string; rows: LedgerEventRow[] }> {
  const map = new Map<string, LedgerEventRow[]>();
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(row);
    map.set(day, list);
  }
  return [...map.entries()].map(([day, group]) => ({ day, rows: group }));
}

const styles = StyleSheet.create({
  lead: {
    ...type.body,
    marginTop: 12,
  },
  filterLabel: {
    ...type.section,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 10,
  },
  exportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
});
