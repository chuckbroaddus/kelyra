import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMarqueeScroll } from '@/components/ui/MarqueeText';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  children: ReactNode;
  maxWidth?: number;
  sticky?: ReactNode;
  centered?: boolean;
  keyboard?: boolean;
  scroll?: boolean;
  stickyHeaderIndices?: number[];
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export function useScreenPad() {
  const layout = useLayout();
  return {
    width: layout.width,
    pad: layout.pad,
    isWide: layout.showTopBar,
    isSplit: layout.isSplit,
    isRail: false,
  };
}

export { useLayout };

export function Screen({
  children,
  maxWidth = 720,
  sticky,
  centered,
  keyboard,
  scroll = true,
  stickyHeaderIndices,
  onScroll,
}: Props) {
  const { colors } = useTheme();
  const { pad } = useScreenPad();
  const insets = useSafeAreaInsets();
  const chrome = useOptionalChrome();
  const { scrollHandlers } = useMarqueeScroll();
  const bottomReserve = chrome?.trayPadding ?? 48;
  const topReserve = chrome?.contextReserve ?? 0;
  const stickyLift = chrome?.trayRest ?? 12 + (Platform.OS === 'web' ? 0 : insets.bottom);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    chrome?.onScroll(event);
    onScroll?.(event);
  };

  const padStyle = {
    maxWidth,
    paddingHorizontal: pad,
    paddingTop: pad + topReserve,
    // When a sticky CTA is in the layout flow, it already sits above the tray.
    // Extra tray padding here would only push Throw away / Retake under the overlay.
    paddingBottom: sticky ? 16 : 16 + bottomReserve,
  };

  const body = scroll ? (
    <ScrollView
      style={styles.scroller}
      keyboardShouldPersistTaps={keyboard ? 'handled' : undefined}
      keyboardDismissMode={keyboard ? 'on-drag' : undefined}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={stickyHeaderIndices}
      scrollEventThrottle={16}
      onScroll={handleScroll}
      onScrollBeginDrag={scrollHandlers.onScrollBeginDrag}
      onScrollEndDrag={scrollHandlers.onScrollEndDrag}
      onMomentumScrollEnd={scrollHandlers.onMomentumScrollEnd}
      contentContainerStyle={[styles.content, padStyle, centered && styles.centered]}
    >
      {children}
    </ScrollView>
  ) : (
    <FlushBody
      pad={pad}
      topReserve={topReserve}
      maxWidth={maxWidth}
      paddingBottom={padStyle.paddingBottom}
      centered={centered}
    >
      {children}
    </FlushBody>
  );

  const column = (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {body}
      {sticky ? (
        <View
          style={[
            styles.bar,
            {
              backgroundColor: colors.elevated,
              borderTopColor: colors.line,
              paddingHorizontal: pad,
              marginBottom: stickyLift,
            },
          ]}
        >
          <View style={[styles.barInner, { maxWidth }]}>{sticky}</View>
        </View>
      ) : null}
    </View>
  );

  if (!keyboard) return column;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {column}
    </KeyboardAvoidingView>
  );
}

function FlushBody({
  children,
  pad,
  topReserve,
  maxWidth,
  paddingBottom,
  centered,
}: {
  children: ReactNode;
  pad: number;
  topReserve: number;
  maxWidth: number;
  paddingBottom: number;
  centered?: boolean;
}) {
  const chrome = useOptionalChrome();
  const visible = chrome?.visible ?? true;
  const openGap = pad + topReserve;
  const gap = useRef(new Animated.Value(openGap)).current;

  useEffect(() => {
    Animated.timing(gap, {
      toValue: visible ? openGap : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [gap, openGap, visible]);

  return (
    <View style={[styles.flush, { maxWidth, paddingHorizontal: pad, paddingBottom }, centered && styles.centered]}>
      <Animated.View style={{ height: gap }} />
      <View style={styles.flushFill}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroller: {
    flex: 1,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
  },
  flush: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  flushFill: {
    flex: 1,
    minHeight: 0,
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  bar: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 12,
  },
  barInner: {
    width: '100%',
    alignSelf: 'center',
  },
});
