import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { JoinCodeCard } from '@/components/ui/JoinCode';
import { ListRow } from '@/components/ui/ListRow';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { type } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getClass, rotateJoinCode, setActiveClass } from '@/lib/classes/api';
import { loadClassOverview, type ClassOverview } from '@/lib/classes/overview';
import { buildFamilyDigest, buildWeeklyFamilyDigest, openFamilyEmail, shareFamilyDigest } from '@/lib/parents/digest';
import { listRoster, type RosterStudent } from '@/lib/students/api';
import type { ClassRow } from '@/lib/supabase/types';
import { useFocusEffect } from 'expo-router';

export default function FamilyScreen() {
  const { colors } = useTheme();
  const chrome = useChrome();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teacher } = useAuth();
  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !teacher) return;
    try {
      const nextClass = await getClass(id);
      setKlass(nextClass);
      setRoster(await listRoster(id));
      setOverview(await loadClassOverview(id));
      await setActiveClass(teacher.id, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load class');
    }
  }, [id, teacher]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onCopyDigest = async () => {
    if (!id || !klass) return;
    setError(null);
    try {
      const text = await buildFamilyDigest(id, klass.name);
      const result = await shareFamilyDigest(text);
      setStatus(result === 'copied' ? 'Family update copied.' : 'Family update shared.');
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not copy update');
    }
  };

  const onWeeklyDigest = async (email: boolean) => {
    if (!id || !klass) return;
    setError(null);
    try {
      const text = await buildWeeklyFamilyDigest(id, klass.name);
      if (email) {
        await openFamilyEmail(`${klass.name} — this week`, text);
        setStatus('Opened an email draft. Paste if the body is empty.');
        return;
      }
      const result = await shareFamilyDigest(text);
      setStatus(result === 'copied' ? "This week's update copied." : "This week's update shared.");
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not build this week’s update');
    }
  };

  const focusById = new Map((overview?.focusStudents ?? []).map((row) => [row.id, row.focusLabel]));

  useEffect(() => {
    chrome.setPushedTitle('Family');
    return () => chrome.setPushedTitle(null);
  }, [chrome]);

  return (
    <Screen keyboard maxWidth={640}>
      <SectionHeader label="Student join" first />
      {klass ? (
        <JoinCodeCard
          code={klass.join_code}
          onRefresh={async () => {
            const next = await rotateJoinCode(klass.id);
            setKlass(next);
            setStatus('New join code is ready. Students will need the new words.');
          }}
        />
      ) : null}

      <SectionHeader label="Send a note home" />
      <Card>
        <Text style={[type.meta, { color: colors.mute }]}>
          A short class update: focus skill and practice status. No scores, no photos.
        </Text>
        <GhostButton align="left" label="Copy family update" onPress={() => void onCopyDigest()} />
        <GhostButton align="left" label="This week's update" onPress={() => void onWeeklyDigest(false)} />
        <GhostButton align="left" label="Email this week's update" onPress={() => void onWeeklyDigest(true)} />
      </Card>

      <ListRow
        title="Parents"
        status="People and invite links"
        avatarName="Parents"
        onPress={() => router.push(`/class/${id}/parents`)}
      />

      <SectionHeader label="Who to invite" />
      {roster.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>Add students in Setup first. Then open a child to add a parent.</Text>
      ) : (
        roster.map((student) => (
          <ListRow
            key={student.id}
            title={student.display_name}
            status={focusById.get(student.id) ?? '—'}
            photoUrl={student.photoUrl}
            onPress={() => router.push(`/class/${id}/student/${student.id}`)}
          />
        ))
      )}

      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PhaseBanner
        phase={4}
        detail="Students join with the class words and pick their name. Parents get a link from a student’s page. They see the focus skill and whether practice is done — nothing else."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: type.body,
  error: {
    ...type.body,
    marginTop: 8,
  },
});
