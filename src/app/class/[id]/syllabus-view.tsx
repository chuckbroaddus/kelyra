/**
 * GB-09 Class → Syllabus view (read-only PolicyView). Families + "Preview as family".
 */
import { useCallback, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getClass } from '@/lib/classes/api';
import type { GradingCalendar } from '@/lib/grade/calendar/types';
import type { PolicyViewAudience, PolicyViewModel } from '@/lib/grade/policyView';
import { loadLatestPolicyView, resolvePolicyViewModel } from '@/lib/grade/policyViewApi';
import { requireSupabase } from '@/lib/supabase/client';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { PolicyViewBody } from '@/app/school/view/PolicyViewBody';

export default function SyllabusViewScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, teacher } = useAuth();
  const chrome = useChrome();
  usePushedTitle(chrome.className ? `${chrome.className} syllabus` : 'Syllabus');

  const [model, setModel] = useState<PolicyViewModel | null>(null);
  const [calendar, setCalendar] = useState<GradingCalendar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const audience: PolicyViewAudience = useMemo(() => {
    if (teacher) return 'parent';
    if (profile?.role === 'student') return 'student';
    return 'parent';
  }, [teacher, profile?.role]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const klass = await getClass(id);
      let row = null as Awaited<ReturnType<typeof loadLatestPolicyView>>;
      try {
        row = await loadLatestPolicyView({ kind: 'syllabus', refId: id });
      } catch {
        row = null;
      }

      let syllabusSnap: Record<string, unknown> | null = null;
      let cal: GradingCalendar | null = null;
      const supabase = requireSupabase();
      const calId = (klass as { grading_calendar_id?: string | null }).grading_calendar_id;
      if (calId) {
        const { data: calRow } = await supabase
          .from('grading_calendars' as never)
          .select('*')
          .eq('id', calId)
          .maybeSingle();
        const { data: periods } = await supabase
          .from('marking_periods' as never)
          .select('*')
          .eq('calendar_id', calId)
          .order('sort_order', { ascending: true });
        if (calRow) {
          const c = calRow as Record<string, unknown>;
          cal = {
            id: String(c.id),
            school_id: (c.school_id as string | null) ?? null,
            name: String(c.name ?? 'Calendar'),
            level: (c.level as GradingCalendar['level']) ?? 'high',
            period_model: (c.period_model as GradingCalendar['period_model']) ?? 'nine_weeks',
            periods: ((periods as unknown[]) ?? []).map((p) => {
              const rowP = p as Record<string, unknown>;
              return {
                id: String(rowP.id),
                code: String(rowP.code),
                name: String(rowP.name),
                kind: rowP.kind as GradingCalendar['periods'][0]['kind'],
                parent_id: (rowP.parent_id as string | null) ?? null,
                start_date: (rowP.start_date as string | null) ?? null,
                end_date: (rowP.end_date as string | null) ?? null,
                sort_order: Number(rowP.sort_order ?? 0),
              };
            }),
            rollups: (c.rollups as GradingCalendar['rollups']) ?? [],
            show_interims_in_filter: Boolean(c.show_interims_in_filter),
            glyph_scope: (c.glyph_scope as GradingCalendar['glyph_scope']) ?? 'semester',
          };
        }
      }
      setCalendar(cal);

      if (!row || !isRendered(row.rendered)) {
        const { data: syl } = await supabase
          .from('class_syllabi' as never)
          .select('id, title, syllabus_version, status')
          .eq('class_id', id)
          .eq('status', 'published')
          .maybeSingle();
        if (syl) {
          const s = syl as { id: string };
          const { data: ver } = await supabase
            .from('syllabus_versions' as never)
            .select('snapshot, version, published_at')
            .eq('syllabus_id', s.id)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (ver) {
            const v = ver as {
              snapshot: Record<string, unknown>;
              version: number;
              published_at: string;
            };
            syllabusSnap = v.snapshot;
            row = row ?? {
              id: 'live',
              kind: 'syllabus',
              ref_id: id,
              version: v.version,
              snapshot: v.snapshot,
              rendered: {},
              published_at: v.published_at,
            };
          }
        }
      }

      const next = resolvePolicyViewModel({
        row,
        kind: 'syllabus',
        refId: id,
        className: klass?.name ?? chrome.className,
        syllabusSnapshot: syllabusSnap ?? (row?.snapshot as never),
        calendar: cal,
        version: row?.version,
        publishedAt: row?.published_at,
      });
      setModel(next);
      if (!next) setError('No published syllabus view yet.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load syllabus view');
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [id, chrome.className]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen maxWidth={720}>
      {loading ? <Text style={[type.body, { color: colors.mute }]}>Loading syllabus…</Text> : null}
      {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
      {model ? (
        <PolicyViewBody model={model} audience={audience} calendar={calendar as never} />
      ) : null}
    </Screen>
  );
}

function isRendered(v: unknown): boolean {
  return Boolean(v && typeof v === 'object' && 'how_built_sentence' in (v as object));
}
