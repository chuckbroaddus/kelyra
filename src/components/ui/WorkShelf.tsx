import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { photoUri } from '@/components/ui/Avatar';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AvatarInitials } from '@/components/ui/AvatarInitials';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { MarqueeText, useMarqueeScroll } from '@/components/ui/MarqueeText';
import { UnknownMark } from '@/components/ui/UnknownMark';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type ShelfItem = {
  id: string;
  title: string;
  photoUrl?: string | null;
  badge?: BadgeVariant;
  unknown?: boolean;
};

type Props = {
  items: ShelfItem[];
  onPress: (item: ShelfItem) => void;
};

export function WorkShelf({ items, onPress }: Props) {
  const { colors } = useTheme();
  const { scrollHandlers } = useMarqueeScroll();
  if (!items.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      {...scrollHandlers}
      contentContainerStyle={styles.row}
    >
      {items.slice(0, 12).map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={() => onPress(item)}
          style={({ pressed }) => [styles.cell, pressed && { opacity: 0.88 }]}
        >
          {({ pressed }) => (
            <>
              <View style={[styles.thumb, { borderColor: colors.line, backgroundColor: colors.card }]}>
                {photoUri(item.photoUrl) ? (
                  <RemoteImage uri={photoUri(item.photoUrl)!} style={styles.image} />
                ) : (
                  <View style={[styles.empty, { backgroundColor: colors.wash }]}>
                    {item.unknown ? <UnknownMark size={40} /> : <AvatarInitials name={item.title} size={40} />}
                  </View>
                )}
                {item.badge ? (
                  <View style={styles.badge}>
                    <Badge variant={item.badge} />
                  </View>
                ) : null}
              </View>
              <MarqueeText
                text={item.title}
                align="center"
                paused={pressed}
                fadeColor={colors.bg}
                style={[styles.caption, { color: colors.mute }]}
              />
            </>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
    paddingVertical: 4,
  },
  cell: {
    width: 80,
    gap: 6,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  caption: {
    ...type.meta,
    width: 80,
  },
});
