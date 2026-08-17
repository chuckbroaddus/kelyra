import { Image, StyleSheet, View } from 'react-native';

import { AvatarInitials } from '@/components/ui/AvatarInitials';
import { UnknownMark } from '@/components/ui/UnknownMark';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  /** Empty-seat mark. Wins over photo/initials — this is not a person. */
  unknown?: boolean;
};

export function Avatar({ name, photoUrl, size = 36, unknown }: Props) {
  const { colors } = useTheme();
  if (unknown) {
    return <UnknownMark size={size} />;
  }
  if (photoUrl) {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.well,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.wash,
            borderColor: colors.line,
          },
        ]}
      >
        <Image source={{ uri: photoUrl }} resizeMode="cover" style={{ width: size, height: size }} />
      </View>
    );
  }
  return <AvatarInitials name={name} size={size} />;
}

const styles = StyleSheet.create({
  well: {
    borderWidth: 1,
    flexShrink: 0,
    overflow: 'hidden',
  },
});
