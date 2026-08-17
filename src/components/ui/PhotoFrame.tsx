import { Image, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  uri?: string | null;
  empty?: boolean;
  compact?: boolean;
  page?: number;
  hero?: boolean;
  fill?: boolean;
};

export function PhotoFrame({ uri, empty, compact, page, hero, fill }: Props) {
  const { colors } = useTheme();
  const layout = useLayout();
  const maxHeight = compact ? 160 : hero || fill ? undefined : layout.width >= 720 ? 360 : 240;
  const minHeight = hero && !compact ? 220 : undefined;
  const frameStyle = [
    styles.frame,
    {
      backgroundColor: colors.card,
      borderColor: colors.line,
      maxHeight: fill ? undefined : maxHeight,
      minHeight: fill ? undefined : minHeight,
      flex: fill ? 1 : undefined,
      aspectRatio: fill ? undefined : 4 / 3,
    },
  ];
  return (
    <View style={[styles.wrap, fill && styles.fill]}>
      {page != null ? <Text style={[styles.page, { color: colors.mute }]}>Page {page}</Text> : null}
      {empty || !uri ? (
        <View style={[frameStyle, styles.empty, { backgroundColor: colors.wash }]}>
          <Text style={[styles.emptyTitle, { color: colors.mute }]}>Photograph the work</Text>
          <Text style={[styles.emptyMeta, { color: colors.mute }]}>One student per photo.</Text>
        </View>
      ) : (
        <View style={frameStyle}>
          <Image source={{ uri }} style={styles.image} resizeMode={hero || fill ? 'contain' : 'cover'} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 4,
  },
  fill: {
    flex: 1,
    minHeight: 0,
  },
  page: type.meta,
  frame: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  empty: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 4,
  },
  emptyTitle: {
    ...type.body,
    textAlign: 'center',
  },
  emptyMeta: {
    ...type.meta,
    textAlign: 'center',
    maxWidth: 260,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
