import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MessagePayloadView } from '@/components/ui/MessageAttach';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { formatWhen } from '@/lib/format';
import { getAlert } from '@/lib/posts/api';
import type { MessagePayload } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function AlertDetailScreen() {
  const { colors } = useTheme();
  const { acknowledgeAlert } = useChrome();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [alert, setAlert] = useState<{
    body: string;
    createdAt: string;
    className: string | null;
    authorName: string;
    payload: MessagePayload | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      acknowledgeAlert(id);
      let cancelled = false;
      void getAlert(id)
        .then((next) => {
          if (cancelled) return;
          if (!next) {
            setError('That alert is gone.');
            return;
          }
          setAlert({
            body: next.body,
            createdAt: next.createdAt,
            className: next.className,
            authorName: next.authorName,
            payload: next.payload,
          });
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load that alert');
        });
      return () => {
        cancelled = true;
      };
    }, [id, acknowledgeAlert]),
  );

  usePushedTitle('Alert');

  return (
    <Screen maxWidth={640}>
      {!alert && !error ? <WorkingLine /> : null}
      {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
      {alert ? (
        <Card>
          <Text style={[type.meta, { color: colors.mute }]}>
            Alert
            {alert.className ? ` · ${alert.className}` : ' · School'}
            {` · ${formatWhen(alert.createdAt)}`}
          </Text>
          <Text style={[type.meta, { color: colors.mute }]}>{alert.authorName}</Text>
          {alert.payload ? (
            <View style={styles.attach}>
              <MessagePayloadView payload={alert.payload} body={alert.body} onOpenWork={() => {}} />
            </View>
          ) : (
            <Text style={[styles.body, { color: colors.ink }]}>{alert.body}</Text>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...type.body,
    marginTop: 8,
  },
  attach: {
    marginTop: 8,
  },
});
