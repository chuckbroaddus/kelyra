import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/ui/Avatar';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { studentHead } from '@/constants/table';
import { firstName } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  name: string;
  photoUrl?: string | null;
  href?: string;
  /**
   * Phone landscape: names only, no avatar — keeps the sticky header short.
   * Portrait / tablet leave this false.
   */
  compact?: boolean;
};

const panX: ViewStyle | null = Platform.OS === 'web' ? ({ touchAction: 'pan-x', userSelect: 'none' } as ViewStyle) : null;

export const GradebookStudentHead = memo(function GradebookStudentHead({
  name,
  photoUrl,
  href,
  compact = false,
}: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const label = firstName(name);
  const face = (
    <View
      style={[styles.headStudent, compact && styles.headStudentCompact]}
      pointerEvents="none"
      // test hooks for UI proof / unit-adjacent queries
      accessibilityLabel={compact ? `Student ${label}` : undefined}
      testID={compact ? 'gradebook-student-head-compact' : 'gradebook-student-head'}
    >
      {compact ? null : (
        <Avatar
          name={name}
          photoUrl={photoUrl}
          size={studentHead.avatar}
          recyclingKey={`gradehead:${name}:${photoUrl ?? ''}`}
        />
      )}
      <MarqueeText
        text={label}
        align="center"
        fadeColor={colors.wash}
        style={[styles.headName, compact && styles.headNameCompact, { color: colors.ink }]}
      />
    </View>
  );
  if (!href) return face;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(href as never)}
      style={({ pressed }) => [styles.hit, pressed && { opacity: 0.85 }, panX]}
    >
      {face}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hit: {
    width: '100%',
    alignItems: 'center',
  },
  headStudent: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  headStudentCompact: {
    gap: 0,
    justifyContent: 'center',
    minHeight: 28,
  },
  headName: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  headNameCompact: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
