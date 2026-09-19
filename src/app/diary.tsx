import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { JournalMonthGrid } from '@/components/diary/JournalMonthGrid';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { FormSheet } from '@/components/ui/FormSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { todayISO } from '@/lib/date/iso';
import {
  ackDiaryPrivacy,
  attachDiaryPhoto,
  createDiaryEntry,
  deleteDiaryEntry,
  diaryMediaSignedUrl,
  hasAckedDiaryPrivacy,
  listDiaryEntries,
  listDiaryMedia,
  listLedgerEvents,
  listParentLinkedChildren,
  takePendingDiaryDraft,
  updateDiaryEntry,
} from '@/lib/diary/api';
import {
  buildJournalAgendaGroups,
  buildLedgerAgendaGroups,
  dayChromeLayout,
  DIARY_EMPTY_DAY_COPY,
  DIARY_LEDGER_EMPTY_DAY_COPY,
  DIARY_PRESENCE_HONESTY,
  DIARY_TWIN_FAIL_CLOSED,
  formatJournalDayHeader,
  journalMonthContaining,
  ledgerPresenceCountByDay,
  parentTwinsFailClosed,
  presenceCountByDay,
  shiftJournalSelectedDay,
} from '@/lib/diary/dayBrowse';
import { copyLedgerCsv, exportLedgerCsv } from '@/lib/diary/export';
import {
  diaryFilterDate,
  ledgerDeepLinkHref,
  ledgerDeepLinkStillPermitted,
  sortDiaryEntries,
} from '@/lib/diary/ledgerLink';
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
import { pickRawPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { transcribeAudioDirect } from '@/lib/matching/captureSpeech';
import { listRoster } from '@/lib/students/api';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Segment = 'journal' | 'ledger';
type DiaryPhotoView = { id: string; url: string };

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
  const layout = useLayout();
  const { profile } = useAuth();
  const chrome = useChrome();
  const router = useRouter();
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
  /** DB-B selected Journal day (local ISO). Auto-applies; no From/To primary. */
  const [selectedDay, setSelectedDay] = useState(() => todayISO());
  const [journalTag, setJournalTag] = useState('');
  const [journalClassId, setJournalClassId] = useState<string | null>(null);
  const [journalStudentId, setJournalStudentId] = useState<string | null>(null);
  const [journalRoster, setJournalRoster] = useState<RosterChip[]>([]);
  /** false = newest first (default); true = oldest first. SR-KEEP. */
  const [sortOldest, setSortOldest] = useState(false);
  const [children, setChildren] = useState<Array<{ id: string; display_name: string }>>([]);
  const [focusedChildId, setFocusedChildId] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryEntryRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DiaryEntryRow | null>(null);
  const [draft, setDraft] = useState<DiaryDraft | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [entryDate, setEntryDate] = useState(() => todayISO());
  const [tagsText, setTagsText] = useState('');
  const [studentPointer, setStudentPointer] = useState<string | null>(null);
  const [pointerClassId, setPointerClassId] = useState<string | null>(null);
  const [taughtClasses, setTaughtClasses] = useState<TaughtClass[]>([]);
  const [pointerRoster, setPointerRoster] = useState<RosterChip[]>([]);
  const [ledgerRoster, setLedgerRoster] = useState<RosterChip[]>([]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [composerPhotos, setComposerPhotos] = useState<DiaryPhotoView[]>([]);
  const [entryPhotos, setEntryPhotos] = useState<Record<string, DiaryPhotoView[]>>({});
  const [viewer, setViewer] = useState<{ uris: string[]; index: number } | null>(null);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const liveRef = useRef<LiveRecording | null>(null);
  const multiChild = seat === 'parent' && children.length >= 2;
  const failClosedEmpty = parentTwinsFailClosed(children.length, focusedChildId) && seat === 'parent';
  const journalMonth = useMemo(() => journalMonthContaining(selectedDay), [selectedDay]);
  /** Layout B: phone <720 month-above-tabs; web ≥720 tabs then month|stream for both segments. */
  const chromeLayout = dayChromeLayout(layout.width);
  const dayChromeSplit = chromeLayout === 'web-split';

  const dropBrokenPhoto = useCallback((entryId: string | null, photoId: string) => {
    if (entryId) {
      setEntryPhotos((prev) => {
        const current = prev[entryId];
        if (!current?.length) return prev;
        return { ...prev, [entryId]: current.filter((photo) => photo.id !== photoId) };
      });
    }
    setComposerPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  }, []);

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

  useEffect(() => {
    if (!journalClassId) {
      setJournalRoster([]);
      return;
    }
    let cancelled = false;
    void listRoster(journalClassId)
      .then((rows) => {
        if (!cancelled) {
          setJournalRoster(rows.map((row) => ({ id: row.id, display_name: row.display_name })));
        }
      })
      .catch(() => {
        if (!cancelled) setJournalRoster([]);
      });
    return () => {
      cancelled = true;
    };
  }, [journalClassId]);

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
          // DB-B: month window auto-applies with selected day (RG-DROP — no From/To primary).
          const month = journalMonthContaining(selectedDay);
          const tag = journalTag.trim() || null;
          // Soft pointer filter — teacher/staff only; never ACL.
          const studentFilter = teacherLike ? journalStudentId : null;
          const rows = await listDiaryEntries({
            seat,
            childStudentId: seat === 'parent' ? focus : null,
            query: query.trim() || null,
            from: month.fromIso,
            to: month.toIso,
            tag,
            studentId: studentFilter,
          });
          setEntries(sortDiaryEntries(rows, sortOldest));
        }
        setLedger(null);
      } else if (seat === 'parent') {
        setLedger([]);
        setEntries(null);
      } else {
        // Layout B: selected-day month is primary; From/To remain secondary.
        const month = journalMonthContaining(selectedDay);
        const fromDate = diaryFilterDate(ledgerFrom);
        const toDate = diaryFilterDate(ledgerTo);
        const rows = await listLedgerEvents({
          seat,
          actionFamily: family,
          query: query.trim() || null,
          fromIso: fromDate
            ? `${fromDate}T00:00:00.000Z`
            : `${month.fromIso}T00:00:00.000Z`,
          toIso: toDate
            ? `${toDate}T23:59:59.999Z`
            : `${month.toIso}T23:59:59.999Z`,
          classId: ledgerClassId,
          studentId: ledgerStudentId,
          ascending: sortOldest,
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
    journalStudentId,
    journalTag,
    ledgerClassId,
    ledgerFrom,
    ledgerStudentId,
    ledgerTo,
    profile?.id,
    query,
    seat,
    segment,
    selectedDay,
    sortOldest,
    teacherLike,
  ]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!entries?.length) {
      setEntryPhotos({});
      return;
    }
    let cancelled = false;
    const ids = entries.map((row) => row.id);
    void (async () => {
      const next: Record<string, DiaryPhotoView[]> = {};
      await Promise.all(
        ids.map(async (entryId) => {
          next[entryId] = await loadDiaryPhotoViews(entryId);
        }),
      );
      if (!cancelled) setEntryPhotos(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [entries]);

  useEffect(() => {
    if (!composerOpen || !editing?.id) {
      setComposerPhotos([]);
      return;
    }
    let cancelled = false;
    void loadDiaryPhotoViews(editing.id).then((views) => {
      if (!cancelled) setComposerPhotos(views);
    });
    return () => {
      cancelled = true;
    };
  }, [composerOpen, editing?.id]);

  const agendaGroups = useMemo(
    () => buildJournalAgendaGroups(entries ?? [], selectedDay, sortOldest),
    [entries, selectedDay, sortOldest],
  );
  const journalPresenceByDay = useMemo(
    () => (failClosedEmpty ? new Map<string, number>() : presenceCountByDay(entries ?? [])),
    [entries, failClosedEmpty],
  );
  const ledgerPresenceByDay = useMemo(
    () => ledgerPresenceCountByDay(ledger ?? []),
    [ledger],
  );
  /** Follow-active-tab: Journal PR-BOTH entry_date; Ledger mute tick on created_at day. */
  const presenceByDay = segment === 'journal' ? journalPresenceByDay : ledgerPresenceByDay;
  const presenceMode = segment === 'journal' ? 'journal' : 'ledger';
  const ledgerAgendaGroups = useMemo(
    () => buildLedgerAgendaGroups(ledger ?? [], selectedDay, sortOldest),
    [ledger, selectedDay, sortOldest],
  );

  function openNew(prefill?: DiaryDraft | null) {
    setEditing(null);
    setDraft(prefill ?? null);
    setTitle(prefill?.title ?? '');
    setBody(prefill?.body ?? '');
    // DATE-P1 prefill = selected Journal day (EM-PRIMARY / DB-COMP-01).
    setEntryDate(prefill?.entry_date ?? selectedDay);
    setTagsText('');
    setStudentPointer(null);
    setPointerClassId(null);
    setComposerPhotos([]);
    setComposerOpen(true);
  }

  function jumpJournalToday() {
    setSelectedDay(todayISO());
  }

  function shiftJournalMonth(delta: number) {
    setSelectedDay((current) => shiftJournalSelectedDay(current, delta));
  }

  function openEdit(row: DiaryEntryRow) {
    setEditing(row);
    setTitle(row.title ?? '');
    setBody(row.body);
    setEntryDate(row.entry_date);
    setTagsText((row.tags ?? []).join(', '));
    setStudentPointer(row.student_id);
    setPointerClassId(null);
    setComposerPhotos(entryPhotos[row.id] ?? []);
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

  async function attachPhotoFromSource(fromCamera: boolean) {
    if (!profile?.id || !seat || !editing) return;
    setPhotoSheetOpen(false);
    setError(null);
    setNotice(null);
    if (fromCamera && webCameraNeeded(true)) {
      setCameraOpen(true);
      return;
    }
    setBusy(true);
    try {
      await waitForModalDismiss();
      const photo = await pickRawPhoto(fromCamera);
      if (!photo) return;
      await finishAttachPhoto(photo.uri, photo.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach photo');
    } finally {
      setBusy(false);
    }
  }

  async function finishAttachPhoto(uri: string, mimeType: string) {
    if (!profile?.id || !seat || !editing) return;
    const entryId = editing.id;
    await attachDiaryPhoto({
      ownerProfileId: profile.id,
      seat,
      entryId,
      uri,
      mimeType,
    });
    const views = await loadDiaryPhotoViews(entryId);
    setComposerPhotos(views);
    setEntryPhotos((prev) => ({ ...prev, [entryId]: views }));
    await refresh();
  }

  async function onWebDiaryCapture(uri: string, mimeType: string) {
    setCameraOpen(false);
    if (!profile?.id || !seat || !editing) return;
    setBusy(true);
    setError(null);
    try {
      await finishAttachPhoto(uri, mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach photo');
    } finally {
      setBusy(false);
    }
  }

  async function onLedgerRowPress(row: LedgerEventRow) {
    const href = ledgerDeepLinkHref(row);
    if (!href) return; // summary only — missing entity pointer
    try {
      const ok = await ledgerDeepLinkStillPermitted(row);
      if (!ok) return; // deleted / forbidden — stay on summary, no toast spam
      router.push(href as never);
    } catch {
      // silent fail-closed
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

  const monthChrome = (
    <View
      style={dayChromeSplit ? styles.journalMonthPane : undefined}
      testID="journal-daychrome-month"
    >
      <JournalMonthGrid
        month={journalMonth}
        selectedDay={selectedDay}
        presenceByDay={presenceByDay}
        presenceMode={presenceMode}
        onSelectDay={setSelectedDay}
        onPrevMonth={() => shiftJournalMonth(-1)}
        onNextMonth={() => shiftJournalMonth(1)}
        onToday={jumpJournalToday}
      />
      {segment === 'journal' ? (
        <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
          {DIARY_PRESENCE_HONESTY}
        </Text>
      ) : null}
    </View>
  );

  const journalStream = (
    <View style={dayChromeSplit ? styles.journalStreamPane : undefined} testID="journal-daychrome-stream">
      {failClosedEmpty ? (
        <Text style={[styles.lead, { color: colors.mute }]}>{DIARY_TWIN_FAIL_CLOSED}</Text>
      ) : (
        <>
          <TextField
            label="Search"
            value={query}
            onChangeText={setQuery}
            placeholder="Search journal"
            autoCapitalize="none"
          />

          <Text style={[styles.filterLabel, { color: colors.mute }]}>Sort</Text>
          <ChipRow>
            <Chip label="Newest" selected={!sortOldest} onPress={() => setSortOldest(false)} />
            <Chip label="Oldest" selected={sortOldest} onPress={() => setSortOldest(true)} />
          </ChipRow>

          <TextField
            label="Tag"
            value={journalTag}
            onChangeText={setJournalTag}
            placeholder="Exact tag"
            autoCapitalize="none"
          />
          {teacherLike ? (
            <>
              <Text style={[styles.filterLabel, { color: colors.mute }]}>
                Student pointer (private search only)
              </Text>
              {taughtClasses.length ? (
                <ChipRow>
                  <Chip
                    label="All students"
                    selected={journalClassId == null && journalStudentId == null}
                    onPress={() => {
                      setJournalClassId(null);
                      setJournalStudentId(null);
                    }}
                  />
                  {taughtClasses.map((klass) => (
                    <Chip
                      key={klass.id}
                      label={klass.name}
                      selected={journalClassId === klass.id}
                      onPress={() => {
                        setJournalClassId(klass.id);
                        setJournalStudentId(null);
                      }}
                    />
                  ))}
                </ChipRow>
              ) : (
                <Text style={[type.meta, { color: colors.mute }]}>
                  Soft student filter needs a taught class roster.
                </Text>
              )}
              {journalClassId ? (
                <ChipRow>
                  {journalRoster.map((student) => (
                    <Chip
                      key={student.id}
                      label={firstName(student.display_name)}
                      selected={journalStudentId === student.id}
                      onPress={() =>
                        setJournalStudentId((current) => (current === student.id ? null : student.id))
                      }
                    />
                  ))}
                </ChipRow>
              ) : null}
            </>
          ) : null}

          {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
          {notice ? <Text style={[type.meta, { color: colors.mute }]}>{notice}</Text> : null}

          <PrimaryButton label="New entry" onPress={() => openNew(draft)} />

          {entries == null ? (
            <WorkingLine />
          ) : (
            agendaGroups.map((group) => (
              <View key={group.day}>
                <SectionHeader
                  label={formatJournalDayHeader(group.day, group.isSelected)}
                  first={group === agendaGroups[0]}
                />
                {group.empty ? (
                  <View
                    style={[
                      styles.emptyDay,
                      { borderColor: colors.line, backgroundColor: colors.elevated },
                    ]}
                  >
                    <Text style={[type.body, { color: colors.mute, textAlign: 'center' }]}>
                      {DIARY_EMPTY_DAY_COPY}
                    </Text>
                    <PrimaryButton label="New entry" onPress={() => openNew()} />
                  </View>
                ) : (
                  group.rows.map((row) => {
                    const photos = entryPhotos[row.id] ?? [];
                    return (
                      <View
                        key={row.id}
                        style={[styles.card, { borderColor: colors.line, backgroundColor: colors.elevated }]}
                      >
                        <Pressable onPress={() => openEdit(row)}>
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
                        </Pressable>
                        <DiaryPhotoStrip
                          photos={photos}
                          compact
                          onBroken={(photoId) => dropBrokenPhoto(row.id, photoId)}
                          onOpen={(uris, index) => setViewer({ uris, index })}
                        />
                        {(row.tags ?? []).length ? (
                          <Text style={[type.meta, { color: colors.mute }]}>
                            {(row.tags ?? []).join(' · ')}
                          </Text>
                        ) : null}
                        <GhostButton label="Delete" onPress={() => setPendingDelete(row)} />
                      </View>
                    );
                  })
                )}
              </View>
            ))
          )}
        </>
      )}
    </View>
  );

  const ledgerStream = (
    <View style={dayChromeSplit ? styles.journalStreamPane : undefined} testID="ledger-daychrome-stream">
      <TextField
        label="Search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search ledger summary"
        autoCapitalize="none"
      />

      <Text style={[styles.filterLabel, { color: colors.mute }]}>Sort</Text>
      <ChipRow>
        <Chip label="Newest" selected={!sortOldest} onPress={() => setSortOldest(false)} />
        <Chip label="Oldest" selected={sortOldest} onPress={() => setSortOldest(true)} />
      </ChipRow>

      {seat !== 'parent' ? (
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
          <TextField
            label="From date (YYYY-MM-DD)"
            value={ledgerFrom}
            onChangeText={setLedgerFrom}
            autoCapitalize="none"
          />
          <TextField
            label="To date (YYYY-MM-DD)"
            value={ledgerTo}
            onChangeText={setLedgerTo}
            autoCapitalize="none"
          />

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

          <GhostButton label="Apply filters" onPress={() => void refresh()} />
        </>
      ) : null}

      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
      {notice ? <Text style={[type.meta, { color: colors.mute }]}>{notice}</Text> : null}

      {seat === 'parent' ? (
        <Text style={[styles.lead, { color: colors.mute }]}>
          Parent My Ledger is deferred in v1. Journal is available above.
        </Text>
      ) : ledger == null ? (
        <WorkingLine />
      ) : (
        <>
          {ledger.length ? (
            <View style={styles.exportRow}>
              <GhostButton label="Export CSV" onPress={() => void onExportLedger()} />
              <GhostButton label="Copy CSV" onPress={() => void onCopyLedger()} />
            </View>
          ) : null}
          {ledger.length ? (
            <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
              Exports only your currently filtered ledger rows — not other teachers, not Office Activity.
            </Text>
          ) : null}
          {ledgerAgendaGroups.map((group) => (
            <View key={group.day}>
              <SectionHeader
                label={formatJournalDayHeader(group.day, group.isSelected)}
                first={group === ledgerAgendaGroups[0]}
              />
              {group.empty ? (
                <View
                  style={[
                    styles.emptyDay,
                    { borderColor: colors.line, backgroundColor: colors.elevated },
                  ]}
                >
                  <Text style={[type.body, { color: colors.mute, textAlign: 'center' }]}>
                    {ledger.length === 0
                      ? `My Ledger lists your own Kelyra actions (assign, grade, file capture${
                          seat === 'staff' ? ', office changes' : ''
                        }). It is not Office Activity and not your journal.`
                      : DIARY_LEDGER_EMPTY_DAY_COPY}
                  </Text>
                </View>
              ) : (
                group.rows.map((row) => {
                  const linkable = Boolean(ledgerDeepLinkHref(row));
                  return (
                    <Pressable
                      key={row.id}
                      accessibilityRole={linkable ? 'button' : 'text'}
                      onPress={() => void onLedgerRowPress(row)}
                      style={[styles.card, { borderColor: colors.line, backgroundColor: colors.elevated }]}
                    >
                      <Text style={[type.meta, { color: colors.mute }]}>
                        {formatWhen(row.created_at)} · {row.action_family}
                      </Text>
                      <Text style={[type.body, { color: colors.ink }]}>{row.summary}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );

  return (
    <Screen maxWidth={720} keyboard>
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

      {/* Layout B phone: month above PersonTabs */}
      {!dayChromeSplit ? monthChrome : null}

      <PersonTabs
        tabs={[
          { key: 'journal', label: 'Journal', icon: 'compose' },
          { key: 'ledger', label: 'Ledger', icon: 'history' },
        ]}
        value={segment}
        onChange={(key) => setSegment(key as Segment)}
      />

      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>{DIARY_FERPA_NOTE}</Text>

      {dayChromeSplit ? (
        <View style={styles.journalSplit} testID="journal-daychrome-web-split">
          {monthChrome}
          {segment === 'journal' ? journalStream : ledgerStream}
        </View>
      ) : segment === 'journal' ? (
        journalStream
      ) : (
        ledgerStream
      )}

      <FormSheet
        visible={composerOpen}
        title={editing ? 'Edit entry' : 'New entry'}
        onClose={() => {
          setComposerOpen(false);
          setDraft(null);
          setComposerPhotos([]);
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
        {editing ? (
          <DiaryPhotoStrip
            photos={composerPhotos}
            onBroken={(photoId) => dropBrokenPhoto(editing.id, photoId)}
            onOpen={(uris, index) => setViewer({ uris, index })}
          />
        ) : null}
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
        {editing ? (
          <GhostButton
            label="Attach photo"
            onPress={() => setPhotoSheetOpen(true)}
            disabled={busy || recording}
          />
        ) : null}
        <PrimaryButton label={busy ? 'Saving…' : 'Save'} onPress={() => void saveEntry()} disabled={busy || recording} />
      </FormSheet>

      <PhotoSheet
        visible={photoSheetOpen}
        title="Attach diary photo"
        onTake={() => void attachPhotoFromSource(true)}
        onLibrary={() => void attachPhotoFromSource(false)}
        onCancel={() => setPhotoSheetOpen(false)}
      />

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <WebCameraCapture
          onCapture={(uri, mime) => void onWebDiaryCapture(uri, mime)}
          onCancel={() => setCameraOpen(false)}
        />
      </Modal>

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
            .then(() => {
              setEntryPhotos((prev) => {
                if (!prev[row.id]) return prev;
                const next = { ...prev };
                delete next[row.id];
                return next;
              });
              return refresh();
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not delete'));
        }}
      />

      <ImageViewer
        visible={Boolean(viewer?.uris.length)}
        uris={viewer?.uris ?? []}
        index={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
      />
    </Screen>
  );
}

/** Owner signed URLs for private diary photos. Null/fail → honest empty, never throw to UI.
 * FIX-NOW for t_5f2574b1: list + signed per entry after attach + on open/reopen.
 */
async function loadDiaryPhotoViews(entryId: string): Promise<DiaryPhotoView[]> {
  try {
    const rows = await listDiaryMedia(entryId);
    const views: DiaryPhotoView[] = [];
    for (const row of rows) {
      try {
        const url = await diaryMediaSignedUrl(row.storage_path);
        if (url) views.push({ id: row.id, url });
      } catch {
        // Skip broken sign; do not crash the journal.
      }
    }
    return views;
  } catch {
    return [];
  }
}

function DiaryPhotoStrip({
  photos,
  compact,
  onBroken,
  onOpen,
}: {
  photos: DiaryPhotoView[];
  compact?: boolean;
  onBroken: (photoId: string) => void;
  onOpen: (uris: string[], index: number) => void;
}) {
  const { colors } = useTheme();
  if (!photos.length) return null;
  const uris = photos.map((photo) => photo.url);
  return (
    <View style={styles.photoRow}>
      {photos.map((photo, index) => (
        <Pressable
          key={photo.id}
          accessibilityRole="button"
          accessibilityLabel="Diary photo"
          onPress={() => onOpen(uris, index)}
          style={[
            compact ? styles.photoThumbWrap : styles.photoComposerWrap,
            { borderColor: colors.line, backgroundColor: colors.wash },
          ]}
        >
          <RemoteImage
            uri={photo.url}
            style={compact ? styles.photoThumb : styles.photoComposer}
            contentFit="cover"
            onError={() => onBroken(photo.id)}
            accessibilityLabel="Diary photo"
          />
        </Pressable>
      ))}
    </View>
  );
}

function kidsNeedFocus(
  kids: Array<{ id: string }>,
  focused: string | null,
): boolean {
  return kids.length >= 2 && !focused;
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
  journalSplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  journalMonthPane: {
    width: 280,
    flexShrink: 0,
  },
  journalStreamPane: {
    flex: 1,
    minWidth: 0,
  },
  emptyDay: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 22,
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
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
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  photoThumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoComposerWrap: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 4 / 3,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoComposer: {
    width: '100%',
    height: '100%',
  },
});
