import type { CalendarEventKind, CalendarLayer, CalendarSeat } from '@/lib/calendar/types';

/**
 * CAL-COMPOSE-TARGETS: one chip per calendar this seat may create events on.
 *
 * Control, not visibility: a teacher sees the School calendar but cannot post to
 * it, so it is never a target. Server (`create_calendar_event`) is the real gate:
 * school = office + school admin; class = `class_teacher_of`; personal = self;
 * absence = parent of a linked child. Extracurricular activity calendars will
 * join here (one per activity the teacher runs) when that feature ships.
 */
export type ComposerTarget = {
  /** Stable chip key; also the selected value in the draft. */
  key: string;
  kind: CalendarEventKind;
  classId: string | null;
  label: string;
  roleTint: string;
};

export function composerTargetKey(kind: CalendarEventKind, classId?: string | null): string {
  return kind === 'class' ? `class:${classId ?? ''}` : kind;
}

function layerName(layers: CalendarLayer[], kind: string, fallback: string): string {
  const name = layers.find((l) => l.kind === kind)?.name?.trim();
  return name || fallback;
}

export function composerTargets(
  seat: CalendarSeat,
  layers: CalendarLayer[],
  opts: { classId?: string | null; childStudentId?: string | null } = {},
): ComposerTarget[] {
  const out: ComposerTarget[] = [];
  if (seat === 'office') {
    out.push({
      key: 'school',
      kind: 'school',
      classId: null,
      label: layerName(layers, 'school', 'School'),
      roleTint: 'school',
    });
    return out;
  }
  if (seat === 'teacher') {
    const seen = new Set<string>();
    const classes = layers
      .filter((l) => l.kind === 'class' && l.classId)
      .filter((l) => {
        if (seen.has(l.classId!)) return false;
        seen.add(l.classId!);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    for (const l of classes) {
      out.push({
        key: composerTargetKey('class', l.classId),
        kind: 'class',
        classId: l.classId,
        label: l.name.trim() || 'Class',
        roleTint: l.roleTint || 'academic',
      });
    }
    // Opened from a class whose layer has not loaded yet — still offer it.
    if (opts.classId && !seen.has(opts.classId)) {
      out.unshift({
        key: composerTargetKey('class', opts.classId),
        kind: 'class',
        classId: opts.classId,
        label: 'This class',
        roleTint: 'academic',
      });
    }
  }
  if (seat === 'parent' && opts.childStudentId) {
    out.push({ key: 'absence', kind: 'absence', classId: null, label: 'Absence', roleTint: 'personal' });
  }
  if (seat === 'teacher' || seat === 'student' || seat === 'parent') {
    out.push({
      key: 'personal',
      kind: 'personal',
      classId: null,
      label: layerName(layers, 'personal', 'Personal'),
      roleTint: 'personal',
    });
  }
  return out;
}
