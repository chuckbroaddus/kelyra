import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text } from 'react-native';

import { FeedPane } from '@/components/ui/FeedPane';
import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { listMyFeeds, type FeedRef } from '@/lib/feeds/api';
import { asFeedIcon, DEFAULT_CLASS_FEED_ICON, DEFAULT_SCHOOL_FEED_ICON } from '@/lib/feeds/icons';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function StudentFeedScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [feeds, setFeeds] = useState<FeedRef[] | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void listMyFeeds(profile)
        .then((rows) => {
          if (!live) return;
          const classes = rows.filter((row) => row.kind === 'class');
          const school = rows.filter((row) => row.kind === 'school');
          setFeeds([...classes, ...school]);
          setTab((current) => current ?? classes[0]?.key ?? school[0]?.key ?? null);
        })
        .catch((err) => {
          if (live) setError(err instanceof Error ? err.message : 'Could not load feeds');
        });
      return () => {
        live = false;
      };
    }, [profile]),
  );

  const selected = feeds?.find((row) => row.key === tab) ?? feeds?.[0] ?? null;
  const feedTabs: PersonTab[] = useMemo(
    () =>
      (feeds ?? []).map((row) => ({
        key: row.key,
        label: row.name,
        icon: asFeedIcon(row.icon, row.kind === 'school' ? DEFAULT_SCHOOL_FEED_ICON : DEFAULT_CLASS_FEED_ICON),
      })),
    [feeds],
  );

  if (!feeds) {
    return (
      <Screen>
        <WorkingLine />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} maxWidth={720}>
      <PersonTabs tabs={feedTabs} value={selected?.key ?? ''} onChange={setTab} />
      {error ? <Text style={[type.meta, { color: colors.danger }]}>{error}</Text> : null}
      {selected ? (
        <FeedPane
          fill
          classId={selected.kind === 'class' ? selected.id : null}
          scope={selected.kind === 'class' ? 'class' : 'school'}
        />
      ) : (
        <Text style={[type.body, { color: colors.mute }]}>No feeds yet.</Text>
      )}
    </Screen>
  );
}
