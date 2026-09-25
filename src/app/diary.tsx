import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { DayListPane } from '@/components/calendar/DayListPane';
import { PeriodPager } from '@/components/calendar/PeriodPager';
import { DiarySettingsSheet } from '@/components/diary/DiarySettingsSheet';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { FormSheet } from '@/components/ui/FormSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { PhotoSheet } from '@/components/ui/PhotoSheet';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { Screen } from '@/components/ui/Screen';
import { SwipeActionCard } from '@/components/ui/SwipeActionCard';
import { TextField } from '@/components/ui/TextField';
import { radius, type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { shiftDay } from '@/lib/calendar/day';
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
import { DIARY_TWIN_FAIL_CLOSED, parentTwinsFailClosed } from '@/lib/diary/dayBrowse';
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
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

type Segment = 'journal' | 'ledger';
type DiaryPhotoView = { id: string; url: string };

type TaughtClass = { id: string; name: string };
type RosterChip = { id: string; display_name: string };

export default function DiaryScreen() {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** DIARY-CAL: search lives behind the magnifier (local match, like Calendar). */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  /** DIARY-GEAR: Sort / Tag / pointer / Ledger filters / CSV; Done applies. */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Day List: jump nonce (drum / Today) + reload key (filters, save, delete). */
  const [listJump, setListJump] = useState(0);
  const [listReload, setListReload] = useState(0);
  const listFollow = useSharedValue(0);
  const listDrive = useSharedValue(Number.NaN);
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
  const [viewer, setViewer] = useState<{ uris: string[]; index: number } | null>(null);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const liveRef = useRef<LiveRecording | null>(null);
  const failClosedEmpty = parentTwinsFailClosed(children.length, focusedChildId) && seat === 'parent';
  /** Fetchers read filters through a ref so the Day List only refetches on reloadKey (Done). */
  const filtersRef = useRef({
    focus: focusedChildId,
    kids: children,
    journalTag,
    journalStudentId,
    family,
    ledgerFrom,
    ledgerTo,
    ledgerClassId,
    ledgerStudentId,
    sortOldest,
  });
  filtersRef.current = {
    focus: focusedChildId,
    kids: children,
    journalTag,
    journalStudentId,
    family,
    ledgerFrom,
    ledgerTo,
    ledgerClassId,
    ledgerStudentId,
    sortOldest,
  };
  /** Ledger rows the list has loaded (CSV export source). */
  const ledgerLoadedRef = useRef(new Map<string, LedgerEventRow>());

  const dropBrokenPhoto = useCallback((_entryId: string | null, photoId: string) => {
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
    if (!allowed || !seat || !profile?.id) return;
    setError(null);
    try {
      if (seat === 'parent') {
        const kids = await listParentLinkedChildren();
        let focus = focusedChildId;
        setChildren(kids);
        if (focus && !kids.some((k) => k.id === focus)) focus = null;
        if (!focus && kids.length === 1) focus = kids[0]!.id;
        filtersRef.current = { ...filtersRef.current, kids, focus };
        if (focus !== focusedChildId) setFocusedChildId(focus);
      } else {
        setChildren([]);
        if (focusedChildId) setFocusedChildId(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Diary');
    } finally {
      setListReload((k) => k + 1);
    }
  }, [allowed, focusedChildId, profile?.id, seat]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    ledgerLoadedRef.current = new Map();
  }, [listReload, segment]);

  /** DIARY-CAL Journal Day List window: tag + soft pointer filters; no primary From/To (RG-DROP). */
  const fetchJournalRange = useCallback(
    async (fromIso: string, toIso: string): Promise<DiaryEntryRow[]> => {
      if (!seat) return [];
      const { focus, kids, journalTag: tagText, journalStudentId: pointer, sortOldest } =
        filtersRef.current;
      if (seat === 'parent' && kidsNeedFocus(kids, focus)) return [];
      const tag = tagText.trim() || null;
      // Soft pointer filter — teacher/staff only; never ACL.
      const studentFilter = teacherLike ? pointer : null;
      const rows = await listDiaryEntries({
        seat,
        childStudentId: seat === 'parent' ? focus : null,
        query: null,
        from: fromIso,
        to: toIso,
        tag,
        studentId: studentFilter,
      });
      return sortDiaryEntries(rows, sortOldest);
    },
    [seat, teacherLike],
  );

  /** DIARY-CAL Ledger Day List window, clamped to the Settings From/To range. */
  const fetchLedgerRange = useCallback(
    async (fromIso: string, toIso: string): Promise<LedgerEventRow[]> => {
      if (!seat || seat === 'parent') return [];
      const f = filtersRef.current;
      const fromDate = diaryFilterDate(f.ledgerFrom);
      const toDate = diaryFilterDate(f.ledgerTo);
      const lo = fromDate && fromDate > fromIso ? fromDate : fromIso;
      const hi = toDate && toDate < toIso ? toDate : toIso;
      if (lo > hi) return [];
      const sortOldest = f.sortOldest;
      const rows = await listLedgerEvents({
        seat,
        actionFamily: f.family,
        query: null,
        fromIso: `${lo}T00:00:00.000Z`,
        toIso: `${hi}T23:59:59.999Z`,
        classId: f.ledgerClassId,
        studentId: f.ledgerStudentId,
        ascending: sortOldest,
      });
      for (const row of rows) ledgerLoadedRef.current.set(row.id, row);
      return rows;
    },
    [seat],
  );

  const compareJournal = useCallback((a: DiaryEntryRow, b: DiaryEntryRow) => {
    const d = a.created_at.localeCompare(b.created_at);
    return filtersRef.current.sortOldest ? d : -d;
  }, []);
  const compareLedger = useCallback((a: LedgerEventRow, b: LedgerEventRow) => {
    const d = a.created_at.localeCompare(b.created_at);
    return filtersRef.current.sortOldest ? d : -d;
  }, []);

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

  function jumpToday() {
    setSelectedDay(todayISO());
    setListJump((n) => n + 1);
  }

  function applySettings() {
    setSettingsOpen(false);
    setListReload((k) => k + 1);
  }

  function openEdit(row: DiaryEntryRow) {
    setEditing(row);
    setTitle(row.title ?? '');
    setBody(row.body);
    setEntryDate(row.entry_date);
    setTagsText((row.tags ?? []).join(', '));
    setStudentPointer(row.student_id);
    setPointerClassId(null);
    setComposerPhotos([]);
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

  function loadedLedgerRows(): LedgerEventRow[] {
    const rows = [...ledgerLoadedRef.current.values()];
    rows.sort(compareLedger);
    return rows;
  }

  async function onExportLedger() {
    const rows = loadedLedgerRows();
    if (!rows.length) {
      setNotice('No ledger rows loaded to export.');
      return;
    }
    setNotice(null);
    try {
      const result = await exportLedgerCsv(rows);
      setNotice(result === 'downloaded' ? 'Ledger CSV downloaded.' : 'Ledger CSV shared.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export ledger');
    }
  }

  async function onCopyLedger() {
    const rows = loadedLedgerRows();
    if (!rows.length) {
      setNotice('No ledger rows loaded to copy.');
      return;
    }
    setNotice(null);
    const result = await copyLedgerCsv(rows);
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

  const renderJournalItem = (row: DiaryEntryRow) => {
    const headline = row.title?.trim() || row.body.trim() || 'Untitled';
    const detail = [row.title?.trim() ? row.body.trim() : '', (row.tags ?? []).join(' · ')]
      .filter(Boolean)
      .join(' · ');
    return (
      <SwipeActionCard
        onPress={() => openEdit(row)}
        accessibilityLabel={headline}
        backgroundColor={colors.wash}
        borderColor={colors.line}
        trailing={[
          // DIARY-SWIPE: right-to-left swipe reveals Delete (no Delete button).
          { key: 'delete', label: 'Delete', tone: 'danger', onPress: () => setPendingDelete(row) },
        ]}
      >
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.ink }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {headline}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.mute }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {detail || (row.updated_at !== row.created_at ? `Edited ${formatWhen(row.updated_at)}` : formatWhen(row.created_at))}
          </Text>
        </View>
      </SwipeActionCard>
    );
  };

  const renderLedgerItem = (row: LedgerEventRow) => {
    const linkable = Boolean(ledgerDeepLinkHref(row));
    return (
      <Pressable
        accessibilityRole={linkable ? 'button' : 'text'}
        accessibilityLabel={row.summary}
        onPress={() => void onLedgerRowPress(row)}
        style={[styles.rowCard, { borderColor: colors.line, backgroundColor: colors.wash }]}
      >
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.ink }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {row.summary}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.mute }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {formatWhen(row.created_at)} · {row.action_family}
          </Text>
        </View>
      </Pressable>
    );
  };

  // DIARY-CAL (CEO 2026-09-24): tabs, then Calendar's nav row (Today · + search gear), then the Day drum.
  const pinnedChrome = (
    <>
      <PersonTabs
        tabs={[
          { key: 'journal', label: 'Journal', icon: 'compose' },
          { key: 'ledger', label: 'Ledger', icon: 'history' },
        ]}
        value={segment}
        onChange={(key) => setSegment(key as Segment)}
      />
      <View style={styles.navRow}>
        <View style={styles.navLeading}>
          <GhostButton label="Today" accessibilityLabel="Jump to today" onPress={jumpToday} />
        </View>
        <View style={styles.chromeCluster}>
          {segment === 'journal' && !failClosedEmpty ? (
            // "+" opens the composer on the sticky Day List day (replaces New entry).
            <IconButton name="plus" label="New entry" onPress={() => openNew(draft)} />
          ) : null}
          <IconButton
            name="search"
            label={searchOpen ? 'Close search' : segment === 'journal' ? 'Search journal' : 'Search ledger'}
            onPress={() => {
              setSearchOpen((v) => !v);
              if (searchOpen) setSearchQuery('');
            }}
          />
          <IconButton name="settings" label="Diary settings" onPress={() => setSettingsOpen(true)} />
        </View>
      </View>
      {searchOpen ? (
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={segment === 'journal' ? 'Search journal' : 'Search ledger summary'}
          placeholderTextColor={colors.mute}
          style={[
            styles.searchInput,
            { color: colors.ink, borderColor: colors.line, backgroundColor: colors.elevated },
          ]}
          accessibilityLabel={segment === 'journal' ? 'Search journal' : 'Search ledger summary'}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      ) : null}
      <PeriodPager
        kind="day"
        anchor={selectedDay}
        onShift={(steps) => {
          setSelectedDay((current) => shiftDay(current, steps));
          setListJump((n) => n + 1);
        }}
        onJumpToday={jumpToday}
        followPosition={reduceMotion ? null : listFollow}
        drivePosition={listDrive}
      />
    </>
  );

  return (
    <View style={styles.screenRoot}>
    <Screen maxWidth={720} scroll={false} pin={pinnedChrome}>
      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
      {notice ? <Text style={[type.meta, { color: colors.mute }]}>{notice}</Text> : null}

      {failClosedEmpty ? (
        <Text style={[styles.lead, { color: colors.mute }]}>
          {DIARY_TWIN_FAIL_CLOSED} Pick a child in Settings (gear).
        </Text>
      ) : segment === 'ledger' && seat === 'parent' ? (
        <Text style={[styles.lead, { color: colors.mute }]}>
          Parent My Ledger is deferred in v1. Journal is available on the Journal tab.
        </Text>
      ) : segment === 'journal' ? (
        <View style={styles.listHost}>
          <DayListPane<DiaryEntryRow>
            key="journal"
            day={selectedDay}
            jumpNonce={listJump}
            fetchRange={fetchJournalRange}
            reloadKey={listReload}
            query={searchQuery}
            onTopDayChange={setSelectedDay}
            followPosition={listFollow}
            drivePosition={listDrive}
            itemKey={(row) => row.id}
            itemDay={(row) => row.entry_date}
            compareItems={compareJournal}
            matchesQuery={(row, q) =>
              [row.title ?? '', row.body, ...(row.tags ?? [])].some((t) => t.toLowerCase().includes(q))
            }
            renderItem={renderJournalItem}
            emptyLabel="No entries"
          />
        </View>
      ) : (
        <View style={styles.listHost}>
          <DayListPane<LedgerEventRow>
            key="ledger"
            day={selectedDay}
            jumpNonce={listJump}
            fetchRange={fetchLedgerRange}
            reloadKey={listReload}
            query={searchQuery}
            onTopDayChange={setSelectedDay}
            followPosition={listFollow}
            drivePosition={listDrive}
            itemKey={(row) => row.id}
            itemDay={(row) => row.created_at.slice(0, 10)}
            compareItems={compareLedger}
            matchesQuery={(row, q) => row.summary.toLowerCase().includes(q)}
            renderItem={renderLedgerItem}
            emptyLabel="No activity"
          />
        </View>
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
            .then(() => refresh())
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not delete'));
        }}
      />

      <ImageViewer
        visible={Boolean(viewer?.uris.length)}
        uris={viewer?.uris ?? []}
        index={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
      />

      <DiarySettingsSheet
        visible={settingsOpen}
        onDone={applySettings}
        sortOldest={sortOldest}
        onChangeSortOldest={setSortOldest}
        childOptions={
          seat === 'parent' && children.length >= 2
            ? children.map((child) => ({ id: child.id, name: child.display_name }))
            : []
        }
        focusedChildId={focusedChildId}
        onChangeChild={setFocusedChildId}
        journalTag={journalTag}
        onChangeJournalTag={setJournalTag}
        showStudentPointer={teacherLike}
        taughtClasses={taughtClasses}
        journalClassId={journalClassId}
        journalStudentId={journalStudentId}
        journalRoster={journalRoster.map((s) => ({ id: s.id, name: s.display_name }))}
        onChangeJournalClass={(id) => {
          setJournalClassId(id);
          setJournalStudentId(null);
        }}
        onChangeJournalStudent={setJournalStudentId}
        showLedger={seat !== 'parent'}
        family={family}
        onChangeFamily={setFamily}
        ledgerFrom={ledgerFrom}
        ledgerTo={ledgerTo}
        onChangeLedgerFrom={setLedgerFrom}
        onChangeLedgerTo={setLedgerTo}
        ledgerClassId={ledgerClassId}
        ledgerStudentId={ledgerStudentId}
        ledgerRoster={ledgerRoster.map((s) => ({ id: s.id, name: s.display_name }))}
        onChangeLedgerClass={(id) => {
          setLedgerClassId(id);
          setLedgerStudentId(null);
        }}
        onChangeLedgerStudent={setLedgerStudentId}
        onExportCsv={() => void onExportLedger()}
        onCopyCsv={() => void onCopyLedger()}
      />
    </Screen>
    </View>
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
  screenRoot: { flex: 1 },
  listHost: { flex: 1, minHeight: 0 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minHeight: 44,
  },
  navLeading: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  chromeCluster: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: 2 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    ...type.body,
  },
  rowCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { ...type.body, fontWeight: '600' },
  rowMeta: { ...type.meta },
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
