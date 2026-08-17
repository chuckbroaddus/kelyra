import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type ListSwipeAction = {
  key: string;
  label: string;
  tone: 'brand' | 'wash' | 'danger';
  onPress: () => void;
  autoCommit?: boolean;
};

type Props = {
  title: string;
  status?: string;
  /** Replaces the status line visually. `status` still feeds the spoken name if set. */
  statusNode?: ReactNode;
  avatarName?: string;
  photoUrl?: string | null;
  unknown?: boolean;
  chevron?: boolean;
  right?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  leading?: ListSwipeAction[];
  trailing?: ListSwipeAction[];
};

export function ListRow({
  title,
  status,
  statusNode,
  avatarName,
  photoUrl,
  unknown,
  chevron = true,
  right,
  onPress,
  selected,
  leading = [],
  trailing = [],
}: Props) {
  const { colors, scheme } = useTheme();
  const width = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const start = useRef(0);
  const [swiping, setSwiping] = useState(false);
  const swipable = leading.length + trailing.length > 0;

  const snap = (to: number) => {
    Animated.timing(x, {
      toValue: to,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && to === 0) setSwiping(false);
    });
  };

  const run = (action: ListSwipeAction) => {
    snap(0);
    action.onPress();
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        swipable && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        setSwiping(true);
        x.stopAnimation((value) => {
          start.current = value;
        });
      },
      onPanResponderMove: (_, g) => {
        const maxL = leading.length * 80;
        const maxR = trailing.length * 80;
        const next = start.current + g.dx;
        x.setValue(Math.max(-maxR, Math.min(maxL, next)));
      },
      onPanResponderRelease: (_, g) => {
        const rowW = width.current || 320;
        const offset = start.current + g.dx;
        const maxL = leading.length * 80;
        const maxR = trailing.length * 80;
        const full = Math.max(120, 0.4 * rowW);
        if (offset > 0 && leading[0]) {
          if (offset > full && leading[0].autoCommit) {
            run(leading[0]);
            return;
          }
          snap(offset > 56 ? maxL : 0);
          return;
        }
        if (offset < 0 && trailing[0]) {
          if (offset < -full && trailing[0].autoCommit) {
            run(trailing[0]);
            return;
          }
          snap(offset < -56 ? -Math.min(maxR, trailing.length * 80) : 0);
          return;
        }
        snap(0);
      },
    }),
  ).current;

  const tile = (action: ListSwipeAction) => (
    <Pressable
      key={action.key}
      onPress={() => run(action)}
      style={[
        styles.tile,
        {
          backgroundColor:
            action.tone === 'brand'
              ? colors.brand
              : action.tone === 'danger'
                ? colors.danger
                : colors.wash,
          width: 80,
        },
      ]}
    >
      <Text
        style={[
          styles.tileLabel,
          {
            color:
              action.tone === 'brand'
                ? colors.brandInk
                : action.tone === 'danger'
                  ? scheme === 'dark'
                    ? '#1A120C'
                    : '#FFF8F3'
                  : colors.ink,
          },
        ]}
        numberOfLines={2}
      >
        {action.label}
      </Text>
    </Pressable>
  );

  const body = (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.line,
          backgroundColor: selected ? colors.brandSoft : colors.bg,
          alignItems: statusNode ? 'flex-start' : 'center',
        },
      ]}
    >
      <Avatar name={avatarName ?? title} photoUrl={photoUrl} size={36} unknown={unknown} />
      <View style={styles.text}>
        <MarqueeText
          text={title}
          align="start"
          paused={swiping}
          fadeColor={selected ? colors.brandSoft : colors.bg}
          style={[styles.title, { color: colors.ink }]}
        />
        {statusNode ??
          (status ? (
            <Text style={[styles.status, { color: colors.mute }]} numberOfLines={1}>
              {status}
            </Text>
          ) : null)}
      </View>
      {right}
      {chevron && onPress ? (
        <Text style={[styles.chevron, { color: colors.mute }]}>›</Text>
      ) : null}
    </View>
  );

  const spoken = status ? `${title}. ${status}` : title;
  const inner = onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.88 }]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.row,
            {
              borderBottomColor: colors.line,
              backgroundColor: selected ? colors.brandSoft : colors.bg,
              alignItems: statusNode ? 'flex-start' : 'center',
            },
          ]}
        >
          <Avatar name={avatarName ?? title} photoUrl={photoUrl} size={36} unknown={unknown} />
          <View style={styles.text}>
            <MarqueeText
              text={title}
              align="start"
              paused={pressed || swiping}
              fadeColor={selected ? colors.brandSoft : colors.bg}
              style={[styles.title, { color: colors.ink }]}
            />
            {statusNode ??
              (status ? (
                <Text style={[styles.status, { color: colors.mute }]} numberOfLines={1}>
                  {status}
                </Text>
              ) : null)}
          </View>
          {right}
          {chevron ? (
            <Text style={[styles.chevron, { color: colors.mute }]}>›</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  ) : (
    body
  );

  if (!swipable) return inner;

  return (
    <View
      style={styles.clip}
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width;
      }}
    >
      <View style={styles.actions} pointerEvents="box-none">
        <View style={styles.lead}>{leading.map(tile)}</View>
        <View style={styles.trail}>{trailing.map(tile)}</View>
      </View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...responder.panHandlers}>
        {inner}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  actions: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lead: {
    flexDirection: 'row',
  },
  trail: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  tile: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  row: {
    minHeight: 52,
    paddingVertical: 8,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...type.rowTitle,
    width: '100%',
  },
  status: type.meta,
  chevron: {
    fontSize: 18,
    width: 18,
    textAlign: 'center',
  },
});
