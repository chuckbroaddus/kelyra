import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HoverTip, tipIfNew } from '@/components/ui/HoverTip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { KelyraMark } from '@/components/ui/KelyraMark';
import { chrome, shadows, type } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { tabsFor, type TrayTab } from '@/lib/chrome/trayTabs';
import { useSchoolFeedIcon } from '@/lib/feeds/useFeedIcon';
import { formatCount } from '@/lib/format';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Tab = TrayTab & { icon: IconName };

export function FloatingTabTray() {
  const { colors, scheme } = useTheme();
  const chromeState = useChrome();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ tab?: string | string[] }>();
  const homeTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;
  const schoolFeedIcon = useSchoolFeedIcon();

  if (chromeState.role === 'none' || chromeState.forceHidden) return null;

  const tabs = tabsFor(
    chromeState.role,
    pathname,
    chromeState.classId,
    chromeState.role === 'teacher' ? chromeState.needsCount : chromeState.badgeCount,
    homeTab,
    schoolFeedIcon,
  ) as Tab[];

  if (layout.showTopBar) {
    return (
      <View style={[styles.topBar, { backgroundColor: colors.elevated, borderBottomColor: colors.line }]}>
        {tabs.map((tab) => (
          <HoverTip key={tab.key} label={tipIfNew(tab.label, tabTip(tab))}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab.active }}
            accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge} waiting` : tab.label}
            onPress={() => router.push(tab.href as never)}
            style={({ pressed }) => [styles.topItem, pressed && { opacity: 0.7 }]}
          >
            <View style={{ width: glyphSize(tab, 20), height: glyphSize(tab, 20), alignItems: 'center', justifyContent: 'center' }}>
              <TabGlyph tab={tab} active={tab.active} size={glyphSize(tab, 20)} colors={colors} />
              {tab.badge ? <CountBadge count={tab.badge} danger={colors.danger} ink={scheme === 'dark' ? '#1A120C' : colors.brandInk} /> : null}
            </View>
            <Text style={[styles.topLabel, { color: tab.active ? colors.brand : colors.mute }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
          </HoverTip>
        ))}
      </View>
    );
  }

  const frameH = landscape ? chrome.trayHeightLandscape : chrome.trayHeight;
  const iconSize = landscape ? 22 : 24;
  const hit = landscape ? 44 : 48;
  const hInset = Math.max(insets.left, insets.right, 12);
  const bottom = landscape ? 6 + Math.max(insets.bottom, 6) : 8 + Math.max(insets.bottom, 8);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.float,
        {
          left: hInset,
          right: hInset,
          bottom,
          transform: [{ translateY: chromeState.trayTranslate }],
          opacity: chromeState.trayOpacity,
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
        {tabs.map((tab) => (
          <HoverTip key={tab.key} label={tabTip(tab)}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab.active }}
            accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge} waiting` : tab.label}
            onPress={() => router.push(tab.href as never)}
            style={({ pressed }) => [styles.tab, { width: hit, height: hit }, pressed && { opacity: 0.7 }]}
          >
            <View style={{ width: glyphSize(tab, iconSize), height: glyphSize(tab, iconSize), alignItems: 'center', justifyContent: 'center' }}>
              <TabGlyph tab={tab} active={tab.active} size={glyphSize(tab, iconSize)} colors={colors} />
              {tab.badge ? (
                <CountBadge count={tab.badge} danger={colors.danger} ink={scheme === 'dark' ? '#1A120C' : colors.brandInk} />
              ) : null}
            </View>
          </Pressable>
          </HoverTip>
        ))}
      </View>
    </Animated.View>
  );
}

function tabTip(tab: Tab): string {
  if (tab.badge) return `${tab.label}, ${tab.badge} waiting`;
  if (tab.key === 'home') {
    if (tab.label === 'Assignments') return 'Your assignments';
    if (tab.label === 'Desk') return 'Desk';
    return tab.label === 'School' ? 'School home' : 'Home';
  }
  if (tab.key === 'feed') return tab.href.startsWith('/student') ? 'Feeds' : 'School feed';
  if (tab.key === 'grades') return 'Your grades';
  if (tab.key === 'classes') return 'Every class in the school';
  if (tab.key === 'people') return tab.href.startsWith('/student') ? 'Classmates, teachers, and parents' : 'Staff, parents, and students';
  if (tab.key === 'manage' || tab.key === 'system') return 'Feed icon, activity, and responsibilities';
  if (tab.key === 'activity') return 'Immutable change log';
  if (tab.key === 'ask') return tab.label === 'Ask' ? 'Ask' : 'Talk with Kelyra';
  if (tab.key === 'capture') return 'File work';
  if (tab.key === 'inbox') return 'Needs';
  if (tab.key === 'class') return tab.href.startsWith('/student') ? 'Classes' : 'Grade book and class records';
  return tab.label;
}

function glyphSize(tab: Tab, size: number) {
  // Framed squircle, so the K is smaller than a cropped line icon at the same box.
  // Scale so it reads ~10% larger than the other tray glyphs.
  if (tab.icon !== 'ask') return size;
  return Math.round(size * 1.1 / 0.82);
}

function TabGlyph({
  tab,
  active,
  size,
  colors,
}: {
  tab: Tab;
  active: boolean;
  size: number;
  colors: { brand: string; mute: string };
}) {
  if (tab.icon === 'ask') {
    return <KelyraMark size={size} style={{ opacity: active ? 1 : 0.72 }} />;
  }
  return <Icon name={tab.icon} color={active ? colors.brand : colors.mute} size={size} />;
}

function CountBadge({ count, danger, ink }: { count: number; danger: string; ink: string }) {
  return (
    <View style={[styles.badge, count > 99 && styles.badgeWide, { backgroundColor: danger }]}>
      <Text style={[styles.badgeText, { color: ink }]}>{formatCount(count)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  float: {
    position: 'absolute',
    zIndex: 16,
  },
  frame: {
    borderRadius: chrome.trayRadius,
    borderWidth: 1,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    height: chrome.topBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    gap: 4,
  },
  topItem: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  topLabel: {
    ...type.badge,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWide: {
    minWidth: 18,
    height: 18,
  },
  badgeText: {
    ...type.badge,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
