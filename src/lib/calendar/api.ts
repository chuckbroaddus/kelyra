import { mapCalendarItemRow, mapCalendarLayerRow } from '@/lib/calendar/mapItem';
import type {
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
