import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HoverTip } from '@/components/ui/HoverTip';
import { Icon } from '@/components/ui/Icon';
import { chrome, shadows } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  query: string;
  onQuery: (value: string) => void;
  onCompose: () => void;
  onMenu: () => void;
};

export function MessagesTray({ query, onQuery, onCompose, onMenu }: Props) {
  const { colors, scheme } = useTheme();
  const chromeState = useChrome();
  const setLocalTray = chromeState.setLocalTray;
  const setKeepLocalTray = chromeState.setKeepLocalTray;
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;
  const [searching, setSearching] = useState(false);
  const [reduce, setReduce] = useState(false);
  const expand = useRef(new Animated.Value(0)).current;
  const searchRef = useRef<TextInput>(null);
  const ignoreBlur = useRef(false);
  const icon = landscape ? 22 : 24;
  const frameH = landscape ? chrome.trayHeightLandscape : chrome.trayHeight;
  const hit = landscape ? 44 : 48;
  const hInset = Math.max(insets.left, insets.right, 12);
  const stacked = !layout.showTopBar;
  const keyboardLift = chromeState.keyboardVisible && chromeState.localTray;
  const bottom = keyboardLift
    ? chromeState.keyboardHeight + 8
    : stacked
      ? chromeState.trayRest + 8
      : 8 + Math.max(insets.bottom, 8);

  useEffect(() => {
    setLocalTray(true);
    return () => setLocalTray(false);
  }, [setLocalTray]);

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
    setKeepLocalTray(searching);
    if (reduce) {
      expand.setValue(searching ? 1 : 0);
      return;
    }
    Animated.timing(expand, {
      toValue: searching ? 1 : 0,
      duration: searching ? chrome.motion.searchIn : chrome.motion.searchOut,
      easing: searching ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expand, reduce, searching, setKeepLocalTray]);

  const closeSearch = () => setSearching(false);

  const toggleSearch = () => {
    if (searching) {
      closeSearch();
      return;
    }
    setSearching(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  return (
    <>
    {searching ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close search"
        onPress={closeSearch}
        style={styles.dismiss}
      />
    ) : null}
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.float,
        {
          left: hInset,
          right: hInset,
          bottom,
          transform: [{ translateY: chromeState.localTrayTranslate }],
          opacity: chromeState.localTrayOpacity,
        },
      ]}
    >
      <View
        style={[
          styles.frame,
          {
            height: frameH,
            backgroundColor: colors.elevated,
            borderColor: colors.line,
            ...(scheme === 'light' ? shadows.light : null),
          },
        ]}
      >
        <HoverTip label="New message">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New message"
            onPress={() => {
              closeSearch();
              onCompose();
            }}
            style={({ pressed }) => [styles.hit, { width: hit, height: hit }, pressed && { opacity: 0.7 }]}
          >
            <View style={{ width: icon, height: icon, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="compose" color={colors.ink} size={icon} />
            </View>
          </Pressable>
        </HoverTip>

        <Animated.View
          pointerEvents="none"
          style={{
            flex: expand.interpolate({ inputRange: [0, 1], outputRange: [1, 0.01] }),
            minWidth: 0,
          }}
        />

        <HoverTip label={searching ? 'Close search' : 'Search'}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={searching ? 'Close search' : 'Search'}
            onPressIn={() => {
              ignoreBlur.current = true;
            }}
            onPress={toggleSearch}
            style={({ pressed }) => [styles.hit, { width: hit, height: hit }, pressed && { opacity: 0.7 }]}
          >
            <View style={{ width: icon, height: icon, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="search" color={colors.ink} size={icon} />
            </View>
          </Pressable>
        </HoverTip>

        <Animated.View
          pointerEvents={searching ? 'auto' : 'none'}
          style={[
            styles.searchSlot,
            {
              flex: expand.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }),
              opacity: expand.interpolate({ inputRange: [0.15, 1], outputRange: [0, 1] }),
            },
          ]}
        >
          {searching ? (
            <TextInput
              ref={searchRef}
              value={query}
              onChangeText={onQuery}
              placeholder="Search"
              placeholderTextColor={colors.mute}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel="Search messages"
              onBlur={() => {
                requestAnimationFrame(() => {
                  if (ignoreBlur.current) {
                    ignoreBlur.current = false;
                    return;
                  }
                  closeSearch();
                });
              }}
              style={[
                styles.search,
                {
                  backgroundColor: colors.wash,
                  color: colors.ink,
                  borderColor: colors.line,
                },
              ]}
            />
          ) : (
            <View />
          )}
        </Animated.View>

        <HoverTip label="Filter">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter"
            onPress={() => {
              closeSearch();
              onMenu();
            }}
            style={({ pressed }) => [styles.hit, { width: hit, height: hit }, pressed && { opacity: 0.7 }]}
          >
            <View style={{ width: icon, height: icon, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="filter" color={colors.ink} size={icon} />
            </View>
          </Pressable>
        </HoverTip>
      </View>
    </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  dismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 16,
  },
  float: {
    position: 'absolute',
    zIndex: 17,
  },
  frame: {
    borderRadius: chrome.trayRadius,
    borderWidth: 1,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  searchSlot: {
    minWidth: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  search: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});
