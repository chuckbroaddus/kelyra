import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountBadge } from '@/components/ui/CountBadge';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { HoverTip } from '@/components/ui/HoverTip';
import { Icon } from '@/components/ui/Icon';
import { KelyraMark } from '@/components/ui/KelyraMark';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { chrome, type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { isChromePushed, showHeaderCapture, useChrome } from '@/lib/chrome/ChromeProvider';
import { can } from '@/lib/school/matrix';
import { headerTitleFor } from '@/lib/chrome/titles';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

function searchPlaceholder(from: string, role: string): string {
  if (role === 'student') return 'Find an assignment';
  if (role === 'parent') return 'Find in this note';
  // Office seat only — dual-hat Teach seat stays class-scoped.
  if (role === 'superintendent' || role === 'administrator') return 'Find a person';
  if (from === '/inbox') return 'Find a capture or student';
  if (from.includes('/gradebook')) return 'Find a student or assignment';
  if (from.includes('/parent') || from.includes('/setup') || /\/class\/[^/]+\/?$/.test(from)) {
    return 'Find a student or parent';
  }
  return 'Find a student';
}

export function AppHeader() {
  const { colors, scheme } = useTheme();
  const chromeState = useChrome();
  const { profile, grants } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;
  const bar = landscape ? chrome.headerHeightLandscape : chrome.headerHeight;
  const icon = 22;
  const pushed = isChromePushed(pathname);
  const searching = pathname === '/search';
  const officeHome =
    chromeState.role === 'superintendent' || chromeState.role === 'administrator';
  const title = headerTitleFor({
    pathname: searching ? chromeState.searchFrom : pathname,
    pushedTitle: chromeState.pushedTitle,
    className: chromeState.className,
    contextTab: chromeState.contextTab,
    role: chromeState.role,
    schoolName: chromeState.schoolName,
    officeHome,
  });
  const onHome = (pathname === '/' || pathname === '') && !pushed;
  const logoUrl = chromeState.schoolLogoUrl;
  const capture =
    showHeaderCapture(pathname, chromeState.role) &&
    can(profile, 'capture.use', 'own', grants) &&
    !searching;
  const count = chromeState.badgeCount;
  const expand = useRef(new Animated.Value(searching ? 1 : 0)).current;
  const [reduce, setReduce] = useState(false);
  const searchRef = useRef<TextInput>(null);

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
      expand.setValue(searching ? 1 : 0);
      return;
    }
    Animated.timing(expand, {
      toValue: searching ? 1 : 0,
      duration: searching ? chrome.motion.searchIn : chrome.motion.searchOut,
      easing: searching ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expand, reduce, searching]);

  if (chromeState.role === 'none') return null;

  const openSearch = () => {
    if (searching) {
      chromeState.setSearchQuery('');
      if (chromeState.requestPushedBack()) return;
      router.back();
      return;
    }
    chromeState.setSearchFrom(pathname);
    chromeState.setSearchQuery('');
    router.push('/search');
  };

  const titleSize = landscape ? 16 : onHome ? 20 : 18;
  const titleLine = landscape ? 24 : 28;
  const kelyraMark =
    pathname === '/ask' || (searching && chromeState.searchFrom === '/ask');
  const markSize = bar + 12;
  const headerChrome = chromeState.headerChrome;
  const hideBack =
    Boolean(headerChrome.hideBack) ||
    (Boolean(headerChrome.hideBackOnNative) && Platform.OS !== 'web');
  // iPhone: edge-swipe already pops — hide duplicate <. Web / Android keep chevron.
  // forceBackChevron keeps < when dirty discard must intercept (proposal).
  const iosSwipeBack =
    Platform.OS === 'ios' && pushed && !headerChrome.forceBackChevron;
  const showBack = pushed && !kelyraMark && !hideBack && !iosSwipeBack;
  const showMenu = !showBack && !headerChrome.hideMenu;
  const showSearch = !headerChrome.hideSearch;
  const showMail = !headerChrome.hideMail;
  const showCapture = capture && !headerChrome.hideCapture;
  const showClose = Boolean(headerChrome.showClose);
  const titleFlex = expand.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const titleOpacity = expand.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0, 0] });
  const fieldOpacity = expand.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] });

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: colors.elevated,
          borderBottomColor: colors.line,
        },
      ]}
    >
      <View style={[styles.bar, { height: bar, paddingLeft: showBack ? 4 : 12, paddingRight: 4 }]}>
        {showBack ? (
          <HoverTip label="Go back">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => {
                if (chromeState.requestPushedBack()) return;
                router.back();
              }}
              style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.glyph}>
                <Icon name="back" color={colors.ink} size={icon} />
              </View>
            </Pressable>
          </HoverTip>
        ) : null}

        {kelyraMark ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            style={[styles.kelyraSlot, { width: markSize, height: bar }]}
          >
            <KelyraMark size={markSize} />
          </View>
        ) : logoUrl ? (
          <View style={styles.logoSlot} accessibilityLabel="School logo">
            <RemoteImage
              uri={logoUrl}
              accessibilityLabel="School logo"
              contentFit="contain"
              style={styles.logo}
            />
          </View>
        ) : null}

        <Animated.View
          pointerEvents={searching ? 'none' : 'box-none'}
          style={[
            styles.titleSlot,
            searching ? styles.slotClosed : styles.slotOpen,
            {
              flexGrow: searching ? 0 : titleFlex,
              opacity: titleOpacity,
            },
          ]}
        >
          <MarqueeText
            key={title}
            text={title}
            align="start"
            accessible={!searching}
            accessibilityLabel={title}
            fadeColor={colors.elevated}
            style={[
              styles.wordmark,
              {
                color: colors.ink,
                fontSize: titleSize,
                lineHeight: titleLine,
              },
            ]}
          />
        </Animated.View>

        {showCapture ? (
          <HoverTip label="Propose what this is">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Propose what this is"
              onPress={chromeState.openHeaderCamera}
              style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.glyph}>
                <Icon name="capture" color={colors.ink} size={icon} />
              </View>
            </Pressable>
          </HoverTip>
        ) : null}

        {showSearch ? (
        <HoverTip label={searching ? 'Close search' : 'Search'}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={searching ? 'Close search' : 'Search'}
            onPress={openSearch}
            style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.glyph}>
              <Icon name="search" color={colors.ink} size={icon} />
            </View>
          </Pressable>
        </HoverTip>
        ) : null}

        <Animated.View
          pointerEvents={searching ? 'auto' : 'none'}
          style={[
            styles.searchSlot,
            searching ? styles.slotOpen : styles.slotClosed,
            {
              flexGrow: searching ? 1 : expand,
              opacity: fieldOpacity,
            },
          ]}
        >
          {searching ? (
            <TextInput
              ref={searchRef}
              autoFocus
              value={chromeState.searchQuery}
              onChangeText={chromeState.setSearchQuery}
              placeholder={searchPlaceholder(chromeState.searchFrom, chromeState.role)}
              placeholderTextColor={colors.mute}
              keyboardAppearance={scheme}
              returnKeyType="search"
              accessibilityLabel="Search"
              style={[
                styles.search,
                {
                  backgroundColor: colors.wash,
                  color: colors.ink,
                  borderColor: colors.line,
                },
              ]}
            />
          ) : null}
        </Animated.View>

        {showClose ? (
          <HoverTip label="Close lesson">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close lesson"
              onPress={() => {
                if (chromeState.requestHeaderClose()) return;
                router.back();
              }}
              style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.glyph}>
                <Icon name="close" color={colors.ink} size={icon} />
              </View>
            </Pressable>
          </HoverTip>
        ) : null}

        {showMail ? (
        <HoverTip label={count > 0 ? `Messages, ${count} waiting` : 'Messages'}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={count > 0 ? `Messages, ${count} waiting` : 'Messages'}
            onPress={() => router.push('/messages')}
            style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.glyph}>
              <Icon name="mail" color={colors.ink} size={icon} />
              <CountBadge count={count} />
            </View>
          </Pressable>
        </HoverTip>
        ) : null}

        {showMenu ? (
          <HoverTip label="Open menu">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              onPress={() => chromeState.setDrawerOpen(true)}
              style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.glyph}>
                <Icon name="menu" color={colors.ink} size={icon} />
              </View>
            </Pressable>
          </HoverTip>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    zIndex: 20,
    overflow: 'visible',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    overflow: 'visible',
  },
  kelyraSlot: {
    marginRight: 8,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 2,
  },
  hit: {
    width: 44,
    height: 44,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotOpen: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  slotClosed: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 0,
    width: 0,
    minWidth: 0,
    marginRight: 0,
    overflow: 'hidden',
  },
  titleSlot: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ overflowY: 'visible' } as const) : null),
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  logoSlot: {
    width: 22,
    height: 22,
    marginRight: 8,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    overflow: 'hidden',
  },
  logo: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  wordmark: {
    ...type.title,
    flex: 1,
    minWidth: 0,
    fontWeight: '700',
  },
  searchSlot: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    marginRight: 4,
  },
  search: {
    height: 40,
    width: '100%',
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    ...(Platform.OS === 'web'
      ? ({ outlineWidth: 0, boxSizing: 'border-box' } as unknown as object)
      : null),
  },
});
