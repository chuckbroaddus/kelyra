import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { radius, type } from '@/constants/theme';
import { formatJoinCode, isFriendlyJoinCode } from '@/lib/classes/joinCode';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  code: string;
  onRefresh?: () => Promise<void> | void;
};

export function JoinCodeCard({ code, onRefresh }: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const friendly = isFriendlyJoinCode(code);
  const spoken = formatJoinCode(code);
  const joinUrl = Linking.createURL('/join', { queryParams: { code } });

  const share = async () => {
    const message = `Join class with ${spoken}${friendly ? '' : ` (${code})`}. ${joinUrl}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${spoken}\n${joinUrl}`);
        setCopied(true);
        return;
      }
      await Share.share({ message, title: 'Class join code' });
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card>
      <Text style={[styles.kicker, { color: colors.mute }]}>Class join code</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Join code ${spoken}`}
        onPress={() => void share()}
      >
        <Text style={[styles.code, { color: colors.ink }]}>{spoken}</Text>
      </Pressable>
      <Text style={[styles.hint, { color: colors.mute }]}>
        {friendly
          ? 'Students type these two words on the join page. Easy to say out loud.'
          : 'Students can type this as shown. You can switch to two spoken words.'}
      </Text>
      <View style={styles.actions}>
        <GhostButton align="left" label={copied ? 'Copied' : 'Copy / share'} onPress={() => void share()} />
        {onRefresh ? (
          <GhostButton
            align="left"
            label={busy ? 'Updating…' : friendly ? 'Make a new code' : 'Use a friendlier code'}
            onPress={() => {
              setBusy(true);
              void Promise.resolve(onRefresh()).finally(() => setBusy(false));
            }}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...type.section,
    textTransform: 'uppercase',
  },
  code: {
    ...type.display,
    letterSpacing: 0.4,
  },
  hint: type.meta,
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
});

export function JoinCodeMark({ code }: { code: string }) {
  const { colors } = useTheme();
  return (
    <View style={[stylesMark.pill, { backgroundColor: colors.brandSoft }]}>
      <Text style={[stylesMark.label, { color: colors.brand }]} numberOfLines={1}>
        {formatJoinCode(code)}
      </Text>
    </View>
  );
}

const stylesMark = StyleSheet.create({
  pill: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
