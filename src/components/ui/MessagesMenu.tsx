import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { chrome, shadows, type } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Filter = 'all' | 'unread' | 'groups';

type Props = {
  visible: boolean;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  onNewGroup: () => void;
  onClose: () => void;
};

export function MessagesMenu({ visible, filter, onFilter, onNewGroup, onClose }: Props) {
  const { colors, scheme } = useTheme();
  const chromeState = useChrome();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const { width } = useWindowDimensions();
  const panelW = Math.min(280, width - 24);
  const [present, setPresent] = useState(false);
  const [reduce, setReduce] = useState(false);
  const presentRef = useRef(false);
  const lift = useRef(new Animated.Value(20)).current;
  const ink = useRef(new Animated.Value(0)).current;
  const landscape = layout.orientation === 'landscape' && layout.isPhone;
  const frameH = landscape ? chrome.trayHeightLandscape : chrome.trayHeight;
  const stacked = !layout.showTopBar;
  const keyboardLift = chromeState.keyboardVisible && chromeState.keepLocalTray;
  const trays = keyboardLift
    ? chromeState.keyboardHeight + 8 + frameH
    : stacked
      ? chromeState.trayRest + 8 + frameH
      : 8 + Math.max(insets.bottom, 8) + frameH;
  const bottom = trays + 8;

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
    if (visible) {
      presentRef.current = true;
      setPresent(true);
      if (reduce) {
        lift.setValue(0);
        ink.setValue(1);
        return;
      }
      lift.setValue(20);
      ink.setValue(0);
      Animated.parallel([
        Animated.timing(lift, {
          toValue: 0,
          duration: chrome.motion.menuIn,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ink, {
          toValue: 1,
          duration: chrome.motion.menuIn,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!presentRef.current) return;
    if (reduce) {
      presentRef.current = false;
      setPresent(false);
      return;
    }
    Animated.parallel([
      Animated.timing(lift, {
        toValue: 16,
        duration: chrome.motion.menuOut,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ink, {
        toValue: 0,
        duration: chrome.motion.menuOut,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      presentRef.current = false;
      setPresent(false);
    });
  }, [ink, lift, reduce, visible]);

  const pick = (next: Filter) => {
    onFilter(next);
    onClose();
  };

  return (
    <Modal visible={present} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: scheme === 'dark' ? 'rgba(0, 0, 0, 0.28)' : 'rgba(26, 22, 18, 0.18)' },
          ]}
          onPress={onClose}
          accessibilityLabel="Close menu"
        />
        <Animated.View
          style={[
            styles.panel,
            {
              width: panelW,
              right: Math.max(insets.right, 12),
              bottom,
              backgroundColor: colors.elevated,
              borderColor: colors.line,
              ...(scheme === 'light' ? shadows.light : null),
              opacity: ink,
              transform: [{ translateY: lift }],
            },
          ]}
        >
          <Text style={[styles.heading, { color: colors.mute }]}>Filter</Text>
          {(
            [
              ['all', 'All'],
              ['unread', 'Unread'],
              ['groups', 'Groups'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === key }}
              onPress={() => pick(key)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
            >
              <Text style={[styles.rowLabel, { color: colors.ink }]}>{label}</Text>
              {filter === key ? <Icon name="check" color={colors.brand} size={18} /> : null}
            </Pressable>
          ))}
          <View style={[styles.rule, { backgroundColor: colors.line }]} />
          <Text style={[styles.heading, { color: colors.mute }]}>Groups</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onNewGroup}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
          >
            <Text style={[styles.rowLabel, { color: colors.ink }]}>New group</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    borderRadius: chrome.trayRadius,
    borderWidth: 1,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  heading: {
    ...type.meta,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    ...type.body,
    fontWeight: '600',
    flex: 1,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    marginHorizontal: 16,
  },
});
