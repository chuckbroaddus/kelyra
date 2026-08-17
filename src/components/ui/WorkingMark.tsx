import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Size = 20 | 36;

const pencil = {
  eraser: '#E58FA0',
  ferrule: '#D0D5DA',
  band: '#8E959C',
  barrel: '#F4C430',
  facet: '#C99518',
  wood: '#E8C49A',
  woodEdge: '#D4A574',
  tip: '#2A2622',
};

export function WorkingMark({ size = 20, accessible = true }: { size?: Size; accessible?: boolean }) {
  const { scheme } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;
  const [reduce, setReduce] = useState(false);
  const s = size / 20;
  const cx = 10 * s;
  const body = 3.1 * s;
  const left = cx - body / 2;
  const tip = scheme === 'dark' ? '#D2CDC4' : '#3D3934';

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduce) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      spin.setValue(0);
    };
  }, [reduce, spin]);

  const rotate = reduce
    ? '0deg'
    : spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      accessible={accessible}
      accessibilityRole={accessible ? 'progressbar' : undefined}
      accessibilityLabel={accessible ? 'Working' : undefined}
      accessibilityState={accessible ? { busy: true } : undefined}
      style={[styles.canvas, { width: size, height: size, transform: [{ rotate }] }]}
    >
      {/* Pink eraser — top */}
      <View
        style={{
          position: 'absolute',
          left: cx - 1.45 * s,
          top: 0.5 * s,
          width: 2.9 * s,
          height: 2.3 * s,
          borderTopLeftRadius: 1.1 * s,
          borderTopRightRadius: 1.1 * s,
          backgroundColor: pencil.eraser,
        }}
      />
      {/* Ferrule */}
      <View
        style={{
          position: 'absolute',
          left: cx - 1.7 * s,
          top: 2.6 * s,
          width: 3.4 * s,
          height: 1.9 * s,
          backgroundColor: pencil.ferrule,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cx - 1.7 * s,
          top: 2.95 * s,
          width: 3.4 * s,
          height: 0.3 * s,
          backgroundColor: pencil.band,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cx - 1.7 * s,
          top: 3.8 * s,
          width: 3.4 * s,
          height: 0.3 * s,
          backgroundColor: pencil.band,
        }}
      />
      {/* Yellow barrel */}
      <View
        style={{
          position: 'absolute',
          left,
          top: 4.4 * s,
          width: body,
          height: 9.4 * s,
          backgroundColor: pencil.barrel,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left,
          top: 4.4 * s,
          width: 0.7 * s,
          height: 9.4 * s,
          backgroundColor: pencil.facet,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: left + body - 0.7 * s,
          top: 4.4 * s,
          width: 0.7 * s,
          height: 9.4 * s,
          backgroundColor: pencil.facet,
        }}
      />
      {/* Wood taper */}
      <View
        style={{
          position: 'absolute',
          left: cx - 1.4 * s,
          top: 13.7 * s,
          width: 2.8 * s,
          height: 1.4 * s,
          backgroundColor: pencil.wood,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cx - 1.05 * s,
          top: 15 * s,
          width: 2.1 * s,
          height: 1.3 * s,
          backgroundColor: pencil.woodEdge,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: cx - 0.75 * s,
          top: 16.2 * s,
          width: 1.5 * s,
          height: 1.2 * s,
          backgroundColor: pencil.wood,
        }}
      />
      {/* Graphite — light on dark so the tip stays visible */}
      <View
        style={{
          position: 'absolute',
          left: cx - 0.55 * s,
          top: 17.2 * s,
          width: 1.1 * s,
          height: 2.2 * s,
          backgroundColor: tip,
          borderBottomLeftRadius: 0.55 * s,
          borderBottomRightRadius: 0.55 * s,
        }}
      />
    </Animated.View>
  );
}

export function WorkingLine({
  size = 20,
  text = 'Working…',
}: {
  size?: Size;
  text?: string;
}) {
  const { colors } = useTheme();
  const label = text.replace(/…$/, '').trim() || 'Working';
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={styles.line}
    >
      <WorkingMark size={size} accessible={false} />
      <Text style={[type.meta, { color: colors.mute, flexShrink: 1 }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: 'visible',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
