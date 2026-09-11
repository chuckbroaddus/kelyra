import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { chrome as chromeTokens } from '@/constants/theme';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';

type Props = {
  children: ReactNode;
};

/**
 * In-page chrome (ClassTabs, segment chips, syllabus banner) that leaves with
 * hide-on-scroll and returns on swipe-down — same `chrome.visible` brain as the
 * floating tray / Amazon context row. Used on flush screens (`Screen scroll={false}`)
 * where those rows cannot live in the page ScrollView the way Desk / Assignments do.
 */
export function CollapsingPageChrome({ children }: Props) {
  const chrome = useOptionalChrome();
  const visible = chrome?.visible ?? true;
  const [measured, setMeasured] = useState(0);
  const open = useRef(new Animated.Value(1)).current;
  const measuredRef = useRef(0);

  useEffect(() => {
    Animated.timing(open, {
      toValue: visible ? 1 : 0,
      duration: chromeTokens.motion.context,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [open, visible]);

  const height = measured
    ? open.interpolate({
        inputRange: [0, 1],
        outputRange: [0, measured],
      })
    : undefined;

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[styles.clip, measured > 0 && { height, opacity: open }]}
    >
      <View
        onLayout={(event) => {
          const next = Math.ceil(event.nativeEvent.layout.height);
          if (next <= 0 || Math.abs(next - measuredRef.current) < 1) return;
          measuredRef.current = next;
          setMeasured(next);
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    width: '100%',
  },
});
