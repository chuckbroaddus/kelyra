import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { DayListPane } from '@/components/calendar/DayListPane';
import { PeriodPager } from '@/components/calendar/PeriodPager';
import { DiaryFileChip, DiaryLinkCard, DiaryRowContent } from '@/components/diary/DiaryEntryMedia';
import { DiarySettingsSheet } from '@/components/diary/DiarySettingsSheet';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { AttachMenu, PlusGlyph, type AttachChoice } from '@/components/ui/AttachMenu';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { FormSheet } from '@/components/ui/FormSheet';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { PersonTabs } from '@/components/ui/PersonTabs';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { Screen } from '@/components/ui/Screen';
import { SwipeActionCard } from '@/components/ui/SwipeActionCard';
import { TextField } from '@/components/ui/TextField';
import { radius, shadows, type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { shiftDay } from '@/lib/calendar/day';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { todayISO } from '@/lib/date/iso';
import {
  ackDiaryPrivacy,
  attachDiaryFile,
  attachDiaryPhoto,
  createDiaryEntry,
  deleteDiaryEntry,
  diaryMediaSignedUrl,
  hasAckedDiaryPrivacy,
  listDiaryEntries,
  listDiaryMedia,
  listDiaryMediaFor,
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
import { isOfficeChromeRole } from '@/lib/chrome/seat';
import { canOpenDiary, diarySeatForChrome } from '@/lib/diary/seat';
import {
  fileToken,
  insertTokenAt,
  nextPhotoNumber,
  photoToken,
  removeToken,
  renumberStagedPhotoTokens,
} from '@/lib/diary/inlineTokens';
import { diaryBodyUrls } from '@/lib/diary/links';
import { planDiaryRow } from '@/lib/diary/rowPlan';
import type { DiaryDraft, DiaryEntryRow, DiaryMediaRow, LedgerEventRow } from '@/lib/diary/types';
import { pickMessageDocument } from '@/lib/messages/attachments';
import { firstName, formatWhen } from '@/lib/format';
import { listTaughtClasses } from '@/lib/lessons/api';
import { startDictation, type Dictation } from '@/lib/media/dictation';
import { joinDictation } from '@/lib/media/dictationText';
import { pickRawPhoto, waitForModalDismiss, webCameraNeeded } from '@/lib/media/pickPhoto';
import { listRoster } from '@/lib/students/api';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

type Segment = 'journal' | 'ledger';
type DiaryPhotoView = { id: string; url: string };
/** Journal row plus its attachments (batched per Day List window). */
type JournalRow = DiaryEntryRow & { media?: DiaryMediaRow[] };
/** Picked in the composer; uploaded on Done (works before the entry exists). */
/** `token` is the inline marker left in the Body; `n` is the draft photo number (photos only). */
type StagedAttach = {
  key: string;
  kind: 'photo' | 'file';
  uri: string;
  mimeType: string;
  name: string;
  token: string;
  n?: number;
};
/** Title grows 1 to 3 rows, Body 3 to 7; past that the box scrolls. 24 px padding + 2 px border. */
const FIELD_LINE = type.body.lineHeight ?? 24;
const FIELD_CHROME = 26;
const TITLE_MIN_H = FIELD_LINE + FIELD_CHROME;
const TITLE_MAX_H = FIELD_LINE * 3 + FIELD_CHROME;
const BODY_MIN_H = FIELD_LINE * 3 + FIELD_CHROME;
const BODY_MAX_H = FIELD_LINE * 7 + FIELD_CHROME;
function clampFieldHeight(contentH: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.ceil(contentH) + FIELD_CHROME));
}

type TaughtClass = { id: string; name: string; avatarUrl?: string | null };
type RosterChip = { id: string; display_name: string; photoUrl?: string | null };
/** Which field a mic is dictating into. Only one at a time. */
type DictateTarget = 'title' | 'body';
/** Tab key for the entry's "No class" tab (last in the row). */
const NO_CLASS_TAB = 'none';
/** Mic glyph on the solid red recording circle. */
const MIC_ON_INK = '#FFFFFF';
/** Body "+" arm length: two bars (Ask composer technique) sized to read like the 20 px mic glyph. */
const PLUS_GLYPH = 14;

export default function DiaryScreen() {
  const { colors, scheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const { profile } = useAuth();
  const chrome = useChrome();
  const router = useRouter();

  const seat = diarySeatForChrome({
    profile,
    chromeRole: chrome.role,
  });
  const allowed = canOpenDiary(profile) && seat != null;
  const teacherLike = seat === 'teacher' || seat === 'staff';

  const [segment, setSegment] = useState<Segment>('journal');
  // Header title follows the tab (CEO 2026-09-24: Journal, not Diary).
  usePushedTitle(segment === 'journal' ? 'Journal' : 'Ledger');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** DIARY-CAL: search lives behind the magnifier (local match, like Calendar). */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  /** DIARY-GEAR: Sort / Tag / pointer / Ledger filters / CSV; Done applies. */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Day List: jump nonce (drum / Today) + reload key (filters, save, delete). */
  const [listJump, setListJump] = useState(0);
  const [listReveal, setListReveal] = useState<{ day: string; nonce: number }>({ day: '', nonce: 0 });
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
  /** The one active mic (Title or Body); null = none recording. */
  const [dictateTarget, setDictateTarget] = useState<DictateTarget | null>(null);
  const recording = dictateTarget != null;
  const [transcribing, setTranscribing] = useState(false);
  const [composerPhotos, setComposerPhotos] = useState<DiaryPhotoView[]>([]);
  const [composerFiles, setComposerFiles] = useState<DiaryMediaRow[]>([]);
  const [staged, setStaged] = useState<StagedAttach[]>([]);
  // JOURNAL-INLINE: pickers resolve after awaits, so read the live Body / staged / cursor.
  const bodyRef = useRef(body);
  bodyRef.current = body;
  const stagedRef = useRef(staged);
  stagedRef.current = staged;
  const bodySelRef = useRef<{ start: number; end: number } | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  // Rough chars per line for 15px row text: window less page gutter, Day List indent, card padding.
  const rowCharsPerLine = Math.max(20, Math.floor((Math.min(windowWidth, 720) - 32 - 16 - 24) / 7.8));
  const planJournalRow = useCallback(
    (row: JournalRow) => {
      const when = row.updated_at !== row.created_at ? `Edited ${formatWhen(row.updated_at)}` : formatWhen(row.created_at);
      return planDiaryRow({
        title: row.title,
        body: row.body,
        media: row.media ?? [],
        meta: (row.tags ?? []).join(' · ') || when,
        charsPerLine: rowCharsPerLine,
      });
    },
    [rowCharsPerLine],
  );
  const journalItemHeight = useCallback(
    (entry: DiaryEntryRow) => planJournalRow(entry as JournalRow).height,
    [planJournalRow],
  );
  /** Web only: textarea height from content (native multiline grows on its own). */
  const [titleH, setTitleH] = useState(TITLE_MIN_H);
  const [bodyH, setBodyH] = useState(BODY_MIN_H);
  const [viewer, setViewer] = useState<{ uris: string[]; index: number } | null>(null);
  /** Ask-style inline attach menu under the Body box (Photo · Camera · File · Link). */
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  /** The live dictation session (device speech first, AI fallback) and the field text it started from. */
  const dictationRef = useRef<{ target: DictateTarget; session: Dictation | null; base: string } | null>(null);
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
        if (!cancelled) {
          setTaughtClasses(rows.map((row) => ({ id: row.id, name: row.name, avatarUrl: row.avatarUrl ?? null })));
        }
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
          setPointerRoster(
            rows.map((row) => ({ id: row.id, display_name: row.display_name, photoUrl: row.photoUrl ?? null })),
          );
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
      // JOURNAL-ATTACH: one media query per window, grouped onto rows (Feed-style list attachments).
      let media: DiaryMediaRow[] = [];
      try {
        media = await listDiaryMediaFor(rows.map((row) => row.id));
      } catch {
        media = [];
      }
      const byEntry = new Map<string, DiaryMediaRow[]>();
      for (const m of media) byEntry.set(m.entry_id, [...(byEntry.get(m.entry_id) ?? []), m]);
      const withMedia: JournalRow[] = rows.map((row) => ({ ...row, media: byEntry.get(row.id) ?? [] }));
      return sortDiaryEntries(withMedia, sortOldest);
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
      setComposerFiles([]);
      return;
    }
    let cancelled = false;
    void loadDiaryPhotoViews(editing.id).then((views) => {
      if (!cancelled) setComposerPhotos(views);
    });
    void listDiaryMedia(editing.id)
      .then((rows) => {
        if (!cancelled) setComposerFiles(rows.filter((row) => row.kind === 'file'));
      })
      .catch(() => {
        if (!cancelled) setComposerFiles([]);
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
    setStaged([]);
    setTitleH(TITLE_MIN_H);
    setBodyH(BODY_MIN_H);
    setComposerOpen(true);
  }

  function jumpToday() {
    setSelectedDay(todayISO());
    setListJump((n) => n + 1);
  }

  /** Snapshot when Settings opens so Cancel can discard edits. */
  const settingsSnapRef = useRef<typeof filtersRef.current & { journalClassId: string | null } | null>(null);

  function openSettings() {
    settingsSnapRef.current = { ...filtersRef.current, journalClassId };
    setSettingsOpen(true);
  }

  function applySettings() {
    settingsSnapRef.current = null;
    setSettingsOpen(false);
    setListReload((k) => k + 1);
  }

  function cancelSettings() {
    const snap = settingsSnapRef.current;
    settingsSnapRef.current = null;
    setSettingsOpen(false);
    if (!snap) return;
    setSortOldest(snap.sortOldest);
    setFocusedChildId(snap.focus);
    setJournalTag(snap.journalTag);
    setJournalClassId(snap.journalClassId);
    setJournalStudentId(snap.journalStudentId);
    setFamily(snap.family);
    setLedgerFrom(snap.ledgerFrom);
    setLedgerTo(snap.ledgerTo);
    setLedgerClassId(snap.ledgerClassId);
    setLedgerStudentId(snap.ledgerStudentId);
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
    setStaged([]);
    setTitleH(TITLE_MIN_H);
    setBodyH(BODY_MIN_H);
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
      // JOURNAL-INLINE: staged photos upload after the saved ones, so fix their marker numbers.
      const savedBody = renumberStagedPhotoTokens(
        body,
        staged.filter((item) => item.kind === 'photo').map((item) => item.n ?? 0),
        composerPhotos.length,
      );
      if (savedBody !== body) setBody(savedBody);
      let entryId: string;
      if (editing) {
        entryId = editing.id;
        await updateDiaryEntry(editing.id, {
          body: savedBody,
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
          body: savedBody,
          title,
          entryDate,
          tags,
          studentId: studentPointer,
          childStudentId: childId,
        });
        entryId = created.id;
        setEditing(created);
      }
      // JOURNAL-ATTACH: "+" picks are staged, then uploaded here on Done.
      const failed: StagedAttach[] = [];
      let fileError: string | null = null;
      for (const item of staged) {
        try {
          if (item.kind === 'photo') {
            await attachDiaryPhoto({ ownerProfileId: profile.id, seat, entryId, uri: item.uri, mimeType: item.mimeType });
          } else {
            await attachDiaryFile({
              ownerProfileId: profile.id,
              seat,
              entryId,
              uri: item.uri,
              mimeType: item.mimeType,
              name: item.name,
            });
          }
        } catch (err) {
          failed.push(item);
          fileError = err instanceof Error ? err.message : 'Could not attach';
        }
      }
      setDraft(null);
      // JOURNAL-REVEAL: a new entry lands at the top of the list, not above the viewport.
      if (!editing) setListReveal((r) => ({ day: entryDate, nonce: r.nonce + 1 }));
      setListReload((k) => k + 1);
      await refresh();
      if (failed.length) {
        // Entry saved; keep the sheet open with only the attachments that did not upload.
        setStaged(failed);
        setError(fileError);
        return;
      }
      setStaged([]);
      setComposerOpen(false);
      setAttachMenuOpen(false);
      setLinkOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  function stageAttach(kind: StagedAttach['kind'], uri: string, mimeType: string, name: string) {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // JOURNAL-INLINE: leave a marker where the cursor was; the list shows the media there.
    const current = bodyRef.current;
    const stagedPhotos = stagedRef.current.filter((item) => item.kind === 'photo').length;
    const n = kind === 'photo' ? nextPhotoNumber(current, composerPhotos.length + stagedPhotos) : undefined;
    const token = n ? photoToken(n) : fileToken(name);
    const inserted = insertTokenAt(current, bodySelRef.current, token);
    bodyRef.current = inserted.body;
    bodySelRef.current = { start: inserted.cursor, end: inserted.cursor };
    setBody(inserted.body);
    const item: StagedAttach = { key, kind, uri, mimeType, name, token, n };
    stagedRef.current = [...stagedRef.current, item];
    setStaged((prev) => [...prev, item]);
  }

  function removeStaged(item: StagedAttach) {
    setStaged((prev) => prev.filter((p) => p.key !== item.key));
    setBody((current) => removeToken(current, item.token));
  }

  async function attachFileFromPicker() {
    setAttachMenuOpen(false);
    setError(null);
    try {
      if (Platform.OS !== 'web') await waitForModalDismiss();
      const file = await pickMessageDocument();
      if (!file) return;
      if (file.mimeType.startsWith('image/')) stageAttach('photo', file.uri, file.mimeType, file.name);
      else stageAttach('file', file.uri, file.mimeType, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach file');
    }
  }

  async function attachPhotoFromSource(fromCamera: boolean) {
    if (!profile?.id || !seat) return;
    setAttachMenuOpen(false);
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

  function onAttachChoice(choice: AttachChoice) {
    setAttachMenuOpen(false);
    if (choice === 'link') {
      setLinkDraft('');
      setLinkOpen(true);
      return;
    }
    setLinkOpen(false);
    if (choice === 'file') void attachFileFromPicker();
    else void attachPhotoFromSource(choice === 'camera');
  }

  /** Link choice: the address goes into the Body, which renders it as a card. */
  function addLinkToBody() {
    const url = diaryBodyUrls(linkDraft)[0];
    if (!url) {
      setError('Enter a web address, like https://example.com');
      return;
    }
    setError(null);
    setBody((current) => (current.trim() ? `${current.trimEnd()}\n${url}` : url));
    setLinkDraft('');
    setLinkOpen(false);
  }

  async function finishAttachPhoto(uri: string, mimeType: string) {
    stageAttach('photo', uri, mimeType || 'image/jpeg', 'Photo');
  }

  async function onWebDiaryCapture(uri: string, mimeType: string) {
    setCameraOpen(false);
    if (!profile?.id || !seat) return;
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

  async function startDictate(target: DictateTarget) {
    if (dictationRef.current) return;
    setError(null);
    setNotice(null);
    const base = target === 'title' ? title : body;
    const setField = target === 'title' ? setTitle : setBody;
    const slot: { target: DictateTarget; session: Dictation | null; base: string } = { target, session: null, base };
    dictationRef.current = slot;
    try {
      // DEVICE-STT: the device's own speech recognition when available (live words); AI only otherwise.
      const session = await startDictation({
        onPartial: (text) => {
          if (dictationRef.current === slot) setField(joinDictation(base, text));
        },
        onEnded: () => {
          if (dictationRef.current === slot) void stopDictate();
        },
        onTranscribing: () => setTranscribing(true),
      });
      if (dictationRef.current !== slot) {
        session.cancel();
        return;
      }
      slot.session = session;
      setDictateTarget(target);
    } catch (err) {
      if (dictationRef.current === slot) dictationRef.current = null;
      setDictateTarget(null);
      setError(err instanceof Error ? err.message : 'Could not start mic');
    }
  }

  async function stopDictate() {
    const slot = dictationRef.current;
    dictationRef.current = null;
    if (!slot?.session) {
      setDictateTarget(null);
      return;
    }
    const { session, target, base } = slot;
    const setField = target === 'title' ? setTitle : setBody;
    setBusy(true);
    try {
      const text = await session.stop();
      if (session.mode === 'device') setField(joinDictation(base, text));
      else if (text) setField((current) => joinDictation(current, text));
      if (text) setNotice(`Transcript added to ${target === 'title' ? 'Title' : 'Body'} — edit before Done.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not transcribe');
    } finally {
      setDictateTarget(null);
      setTranscribing(false);
      setBusy(false);
    }
  }

  /** Mic tap: same mic stops; the other mic stops first (its text lands), then this one starts. */
  async function toggleDictate(target: DictateTarget) {
    if (busy) return;
    if (dictateTarget === target) {
      await stopDictate();
      return;
    }
    if (dictateTarget) await stopDictate();
    await startDictate(target);
  }

  function renderMic(target: DictateTarget) {
    const active = dictateTarget === target;
    const label = target === 'title' ? 'Title' : 'Body';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={active ? `Stop recording ${label}` : `Record ${label}`}
        accessibilityState={{ selected: active, disabled: busy }}
        disabled={busy}
        hitSlop={6}
        onPress={() => void toggleDictate(target)}
        style={[
          styles.micButton,
          active && { backgroundColor: colors.danger },
          busy && !active && { opacity: 0.4 },
        ]}
      >
        <Icon name="mic" size={20} color={active ? MIC_ON_INK : colors.mute} />
      </Pressable>
    );
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

  const renderJournalItem = (entry: DiaryEntryRow) => {
    const row = entry as JournalRow;
    // JOURNAL-INLINE: the row grows to fit title, body, and inline photos/files (height
    // from the same plan the Day List uses for offsets). Tap a photo for full screen;
    // tap anywhere else to open the entry.
    const plan = planJournalRow(row);
    return (
      <SwipeActionCard
        onPress={() => openEdit(row)}
        accessibilityLabel={plan.compact ? plan.headline : plan.label}
        backgroundColor={colors.wash}
        borderColor={colors.line}
        trailing={[
          // DIARY-SWIPE: right-to-left swipe reveals Delete (no Delete button).
          { key: 'delete', label: 'Delete', tone: 'danger', onPress: () => setPendingDelete(row) },
        ]}
      >
        {plan.compact ? (
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.ink }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {plan.headline}
            </Text>
            <Text style={[styles.rowMeta, { color: colors.mute }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {plan.meta}
            </Text>
          </View>
        ) : (
          <DiaryRowContent
            blocks={plan.blocks}
            media={row.media ?? []}
            onOpenPhotos={(uris, index) => setViewer({ uris, index })}
          />
        )}
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
          <IconButton name="settings" label="Diary settings" onPress={openSettings} />
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
            revealNonce={listReveal.nonce}
            revealDay={listReveal.day}
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
            itemHeight={journalItemHeight}
            collapseChrome={false}
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
            collapseChrome={false}
            emptyLabel="No activity"
          />
        </View>
      )}

      <FormSheet
        visible={composerOpen}
        title={editing ? 'Edit entry' : 'New entry'}
        onClose={() => {
          setComposerOpen(false);
          setAttachMenuOpen(false);
          setLinkOpen(false);
          setError(null);
          setDraft(null);
          setComposerPhotos([]);
          setStaged([]);
          if (recording) void stopDictate();
        }}
      >
        <TextField
          label="Title (optional)"
          value={title}
          onChangeText={setTitle}
          multiline
          submitBehavior="blurAndSubmit"
          scrollEnabled
          onContentSizeChange={
            Platform.OS === 'web'
              ? (e) => setTitleH(clampFieldHeight(e.nativeEvent.contentSize.height, TITLE_MIN_H, TITLE_MAX_H))
              : undefined
          }
          style={[
            styles.titleBox,
            Platform.OS === 'web' ? { height: titleH } : null,
          ]}
          accessory={renderMic('title')}
        />
        <View style={attachMenuOpen ? styles.popoverHost : null}>
          <TextField
          label="Body"
          value={body}
          onChangeText={setBody}
          onFocus={() => setAttachMenuOpen(false)}
          onSelectionChange={(e) => {
            bodySelRef.current = e.nativeEvent.selection;
          }}
          multiline
          scrollEnabled
          onContentSizeChange={
            Platform.OS === 'web'
              ? (e) => setBodyH(clampFieldHeight(e.nativeEvent.contentSize.height, BODY_MIN_H, BODY_MAX_H))
              : undefined
          }
          style={[styles.bodyBox, Platform.OS === 'web' ? { height: bodyH } : null]}
          accessory={renderMic('body')}
          accessoryPlacement="bottom"
          topAccessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add attachment"
              accessibilityState={{ expanded: attachMenuOpen, disabled: busy || recording }}
              disabled={busy || recording}
              hitSlop={6}
              onPress={() => setAttachMenuOpen((open) => !open)}
              style={[styles.micButton, (busy || recording) && { opacity: 0.4 }]}
            >
              <PlusGlyph color={colors.mute} size={PLUS_GLYPH} />
            </Pressable>
          }
          topPopover={
            attachMenuOpen ? (
              <View style={[styles.attachPopover, scheme === 'light' ? shadows.light : null]}>
                <AttachMenu onPick={onAttachChoice} />
              </View>
            ) : undefined
          }
          />
        </View>
        {linkOpen ? (
          <View style={styles.linkRow}>
            <View style={styles.linkField}>
              <TextField
                placeholder="Paste a link"
                value={linkDraft}
                onChangeText={setLinkDraft}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                autoFocus
                onSubmitEditing={addLinkToBody}
              />
            </View>
            <GhostButton label="Add" onPress={addLinkToBody} />
            <IconButton name="close" label="Cancel link" tone="ghost" onPress={() => setLinkOpen(false)} />
          </View>
        ) : null}
        {staged.length || composerFiles.length || diaryBodyUrls(body).length ? (
          <View style={styles.attachStack}>
            {staged.filter((item) => item.kind === 'photo').length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stagedPhotos}>
                {staged
                  .filter((item) => item.kind === 'photo')
                  .map((item) => (
                    <View key={item.key} style={[styles.stagedTile, { borderColor: colors.line, backgroundColor: colors.wash }]}>
                      <RemoteImage uri={item.uri} style={styles.stagedTileImg} contentFit="cover" />
                      {item.n ? (
                        <View style={styles.stagedBadge}>
                          <Text style={styles.stagedBadgeText} maxFontSizeMultiplier={1}>
                            Photo {item.n}
                          </Text>
                        </View>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove photo"
                        hitSlop={8}
                        onPress={() => removeStaged(item)}
                        style={styles.stagedRemove}
                      >
                        <Icon name="close" size={12} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
              </ScrollView>
            ) : null}
            {composerFiles.map((file) => (
              <DiaryFileChip
                key={file.id}
                name={file.file_name || 'File'}
                onPress={() =>
                  void diaryMediaSignedUrl(file.storage_path).then((url) => {
                    if (url) void Linking.openURL(url);
                  })
                }
              />
            ))}
            {staged
              .filter((item) => item.kind === 'file')
              .map((item) => (
                <DiaryFileChip
                  key={item.key}
                  name={item.name}
                  onRemove={() => removeStaged(item)}
                />
              ))}
            {diaryBodyUrls(body).map((url) => (
              <DiaryLinkCard key={url} url={url} />
            ))}
          </View>
        ) : null}
        {transcribing ? (
          <Text style={[type.meta, { color: colors.mute }]}>Transcribing…</Text>
        ) : null}
        <TextField
          label="Date (YYYY-MM-DD)"
          value={entryDate}
          onChangeText={setEntryDate}
          autoCapitalize="none"
        />
        {editing ? (
          <DiaryPhotoStrip
            photos={composerPhotos}
            onBroken={(photoId) => dropBrokenPhoto(editing.id, photoId)}
            onOpen={(uris, index) => setViewer({ uris, index })}
          />
        ) : null}
        {teacherLike ? (
          <>
            {/* Soft student pointer: private search only — not an ACL. */}
            <Text style={[styles.fieldLabel, { color: colors.mute }]}>
              Tag to a Student - Kept private only in your Journal
            </Text>
            {taughtClasses.length ? (
              <>
                <PersonTabs
                  compact
                  tabs={[
                    ...taughtClasses.map((klass) => ({
                      key: klass.id,
                      label: klass.name,
                      photoName: klass.name,
                      photoUrl: klass.avatarUrl ?? null,
                    })),
                    { key: NO_CLASS_TAB, label: 'No class', icon: 'none' as const },
                  ]}
                  value={pointerClassId ?? NO_CLASS_TAB}
                  onChange={(key) => {
                    if (key === NO_CLASS_TAB) {
                      setPointerClassId(null);
                      setStudentPointer(null);
                    } else {
                      setPointerClassId(key);
                      setStudentPointer(null);
                    }
                  }}
                />
                {pointerClassId ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.studentRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    {pointerRoster.map((student) => {
                      const selected = studentPointer === student.id;
                      const name = firstName(student.display_name);
                      return (
                        <Pressable
                          key={student.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Tag ${student.display_name}`}
                          accessibilityState={{ selected }}
                          onPress={() => setStudentPointer((current) => (current === student.id ? null : student.id))}
                          style={styles.studentPick}
                        >
                          <View
                            style={[
                              styles.studentRing,
                              { borderColor: selected ? colors.brand : 'transparent' },
                            ]}
                          >
                            <Avatar
                              name={student.display_name}
                              photoUrl={student.photoUrl}
                              hasPhoto={Boolean(student.photoUrl)}
                              size={44}
                              recyclingKey={student.id}
                            />
                          </View>
                          <Text
                            numberOfLines={1}
                            style={[
                              type.meta,
                              styles.studentName,
                              { color: selected ? colors.brand : colors.ink },
                              selected && styles.studentNameSelected,
                            ]}
                          >
                            {name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : isOfficeChromeRole(chrome.role) ? null : studentPointer ? (
                  <Text style={[type.meta, { color: colors.mute }]}>
                    Student tagged — pick a class to change it, or Clear.
                  </Text>
                ) : (
                  <Text style={[type.meta, { color: colors.mute }]}>
                    Optional: pick a class, then the student to tag.
                  </Text>
                )}
                {studentPointer ? (
                  <GhostButton
                    label="Clear student tag"
                    onPress={() => {
                      setStudentPointer(null);
                      setPointerClassId(null);
                    }}
                  />
                ) : null}
              </>
            ) : isOfficeChromeRole(chrome.role) ? null : (
              <Text style={[type.meta, { color: colors.mute }]}>
                Tagging a student needs a class you teach. Teachers do not create classes from Diary.
              </Text>
            )}
          </>
        ) : null}
        <TextField
          label="Tags (comma-separated)"
          value={tagsText}
          onChangeText={setTagsText}
          autoCapitalize="none"
        />

        {/* JOURNAL-ATTACH: the screen's error line sits behind the sheet, so show failures here too. */}
        {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Saving…' : 'Done'} onPress={() => void saveEntry()} disabled={busy || recording} />
      </FormSheet>


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
        onCancel={cancelSettings}
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
      if (row.kind !== 'photo') continue;
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
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBox: { minHeight: TITLE_MIN_H, maxHeight: TITLE_MAX_H },
  bodyBox: { minHeight: BODY_MIN_H, maxHeight: BODY_MAX_H },
  attachStack: { gap: 8 },
  /** Lifts the Body field above later siblings so its + pop-up floats over them. */
  popoverHost: { zIndex: 20, elevation: 20 },
  attachPopover: { width: 180, borderRadius: 12 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkField: { flex: 1, minWidth: 0 },
  stagedPhotos: { gap: 8 },
  /**
   * Fixed-size staged thumbnails. A % width inside a horizontal ScrollView has no width
   * to resolve against, so the old 100%/4:3 tile collapsed and the Date field drew over it.
   */
  stagedTile: { width: 96, height: 96, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  stagedTileImg: { width: '100%', height: '100%' },
  stagedBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  stagedBadgeText: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  stagedRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentRow: { gap: 12, paddingVertical: 4, paddingRight: 8 },
  studentPick: { alignItems: 'center', width: 60, gap: 4 },
  studentRing: { borderWidth: 2, borderRadius: 26, padding: 2 },
  studentName: { maxWidth: 60, textAlign: 'center' },
  studentNameSelected: { fontWeight: '600' },
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
  /** Same look as TextField labels (sentence case, no caps). */
  fieldLabel: {
    ...type.meta,
    marginBottom: 8,
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
