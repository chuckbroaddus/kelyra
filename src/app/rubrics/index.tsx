/** List + entry to rubric builder. */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import type { Rubric } from '@/lib/rubric';
import { listMyRubrics } from '@/lib/rubric/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function RubricsIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  usePushedTitle('Rubrics');
  const [rows, setRows] = useState<Rubric[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listMyRubrics());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Text style={[type.meta, { color: colors.mute }]}>
        Optional scoring guides for one assignment. Most work never needs one.
      </Text>
      <PrimaryButton label="New rubric" onPress={() => router.push('/rubrics/new' as never)} />
      {rows.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => router.push(`/rubrics/${r.id}` as never)}
          style={{ paddingVertical: 10 }}
        >
          <Text style={[type.rowTitle, { color: colors.ink }]}>{r.title || 'Untitled'}</Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            {r.kind} · {r.status} · v{r.version}
          </Text>
        </Pressable>
      ))}
      {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
    </Screen>
  );
}
