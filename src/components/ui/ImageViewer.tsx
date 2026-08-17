import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  uris: string[];
  index?: number;
  visible: boolean;
  onClose: () => void;
};

export function ImageViewer({ uris, index = 0, visible, onClose }: Props) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(index);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!visible) return;
    setPage(index);
    setZoom(1);
    const frame = requestAnimationFrame(() => {
      pager.current?.scrollTo({ x: index * width, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, index, width]);

  if (!uris.length) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            onPress={onClose}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          >
            <Icon name="close" color={colors.ink} size={20} />
          </Pressable>
          <Text style={[styles.count, { color: colors.ink }]}>
            {uris.length > 1 ? `${page + 1} of ${uris.length}` : 'Photo'}
          </Text>
          <View style={styles.zoomBtns}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              onPress={() => setZoom((value) => Math.max(1, Number((value - 0.5).toFixed(2))))}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            >
              <Icon name="zoomOut" color={colors.ink} size={20} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              onPress={() => setZoom((value) => Math.min(4, Number((value + 0.5).toFixed(2))))}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            >
              <Icon name="zoomIn" color={colors.ink} size={20} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          scrollEnabled={zoom <= 1.05}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / width);
            if (next !== page) {
              setPage(next);
              setZoom(1);
            }
          }}
        >
          {uris.map((uri) => (
            <View key={uri} style={{ width, height: height - 96 - insets.top - insets.bottom }}>
              <ZoomableImage uri={uri} width={width} height={height - 96 - insets.top - insets.bottom} zoom={zoom} />
            </View>
          ))}
        </ScrollView>

        {uris.length > 1 ? (
          <View style={styles.dots}>
            {uris.map((uri, i) => (
              <View
                key={uri}
                style={[styles.dot, { backgroundColor: i === page ? colors.brand : colors.line }, i === page && styles.dotOn]}
              />
            ))}
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.mute }]}>
            {Platform.OS === 'web' ? 'Pinch or scroll to zoom. Swipe if there are more pages.' : 'Pinch to zoom. Swipe for more pages.'}
          </Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  top: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  count: {
    ...type.body,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  zoomBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dots: {
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOn: {
    width: 16,
  },
  hint: {
    ...type.meta,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
