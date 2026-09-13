import { mapCalendarItemRow, mapCalendarLayerRow } from '@/lib/calendar/mapItem';
import type {
  CalendarEventDetail,
  CalendarEventKind,
  CalendarItem,
  CalendarItemRow,
  CalendarLayer,
  CalendarLayerRow,
  CalendarSeat,
} from '@/lib/calendar/types';
import { requireSupabase } from '@/lib/supabase/client';
import type { AssignmentRow } from '@/lib/supabase/types';

/** Untyped until Database types regenerate after devops-release applies migrations. */
function calDb(): any {
  return requireSupabase();
}

export type ListCalendarItemsInput = {
  from: string;
  to: string;
  seat: CalendarSeat;
  classId?: string | null;
  childStudentId?: string | null;
  categories?: string[] | null;
  calendarIds?: string[] | null;
};

export async function listCalendarItems(input: ListCalendarItemsInput): Promise<CalendarItem[]> {
  const { data, error } = await calDb().rpc('list_calendar_items', {
    p_from: input.from,
    p_to: input.to,
    p_seat: input.seat,
    p_class_id: input.classId ?? null,
    p_child_student_id: input.childStudentId ?? null,
    p_categories: input.categories?.length ? input.categories : null,
    p_calendar_ids: input.calendarIds?.length ? input.calendarIds : null,
  });
  if (error) throw error;
  return ((data ?? []) as CalendarItemRow[]).map(mapCalendarItemRow);
}

export async function listCalendars(input: {
  seat: CalendarSeat;
  childStudentId?: string | null;
}): Promise<CalendarLayer[]> {
  const { data, error } = await calDb().rpc('list_calendars', {
    p_seat: input.seat,
    p_child_student_id: input.childStudentId ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as CalendarLayerRow[]).map(mapCalendarLayerRow);
}

export type HiddenCalendarDue = {
  id: string;
  classId: string;
  title: string;
  category: string;
  dueAt: string;
  calendarVisibility: string;
};

/** Needs queue: hidden dated assignments for Publish to calendar (teacher). */
export async function listHiddenCalendarDues(classId?: string | null): Promise<HiddenCalendarDue[]> {
  const { data, error } = await calDb().rpc('list_hidden_calendar_dues', {
    p_class_id: classId ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{
    id: string;
    class_id: string;
    title: string;
    category: string;
    due_at: string;
    calendar_visibility: string;
  }>).map((row) => ({
    id: row.id,
    classId: row.class_id,
    title: row.title,
    category: row.category,
    dueAt: row.due_at,
    calendarVisibility: row.calendar_visibility,
  }));
}

/** Publish hidden due to family calendar. Server enforces class_teacher_of. */
export async function publishAssignmentToCalendar(assignmentId: string): Promise<AssignmentRow> {
  const { data, error } = await calDb().rpc('publish_assignment_to_calendar', {
    p_assignment_id: assignmentId,
  });
  if (error) throw error;
  return data as AssignmentRow;
}

export type CreateCalendarEventInput = {
  seat: CalendarSeat;
  kind: CalendarEventKind;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  category?: string | null;
  body?: string | null;
  classId?: string | null;
  childStudentId?: string | null;
  /** Phase E Ask Save stamps ai_nl; UI manual stays default. */
  source?: 'manual' | 'ai_nl';
};

export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<{ id: string }> {
  const { data, error } = await calDb().rpc('create_calendar_event', {
    p_seat: input.seat,
    p_kind: input.kind,
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt ?? null,
    p_all_day: input.allDay ?? true,
    p_category: input.category ?? null,
    p_body: input.body ?? null,
    p_class_id: input.classId ?? null,
    p_child_student_id: input.childStudentId ?? null,
    p_source: input.source ?? 'manual',
  });
  if (error) throw error;
  const row = data as { id?: string } | null;
  if (!row?.id) throw new Error('Save did not return an event');
  return { id: row.id };
}

export type UpdateCalendarEventInput = {
  seat: CalendarSeat;
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  category?: string | null;
  body?: string | null;
};

export async function updateCalendarEvent(input: UpdateCalendarEventInput): Promise<void> {
  const { error } = await calDb().rpc('update_calendar_event', {
    p_seat: input.seat,
    p_id: input.id,
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt ?? null,
    p_all_day: input.allDay ?? true,
    p_category: input.category ?? null,
    p_body: input.body ?? null,
  });
  if (error) throw error;
}

export async function deleteCalendarEvent(input: { seat: CalendarSeat; id: string }): Promise<void> {
  const { error } = await calDb().rpc('delete_calendar_event', {
    p_seat: input.seat,
    p_id: input.id,
  });
  if (error) throw error;
}

export async function getCalendarEvent(input: {
  seat: CalendarSeat;
  id: string;
  classId?: string | null;
  childStudentId?: string | null;
}): Promise<CalendarEventDetail | null> {
  const { data, error } = await calDb().rpc('get_calendar_event', {
    p_seat: input.seat,
    p_id: input.id,
    p_class_id: input.classId ?? null,
    p_child_student_id: input.childStudentId ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? null,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? null,
    allDay: Boolean(row.all_day),
    category: row.category,
    visibilityScope: row.visibility_scope,
    visibilityCaption: row.visibility_caption,
    classId: row.class_id ?? null,
    studentId: row.student_id ?? null,
    ownerProfileId: row.owner_profile_id,
    canEdit: Boolean(row.can_edit),
    canDelete: Boolean(row.can_delete),
    deleteDisabledReason: row.delete_disabled_reason ?? null,
  };
}

/** CAL-08 Leave team membership. Events remain for others. Never labeled Delete. */
export async function unsubscribeTeam(input: {
  seat: CalendarSeat;
  calendarId: string;
  childStudentId?: string | null;
}): Promise<void> {
  const { error } = await calDb().rpc('unsubscribe_team', {
    p_seat: input.seat,
    p_calendar_id: input.calendarId,
    p_child_student_id: input.childStudentId ?? null,
  });
  if (error) throw error;
}

