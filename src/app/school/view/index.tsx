/**
 * GB-09 School View hub (FR-HUB / FR-SCHOOL-* + card extras).
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { PeriodGlyph } from '@/components/ui/PeriodGlyph';
import { glyphsForCalendar } from '@/components/ui/periodGlyphs';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import type { GradingCalendar } from '@/lib/grade/calendar/types';
import type { PolicyViewModel } from '@/lib/grade/policyView';
import { loadLatestPolicyView, resolvePolicyViewModel } from '@/lib/grade/policyViewApi';
import { listPostedPeriodGrades, listTermGrades } from '@/lib/grade/posting/api';
import { requireSupabase } from '@/lib/supabase/client';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { PolicyViewBody } from './PolicyViewBody';

type TabId = 'grading_reporting' | 'calendar' | 'syllabi' | 'grades' | 'class_rank' | 'overview';

const TABS: { id: TabId; label: string }[] = [
  { id: 'grading_reporting', label: 'Grading policy' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'syllabi', label: 'My syllabi' },
  { id: 'grades', label: 'Posted grades' },
  { id: 'class_rank', label: 'Class Rank & GPA' },
  { id: 'overview', label: 'Overview' },
];

export default function SchoolViewHubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const chrome = useChrome();
  usePushedTitle('School');

  const [tab, setTab] = useState<TabId>('grading_reporting');
  const [policy, setPolicy] = useState<PolicyViewModel | null>(null);
  const [calendar, setCalendar] = useState<GradingCalendar | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [posted, setPosted] = useState<Array<Record<string, unknown>>>([]);
  const [terms, setTerms] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const schoolId = profile?.school_id ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const classList = (chrome.classes ?? []).map((c) => ({ id: c.id, name: c.name }));
      setClasses(classList);

      let row = null as Awaited<ReturnType<typeof loadLatestPolicyView>>;
      if (schoolId) {
        try {
          row = await loadLatestPolicyView({ kind: 'school', refId: schoolId });
        } catch {
          row = null;
        }
      }

      let payload: Record<string, unknown> | null = null;
      let cal: GradingCalendar | null = null;
      if (schoolId) {
        const supabase = requireSupabase();
        const { data: pol } = await supabase
          .from('grading_policies' as never)
          .select('payload, version, published_at, status')
          .eq('school_id', schoolId)
          .eq('status', 'published')
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pol) {
          const p = pol as {
            payload: Record<string, unknown>;
            version: number;
            published_at: string | null;
          };
          payload = p.payload;
          cal = (p.payload.calendar as GradingCalendar) ?? null;
          if (!row) {
            row = {
              id: 'live',
              kind: 'school',
              ref_id: schoolId,
              version: p.version,
              snapshot: p.payload,
              rendered: {},
              published_at: p.published_at,
            };
          }
        }
      }
      setCalendar(cal);

      const model = schoolId
        ? resolvePolicyViewModel({
            row,
            kind: 'school',
            refId: schoolId,
            schoolName: 'School',
            payload,
            calendar: cal,
            version: row?.version,
            publishedAt: row?.published_at,
          })
        : null;
      setPolicy(model);

      try {
        const sid = (profile as { student_id?: string | null } | null)?.student_id ?? null;
        if (sid) {
          const [pRows, tRows] = await Promise.all([
            listPostedPeriodGrades({ studentId: sid }),
            listTermGrades({ studentId: sid }),
          ]);
          setPosted(pRows as unknown as Array<Record<string, unknown>>);
          setTerms(tRows as unknown as Array<Record<string, unknown>>);
        } else {
          setPosted([]);
          setTerms([]);
        }
      } catch {
        setPosted([]);
        setTerms([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load School View');
    } finally {
      setLoading(false);
    }
  }, [schoolId, chrome.classes, profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const glyphs = useMemo(
    () => (calendar ? glyphsForCalendar(calendar as never) : []),
    [calendar],
  );

  return (
    <Screen maxWidth={720}>
      <Text style={[type.title, { color: colors.ink }]}>School</Text>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>School View</Text>
      <ChipRow>
        {TABS.map((t) => (
          <Chip key={t.id} label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
      </ChipRow>
      {loading ? <Text style={[type.body, { color: colors.mute }]}>Loading…</Text> : null}
      {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}

      {tab === 'grading_reporting' ? (
        policy ? (
          <PolicyViewBody model={policy} audience="parent" calendar={calendar as never} />
        ) : (
          <Card>
            <Text style={[type.body, { color: colors.ink }]}>Grading and Reporting Policy</Text>
            <Text style={[type.meta, { color: colors.mute, marginTop: 6 }]}>
              This page will hold the school’s grading policy. It is not published yet.
            </Text>
          </Card>
        )
      ) : null}

      {tab === 'calendar' ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>Academic calendar</Text>
          {glyphs.length ? (
            <View style={styles.glyphRow}>
              {glyphs
                .filter((g) => g.id !== 'all')
                .map((g) => (
                  <View key={g.id} style={styles.glyphItem}>
                    <PeriodGlyph
                      id={g.id}
                      startDeg={g.startDeg}
                      sweepDeg={g.sweepDeg}
                      state="idle"
                      size={28}
                    />
                    <Text style={[type.meta, { color: colors.mute }]}>{g.label}</Text>
                  </View>
                ))}
            </View>
          ) : (
            <Text style={[type.meta, { color: colors.mute, marginTop: 6 }]}>
              No school calendar is published yet.
            </Text>
          )}
        </Card>
      ) : null}

      {tab === 'syllabi' ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>My class syllabi</Text>
          {classes.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute, marginTop: 6 }]}>No classes yet.</Text>
          ) : (
            classes.map((c) => (
              <ListRow
                key={c.id}
                title={c.name}
                chevron
                onPress={() => router.push(`/class/${c.id}/syllabus-view` as never)}
              />
            ))
          )}
        </Card>
      ) : null}

      {tab === 'grades' ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>Posted grades & transcript</Text>
          {posted.length === 0 && terms.length === 0 ? (
            <Text style={[type.meta, { color: colors.mute, marginTop: 6 }]}>
              No posted grades for the signed-in student yet.
            </Text>
          ) : (
            <>
              {posted.map((r) => (
                <Text key={String(r.id)} style={[type.meta, { color: colors.ink, marginTop: 6 }]}>
                  {String(r.marking_period_code ?? 'Period')}: {r.pct != null ? `${r.pct}%` : '—'}
                  {r.letter ? ` ${String(r.letter)}` : ''}
                </Text>
              ))}
              {terms.map((r) => (
                <Text key={String(r.id)} style={[type.meta, { color: colors.ink, marginTop: 6 }]}>
                  {String(r.course ?? 'Course')} · {String(r.credit_term ?? '')}:{' '}
                  {r.pct != null ? `${r.pct}%` : '—'}
                  {r.letter ? ` ${String(r.letter)}` : ''}
                </Text>
              ))}
            </>
          )}
        </Card>
      ) : null}

      {tab === 'class_rank' ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>Class Rank & GPA</Text>
          <Text style={[type.meta, { color: colors.mute, marginTop: 6 }]}>
            Unweighted and weighted GPA come from transcript rows. Optional rank GPA (6.0 table)
            freezes at a school date for class rank. Not shown on the elementary parent view or the
            parent-phone 6.0 grid.
          </Text>
          <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>
            Rank list and freeze controls land here after the school enables a rank_6 profile.
          </Text>
        </Card>
      ) : null}

      {tab === 'overview' ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>Overview</Text>
          <Text style={[type.meta, { color: colors.mute, marginTop: 6 }]}>
            This page will hold the school’s overview. It is not published yet.
          </Text>
          {schoolId ? (
            <Pressable
              onPress={() => router.push('/school/grading-policy' as never)}
              style={styles.link}
            >
              <Text style={[type.meta, { color: colors.brand }]}>Open policy setup (office)</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  glyphRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  glyphItem: { alignItems: 'center', gap: 4, minWidth: 44 },
  link: { marginTop: 12, minHeight: 44, justifyContent: 'center' },
});
