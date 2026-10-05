/**
 * DRIVE-NEEDS I4 / SC-A — full-screen Split stack desk from Needs waiting row.
 * Teach-only. Back to Needs does not mint or abandon.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SplitReview } from '@/components/ingest/SplitReview';
import { GhostButton } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { INGEST_COPY } from '@/lib/ingest/copy';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function SplitStackScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const chrome = useChrome();
  const { teacher } = useAuth();
  const teachSeat = chrome.role === 'teacher';
  const { batch: batchParam } = useLocalSearchParams<{ batch?: string | string[] }>();
  const batchId = useMemo(() => {
    if (typeof batchParam === 'string' && batchParam.trim()) return batchParam.trim();
    if (Array.isArray(batchParam) && batchParam[0]?.trim()) return batchParam[0]!.trim();
    return null;
  }, [batchParam]);

  const backToNeeds = () => {
    router.replace('/inbox');
  };

  if (!teacher || !teachSeat) {
    return (
      <Screen>
        <Text style={[type.body, { color: colors.mute }]}>{INGEST_COPY.teachSeatOnly}</Text>
        <GhostButton label={INGEST_COPY.backToNeeds} onPress={backToNeeds} />
      </Screen>
    );
  }

  if (!batchId) {
    return (
      <Screen>
        <Text style={[type.body, { color: colors.mute }]}>{INGEST_COPY.splitFailed}</Text>
        <GhostButton label={INGEST_COPY.backToNeeds} onPress={backToNeeds} />
      </Screen>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SplitReview
        visible
        batchId={batchId}
        entrySource="needs"
        onClose={backToNeeds}
        onConfirmed={backToNeeds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
