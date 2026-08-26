import type { ReactNode, RefObject } from 'react';
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
import { chrome as chromeTokens } from '@/constants/theme';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  children: ReactNode;
  maxWidth?: number;
  sticky?: ReactNode;
  centered?: boolean;
  keyboard?: boolean;
  /** When false, the screen does not pad for the keyboard — nested lists handle it. */
  avoidKeyboard?: boolean;
  scroll?: boolean;
  stickyHeaderIndices?: number[];
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollRef?: RefObject<ScrollView | null>;
  onContentSizeChange?: (width: number, height: number) => void;
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
  avoidKeyboard = true,
  scroll = true,
  stickyHeaderIndices,
  onScroll,
  scrollRef,
  onContentSizeChange,
}: Props) {
  const { colors } = useTheme();
  const { pad } = useScreenPad();
  const insets = useSafeAreaInsets();
  const chrome = useOptionalChrome();
  const { scrollHandlers } = useMarqueeScroll();
  const keyboardUp = Boolean(chrome?.keyboardVisible);
  const keyboardHeight = chrome?.keyboardHeight ?? 0;
  const bottomReserve = chrome?.trayPadding ?? 48;
  const topReserve = chrome?.contextReserve ?? 0;
  const stickyLift = keyboardUp
    ? 0
    : chrome?.trayRest ?? 12 + (Platform.OS === 'web' ? 0 : insets.bottom);
  // Android resizes the window. iOS and mobile web overlay the keyboard, so the
  // sticky composer has to ride up by the covered height.
  const stickyBottom =
    sticky && keyboardUp && Platform.OS !== 'android' && keyboardHeight > 0
      ? keyboardHeight
      : stickyLift;

  useEffect(() => {
    if (!keyboard || !keyboardUp) return;
    const pin = () => scrollRef?.current?.scrollToEnd({ animated: true });
    const frame = requestAnimationFrame(pin);
    const later = setTimeout(pin, 280);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(later);
    };
  }, [keyboard, keyboardUp, scrollRef]);

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
    paddingBottom: sticky ? 16 : 16 + (keyboardUp ? 12 : bottomReserve),
  };

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.scroller}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={keyboard ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={!sticky}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={stickyHeaderIndices}
      scrollEventThrottle={16}
      onScroll={handleScroll}
      onScrollBeginDrag={scrollHandlers.onScrollBeginDrag}
      onScrollEndDrag={scrollHandlers.onScrollEndDrag}
      onMomentumScrollEnd={scrollHandlers.onMomentumScrollEnd}
      onContentSizeChange={onContentSizeChange}
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
              marginBottom: stickyBottom,
            },
          ]}
        >
          <View style={[styles.barInner, { maxWidth }]}>{sticky}</View>
        </View>
      ) : null}
    </View>
  );

  // Sticky composers lift via keyboardHeight. KeyboardAvoidingView would double that.
  if (Platform.OS === 'web' || !avoidKeyboard || sticky) return column;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // Screen sits in the shell body, already below the header. Offsetting by
      // headerHeight left the composer and last bubbles under the keyboard.
      keyboardVerticalOffset={0}
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
  const bottomPad = useRef(new Animated.Value(paddingBottom)).current;

  useEffect(() => {
    Animated.timing(gap, {
      toValue: visible ? openGap : 0,
      duration: chromeTokens.motion.context,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [gap, openGap, visible]);

  useEffect(() => {
    Animated.timing(bottomPad, {
      toValue: visible ? paddingBottom : 16,
      duration: chromeTokens.motion.tray,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [bottomPad, paddingBottom, visible]);

  return (
    <Animated.View
      style={[styles.flush, { maxWidth, paddingHorizontal: pad, paddingBottom: bottomPad }, centered && styles.centered]}
    >
      <Animated.View style={{ height: gap }} />
      <View style={styles.flushFill}>{children}</View>
    </Animated.View>
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
