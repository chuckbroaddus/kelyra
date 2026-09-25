import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, type } from '@/constants/theme';
import { useSwipeRowOpen } from '@/lib/ui/swipeRowOpen';
import {
  decideSwipeSnap,
  decideSwipeTerminate,
  syncGrantFromCurrentX,
  SWIPE_TILE,
} from '@/lib/ui/swipeRowSnap';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type SwipeCardAction = {
  key: string;
  label: string;
  tone: 'danger' | 'wash';
  onPress: () => void;
};

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  /** Right-to-left swipe reveals these (e.g. Delete). */
  trailing?: SwipeCardAction[];
  backgroundColor: string;
  borderColor: string;
};

/**
 * DIARY-SWIPE: card-shaped row with ListRow's swipe snap rules (swipeRowSnap) —
 * swipe right-to-left to reveal trailing actions, tap while open to close.
 * Fills its parent (fixed-height Day List item slot).
 */
export function SwipeActionCard({
  children,
  onPress,
  accessibilityLabel,
  trailing = [],
  backgroundColor,
  borderColor,
}: Props) {
  const { colors } = useTheme();
  const width = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const start = useRef(0);
  const openOffset = useRef(0);
  const grantFrom = useRef(0);
  const currentX = useRef(0);
  const lastDx = useRef(0);
  const [open, setOpen] = useState(false);
  const trailingRef = useRef(trailing);
  trailingRef.current = trailing;

  useSwipeRowOpen(open && trailing.length > 0);

  const snap = (to: number) => {
    openOffset.current = to;
    currentX.current = to;
    if (to !== 0) setOpen(true);
    Animated.timing(x, { toValue: to, duration: 160, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished && to === 0) setOpen(false);
      },
    );
  };

  const run = (action: SwipeCardAction) => {
    openOffset.current = 0;
    currentX.current = 0;
    Animated.timing(x, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      start.current = 0;
      setOpen(false);
      action.onPress();
    });
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => openOffset.current !== 0,
      onStartShouldSetPanResponderCapture: () => openOffset.current !== 0,
      onMoveShouldSetPanResponder: (_, g) => {
        if (!trailingRef.current.length) return false;
        if (openOffset.current !== 0) {
          return Math.abs(g.dx) > 2 && Math.abs(g.dx) >= Math.abs(g.dy);
        }
        // Right-to-left only when closed (left-to-right stays with the OS back swipe).
        return g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy);
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (openOffset.current === 0) return false;
        return Math.abs(g.dx) > 2 && Math.abs(g.dx) >= Math.abs(g.dy);
      },
      onPanResponderTerminationRequest: () => openOffset.current === 0,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        lastDx.current = 0;
        x.stopAnimation();
        const from = syncGrantFromCurrentX(currentX.current);
        start.current = from;
        openOffset.current = from;
        grantFrom.current = from;
      },
      onPanResponderMove: (_, g) => {
        const maxR = trailingRef.current.length * SWIPE_TILE;
        const clamped = Math.max(-maxR, Math.min(0, start.current + g.dx));
        lastDx.current = g.dx;
        openOffset.current = clamped;
        currentX.current = clamped;
        x.setValue(clamped);
        if (clamped !== 0) setOpen(true);
      },
      onPanResponderRelease: (_, g) => {
        const acts = trailingRef.current;
        const decision = decideSwipeSnap({
          grantX: grantFrom.current,
          offset: start.current + g.dx,
          gesture: { dx: g.dx, dy: g.dy, vx: g.vx },
          leadCount: 0,
          trailCount: acts.length,
          rowWidth: width.current || 320,
        });
        if (decision.kind === 'auto') {
          snap(decision.side === 'trail' ? -acts.length * SWIPE_TILE : 0);
          return;
        }
        snap(Math.min(0, decision.to));
      },
      onPanResponderTerminate: () => {
        snap(
          Math.min(
            0,
            decideSwipeTerminate(openOffset.current, 0, trailingRef.current.length, lastDx.current),
          ),
        );
      },
    }),
  ).current;

  return (
    <View
      style={[styles.wrap, { borderRadius: radius.md }]}
      onLayout={(e) => {
        width.current = e.nativeEvent.layout.width;
      }}
    >
      {open ? (
        <View style={styles.actions}>
          {trailing.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => run(action)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={[
                styles.tile,
                { backgroundColor: action.tone === 'danger' ? colors.dangerBrick : colors.wash },
              ]}
            >
              <Text
                style={[
                  styles.tileLabel,
                  { color: action.tone === 'danger' ? '#FFF8F3' : colors.ink },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Animated.View
        style={[styles.face, { transform: [{ translateX: x }] }]}
        {...responder.panHandlers}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityActions={trailing.map((a) => ({ name: a.key, label: a.label }))}
          onAccessibilityAction={(e) => {
            const action = trailing.find((a) => a.key === e.nativeEvent.actionName);
            if (action) action.onPress();
          }}
          onPress={() => {
            if (openOffset.current !== 0 || open) {
              snap(0);
              return;
            }
            onPress?.();
          }}
          style={[styles.card, { backgroundColor, borderColor }]}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  actions: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  tile: { width: SWIPE_TILE, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { ...type.meta, fontWeight: '700' },
  face: { flex: 1 },
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
});
