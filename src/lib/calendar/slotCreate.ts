/**
 * CAL-P6-10B — empty hour slot → Add Event prefill (no confirm sheet).
 */
import type { PendingCalendarDraft } from './askDraft.ts';
import {
  CAL_P6_10B_DEFAULT_DURATION_MIN,
  CAL_P6_10B_SLOT_CREATE,
} from './p6Laws.ts';
import type { CalendarEventKind } from './types.ts';

export { CAL_P6_10B_SLOT_CREATE };

function hm(hour: number, minute = 0): string {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Build a lean create draft for day + hour slot. Title stays empty. */
export function slotCreateDraft(
  dayIso: string,
  hour: number,
  opts?: {
    kind?: CalendarEventKind;
    category?: string;
    durationMin?: number;
  },
): PendingCalendarDraft {
  const duration = opts?.durationMin ?? CAL_P6_10B_DEFAULT_DURATION_MIN;
  const startMinute = Math.round(hour) * 60;
  const endMinute = startMinute + duration;
  const endH = Math.floor(endMinute / 60);
  const endM = endMinute % 60;
  return {
    kind: opts?.kind ?? 'personal',
    title: '',
    startDate: dayIso.slice(0, 10),
    endDate: dayIso.slice(0, 10),
    allDay: false,
    startTime: hm(hour, 0),
    endTime: hm(endH > 23 ? 23 : endH, endH > 23 ? 59 : endM),
    category: opts?.category ?? 'personal',
    body: '',
    source: 'slot_create',
  };
}
