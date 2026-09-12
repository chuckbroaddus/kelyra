import type {
  CalendarItem,
  CalendarItemRow,
  CalendarItemSource,
  CalendarLayer,
  CalendarLayerRow,
} from './types.ts';

/** Map RPC assignment/event row → CalendarItem. No scores/drafts/classmate fields exist on the row. */
export function mapCalendarItemRow(row: CalendarItemRow): CalendarItem {
  const source: CalendarItemSource = row.source === 'event' ? 'event' : 'assignment';
  return {
    source,
    id: row.id,
    calendarId: row.calendar_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: Boolean(row.all_day),
    category: row.category || 'homework',
    roleTint: row.role_tint || 'academic',
    classId: row.class_id,
    studentId: row.student_id,
    visibility: row.visibility,
    isHidden: source === 'assignment' ? Boolean(row.is_hidden) : false,
    isReadOnly: Boolean(row.is_read_only),
    isDraft: Boolean(row.is_draft),
    deepLink: row.deep_link,
  };
}

export function mapCalendarLayerRow(row: CalendarLayerRow): CalendarLayer {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    roleTint: row.role_tint || 'academic',
    classId: row.class_id,
    defaultEnabled: Boolean(row.default_enabled),
    isReadOnly: Boolean(row.is_read_only),
    canUnsubscribe: Boolean(row.can_unsubscribe),
  };
}

/** Local YYYY-MM-DD of an item start (due/event). */
export function itemDayKey(item: CalendarItem, timeZone?: string): string {
  const d = new Date(item.startsAt);
  if (Number.isNaN(d.getTime())) return item.startsAt.slice(0, 10);
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    } catch {
      /* fall through */
    }
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
