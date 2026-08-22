import { Image, StyleSheet, View } from 'react-native';

import { AvatarInitials } from '@/components/ui/AvatarInitials';
import { UnknownMark } from '@/components/ui/UnknownMark';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  name: string;
  photoUrl?: string | null;
  /** True when a photo exists on the record even if the signed URL is still loading. */
  hasPhoto?: boolean;
  size?: number;
  /** Empty-seat mark. Wins over photo/initials — this is not a person. */
  unknown?: boolean;
};

export function photoUri(uri?: string | null): string | null {
  const next = uri?.trim();
  return next ? next : null;
}

export function Avatar({ name, photoUrl, hasPhoto, size = 36, unknown }: Props) {
  const { colors } = useTheme();
  const uri = photoUri(photoUrl);
  if (unknown && !uri) {
    return <UnknownMark size={size} />;
  }
  if (uri) {
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
        <Image
          key={uri}
          source={{ uri }}
          resizeMode="cover"
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      </View>
    );
  }
  if (hasPhoto) {
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
      />
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
