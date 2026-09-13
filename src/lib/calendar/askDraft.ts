/**
 * CAL-R2 Phase E: Ask calendar_draft_event parks an unsaved CR-A draft.
 * Save is EventComposer → create_calendar_event. Never inserts students/classes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CalendarEventKind, CalendarSeat } from './types.ts';
import {
  categoriesForKind,
  datePart,
  defaultKindForSeat,
  scopeForKind,
  timePart,
  visibilityCaption,
} from './visibility.ts';

export type PendingCalendarDraft = {
  kind: CalendarEventKind;
  title: string;
  startDate: string | null;
  endDate: string | null;
  allDay: boolean;
  startTime: string;
  endTime: string;
  category: string;
  body: string;
  classId?: string | null;
  childStudentId?: string | null;
  source: 'ai_nl';
};

const PENDING_PREFIX = 'kelyra.calendar.pendingDraft.';

export const REVIEW_DRAFT_BANNER = 'Review draft — not saved';

export function parkCalendarDraft(draft: PendingCalendarDraft): PendingCalendarDraft {
  return {
    kind: draft.kind,
    title: String(draft.title ?? '').trim(),
    startDate: draft.startDate,
    endDate: draft.endDate ?? null,
    allDay: Boolean(draft.allDay),
    startTime: draft.startTime || '09:00',
    endTime: draft.endTime || '',
    category: draft.category,
    body: String(draft.body ?? ''),
    classId: draft.classId ?? null,
    childStudentId: draft.childStudentId ?? null,
    source: 'ai_nl',
  };
}

export async function parkPendingCalendarDraft(
  profileId: string,
  draft: PendingCalendarDraft,
): Promise<void> {
  await AsyncStorage.setItem(
    `${PENDING_PREFIX}${profileId}`,
    JSON.stringify(parkCalendarDraft(draft)),
  );
}

export async function takePendingCalendarDraft(
  profileId: string,
): Promise<PendingCalendarDraft | null> {
  const key = `${PENDING_PREFIX}${profileId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    await AsyncStorage.removeItem(key);
    const parsed = JSON.parse(raw) as PendingCalendarDraft;
    if (!parsed?.title?.trim()) return null;
    return parkCalendarDraft(parsed);
  } catch {
    return null;
  }
}

export type CalendarDraftBuildInput = {
  seat: CalendarSeat;
  title: string;
  kind?: string | null;
  category?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  allDay?: boolean;
  body?: string | null;
  classId?: string | null;
  childStudentId?: string | null;
  childName?: string | null;
  /** Linked children for parent twin wall (id + display_name). */
  linkedChildren?: Array<{ id: string; display_name: string }>;
  /** Explicit refuse flags the model may emit — always denied. */
  createClass?: boolean;
  addStudent?: boolean;
  approveGrade?: boolean;
  twinMerge?: boolean;
  fileDiary?: boolean;
  schoolBlast?: boolean;
};

export type CalendarDraftBuildResult =
  | { ok: true; draft: PendingCalendarDraft; visibilityCaption: string; banner: string }
  | { ok: false; error: string };

/**
 * Pure builder + refuse matrix for calendar_draft_event (CAL-09).
 * Does not persist. Never invents students/classes.
 */
export function buildCalendarAskDraft(input: CalendarDraftBuildInput): CalendarDraftBuildResult {
  if (input.createClass) {
    return { ok: false, error: 'Ask cannot create a class. Office owns classes.' };
  }
  if (input.addStudent) {
    return { ok: false, error: 'Ask cannot insert a student. Office owns roster identity.' };
  }
  if (input.approveGrade) {
    return { ok: false, error: 'Ask calendar tools never Approve grades.' };
  }
  if (input.twinMerge) {
    return { ok: false, error: 'Twins stay separate. Focus one child, then try again.' };
  }
  if (input.fileDiary) {
    return { ok: false, error: 'Calendar add does not file Diary. Use draft_diary_entry for journal.' };
  }
  if (input.schoolBlast && input.seat !== 'office') {
    return { ok: false, error: 'Only office can create school-wide events.' };
  }

  const title = String(input.title ?? '').trim();
  if (!title) return { ok: false, error: 'Need a title for the calendar draft.' };

  let childStudentId = input.childStudentId ?? null;
  const childName = (input.childName ?? '').trim();
  if (input.seat === 'parent' && childName && input.linkedChildren?.length) {
    const needle = childName.toLowerCase();
    const matches = input.linkedChildren.filter((c) => {
      const n = c.display_name.toLowerCase();
      return n === needle || n.startsWith(needle) || n.includes(needle);
    });
    if (matches.length > 1) {
      return {
        ok: false,
        error: `Which child — ${matches.map((m) => m.display_name).join(' or ')}? Twins never merge.`,
      };
    }
    if (matches.length === 1) childStudentId = matches[0]!.id;
    if (matches.length === 0) {
      return { ok: false, error: 'No linked child matches that name. Pick a focused child first.' };
    }
  }

  if (input.seat === 'parent' && !childStudentId && input.linkedChildren?.length === 1) {
    childStudentId = input.linkedChildren[0]!.id;
  }

  let kindRaw = (input.kind ?? '').trim().toLowerCase();
  if (!kindRaw) {
    kindRaw =
      defaultKindForSeat(input.seat, {
        classId: input.classId,
        childStudentId,
      }) ?? 'personal';
  }

  if (kindRaw === 'school' && input.seat !== 'office') {
    return { ok: false, error: 'Only office can create school-wide events.' };
  }
  if (input.seat === 'office' && kindRaw !== 'school') {
    return { ok: false, error: 'Office calendar drafts are school events only.' };
  }
  if (input.seat === 'student' && kindRaw !== 'personal') {
    return { ok: false, error: 'Students may only draft personal study blocks.' };
  }
  if (input.seat === 'teacher' && kindRaw === 'absence') {
    return { ok: false, error: 'Teachers cannot draft parent absences.' };
  }
  if (input.seat === 'parent' && kindRaw === 'class') {
    return { ok: false, error: 'Parents cannot draft class events.' };
  }
  if (kindRaw === 'class' && !input.classId) {
    return { ok: false, error: 'Open a taught class before drafting a class event.' };
  }
  if (kindRaw === 'absence' && !childStudentId) {
    return { ok: false, error: 'Focus a linked child before drafting an absence.' };
  }

  const kind = kindRaw as CalendarEventKind;
  if (!['school', 'class', 'personal', 'absence'].includes(kind)) {
    return { ok: false, error: 'Unknown event kind.' };
  }

  let category = (input.category ?? '').trim().toLowerCase();
  const allowed = categoriesForKind(kind);
  if (!category || !allowed.includes(category)) {
    category = allowed[0] ?? kind;
  }
  if (input.seat === 'student' && category !== 'study' && category !== 'personal') {
    category = 'study';
  }

  let startDate = input.startDate ?? null;
  let endDate = input.endDate ?? null;
  let startTime = '09:00';
  let endTime = '';
  let allDay = input.allDay !== false;

  if (input.startsAt) {
    startDate = datePart(input.startsAt);
    const t = timePart(input.startsAt);
    if (t && input.allDay !== true) {
      allDay = false;
      startTime = t;
    }
  }
  if (input.endsAt) {
    endDate = datePart(input.endsAt);
    const t = timePart(input.endsAt);
    if (t && !allDay) endTime = t;
  }
  if (!startDate) {
    startDate = datePart(new Date().toISOString());
  }

  const draft = parkCalendarDraft({
    kind,
    title,
    startDate,
    endDate,
    allDay,
    startTime,
    endTime,
    category,
    body: input.body ?? '',
    classId: kind === 'class' ? input.classId ?? null : null,
    childStudentId: kind === 'absence' ? childStudentId : null,
    source: 'ai_nl',
  });

  return {
    ok: true,
    draft,
    visibilityCaption: visibilityCaption(scopeForKind(kind), category),
    banner: REVIEW_DRAFT_BANNER,
  };
}
