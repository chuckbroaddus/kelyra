/** Client DTO for CAL-R2. Views bind only to these — never Postgres or vendor Event APIs. */

export type CalendarSeat = 'teacher' | 'student' | 'parent' | 'office';

export type CalendarRoleTint = 'academic' | 'school' | 'sport' | 'personal';

export type CalendarLayerKind =
  | 'school'
  | 'class'
  | 'class_work'
  | 'team'
  | 'personal'
  | 'absence'
  | 'external';

export type CalendarItemSource = 'assignment' | 'event';

export type CalendarLayer = {
  id: string;
  kind: CalendarLayerKind | string;
  name: string;
  roleTint: CalendarRoleTint | string;
  classId: string | null;
  defaultEnabled: boolean;
  isReadOnly: boolean;
  canUnsubscribe: boolean;
};

export type CalendarItem = {
  source: CalendarItemSource;
  id: string;
  calendarId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  category: string;
  roleTint: CalendarRoleTint | string;
  classId: string | null;
  studentId: string | null;
  visibility: string | null;
  /** Teacher DP-A only. Family rows never true (hidden rows absent). */
  isHidden: boolean;
  isReadOnly: boolean;
  isDraft: boolean;
  deepLink: string | null;
};

/** Raw RPC row (snake_case). */
export type CalendarItemRow = {
  source: string;
  id: string;
  calendar_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  category: string;
  role_tint: string;
  class_id: string | null;
  student_id: string | null;
  visibility: string | null;
  is_hidden: boolean;
  is_read_only: boolean;
  is_draft: boolean;
  deep_link: string | null;
};

export type CalendarLayerRow = {
  id: string;
  kind: string;
  name: string;
  role_tint: string;
  class_id: string | null;
  default_enabled: boolean;
  is_read_only: boolean;
  can_unsubscribe: boolean;
};
