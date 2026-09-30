/**
 * Load class grading calendar (GB-02 tables). Null when unbound → legacy UI.
 */
import type { GradingCalendar, MarkingPeriod, TermRollup } from '../../lib/grade/calendar/types.ts';
import { requireSupabase } from '../../lib/supabase/client.ts';

type CalRow = {
  id: string;
  school_id: string | null;
  name: string;
  level: GradingCalendar['level'];
  period_model: GradingCalendar['period_model'];
  rollups: unknown;
  show_interims_in_filter: boolean;
  glyph_scope: GradingCalendar['glyph_scope'];
};

type MpRow = {
  id: string;
  calendar_id: string;
  code: string;
  name: string;
  kind: MarkingPeriod['kind'];
  parent_id: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
};

function asRollups(raw: unknown): TermRollup[] {
  if (!Array.isArray(raw)) return [];
  return raw as TermRollup[];
}

export async function loadClassGradingCalendar(
  classId: string,
): Promise<GradingCalendar | null> {
  if (!classId) return null;
  const supabase = requireSupabase();
  const { data: klass, error: classErr } = await supabase
    .from('classes')
    .select('grading_calendar_id')
    .eq('id', classId)
    .maybeSingle();
  if (classErr) throw classErr;
  const calId = (klass as { grading_calendar_id?: string | null } | null)?.grading_calendar_id;
  if (!calId) return null;

  const [{ data: cal, error: calErr }, { data: periods, error: mpErr }] = await Promise.all([
    supabase.from('grading_calendars').select('*').eq('id', calId).maybeSingle(),
    supabase
      .from('marking_periods')
      .select('*')
      .eq('calendar_id', calId)
      .order('sort_order', { ascending: true }),
  ]);
  if (calErr) throw calErr;
  if (mpErr) throw mpErr;
  if (!cal) return null;

  const row = cal as CalRow;
  const mps = (periods ?? []) as MpRow[];

  return {
    id: row.id,
    school_id: row.school_id,
    name: row.name,
    level: row.level,
    period_model: row.period_model,
    periods: mps.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      kind: p.kind,
      parent_id: p.parent_id,
      start_date: p.start_date,
      end_date: p.end_date,
      sort_order: p.sort_order,
    })),
    rollups: asRollups(row.rollups),
    show_interims_in_filter: Boolean(row.show_interims_in_filter),
    glyph_scope: row.glyph_scope ?? 'semester',
  };
}
