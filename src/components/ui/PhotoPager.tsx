import { useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { PhotoFrame } from '@/components/ui/PhotoFrame';
import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Page = {
  key: string;
  uri: string;
};

type Props = {
  pages: Page[];
  compact?: boolean;
  empty?: boolean;
  onRemove?: (key: string) => void;
  hero?: boolean;
  fill?: boolean;
};

export function PhotoPager({ pages, compact, empty, onRemove, hero, fill }: Props) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [pageWidth, setPageWidth] = useState(Math.max(windowWidth - 32, 1));
  const uris = pages.map((item) => item.uri);
  const current = pages[Math.min(page, Math.max(pages.length - 1, 0))];

  if (empty || pages.length === 0) {
    return <PhotoFrame empty compact={compact} hero={hero} fill={fill} />;
  }

  if (pages.length === 1) {
    return (
      <View style={[styles.wrap, fill && styles.fill]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open photo full screen. Pinch to zoom."
          onPress={() => setOpen(true)}
          style={fill ? styles.fill : undefined}
        >
          <PhotoFrame uri={pages[0]!.uri} compact={compact} hero={hero} fill={fill} />
        </Pressable>
        {onRemove ? (
          <GhostButton align="left" label="Remove page" onPress={() => onRemove(pages[0]!.key)} />
        ) : null}
        <ImageViewer uris={uris} index={0} visible={open} onClose={() => setOpen(false)} />
      </View>
    );
  }

  return (
    <View
      style={[styles.wrap, fill && styles.fill]}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && Math.abs(next - pageWidth) > 1) setPageWidth(next);
      }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
          setPage(next);
        }}
      >
        {pages.map((item, index) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`Open page ${index + 1} full screen`}
            onPress={() => {
              setPage(index);
              setOpen(true);
            }}
            style={{ width: pageWidth }}
          >
            <PhotoFrame uri={item.uri} page={index + 1} compact={compact} hero={hero} fill={fill} />
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.meta}>
        <Text style={[type.meta, { color: colors.mute }]}>
          Page {Math.min(page, pages.length - 1) + 1} of {pages.length} · swipe
        </Text>
        <View style={styles.dots}>
          {pages.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.dot,
                { backgroundColor: colors.line },
                index === page && { backgroundColor: colors.brand, width: 14 },
              ]}
            />
          ))}
        </View>
      </View>
      {onRemove && current ? (
        <GhostButton
          align="left"
          label={`Remove page ${Math.min(page, pages.length - 1) + 1}`}
          onPress={() => onRemove(current.key)}
        />
      ) : null}
      <ImageViewer
        uris={uris}
        index={Math.min(page, pages.length - 1)}
        visible={open}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    minHeight: 0,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
