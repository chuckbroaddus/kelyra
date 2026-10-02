import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/ui/Avatar';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { gradebookStudentAvatarSize } from '@/constants/table';
import { firstName } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  name: string;
  photoUrl?: string | null;
  href?: string;
  /**
   * @deprecated Avatars always use gradebookStudentAvatarSize (Conduct / #377 landscape).
   * Kept so call sites can still pass compact for sticky-header layout coupling; ignored for face size.
   */
  compact?: boolean;
};

const panX: ViewStyle | null = Platform.OS === 'web' ? ({ touchAction: 'pan-x', userSelect: 'none' } as ViewStyle) : null;

/** Same size as Conduct list + landscape column heads (PR #377 / #385). */
export const GRADEBOOK_STUDENT_AVATAR_SIZE = gradebookStudentAvatarSize;

export const GradebookStudentHead = memo(function GradebookStudentHead({
  name,
  photoUrl,
  href,
  compact: _compact = true,
}: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const label = firstName(name);
  // Always Conduct/landscape size — portrait and landscape (Chuck RAPID t_1a589df8).
  const avatarSize = GRADEBOOK_STUDENT_AVATAR_SIZE;
  const face = (
    <View
      style={[styles.headStudent, styles.headStudentCompact]}
      pointerEvents="none"
      accessibilityLabel={`Student ${label}`}
      testID="gradebook-student-head-compact"
    >
      {avatarSize > 0 ? (
        <Avatar
          name={name}
          photoUrl={photoUrl}
          size={avatarSize}
          recyclingKey={`gradehead:${name}:${photoUrl ?? ''}`}
        />
      ) : null}
      <MarqueeText
        text={label}
        align="center"
        fadeColor={colors.wash}
        style={[styles.headName, styles.headNameCompact, { color: colors.ink }]}
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
    gap: 2,
    justifyContent: 'center',
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
