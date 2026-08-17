import { usePathname, useRouter } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { chrome, shadows, type } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { formatCount } from '@/lib/format';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Tab = {
  key: string;
  icon: IconName;
  label: string;
  href: string;
  active: boolean;
  badge?: number;
  faceUrl?: string | null;
  faceName?: string;
};

export function FloatingTabTray() {
  const { colors, scheme } = useTheme();
  const chromeState = useChrome();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;

  if (chromeState.role === 'none') return null;

  const tabs = tabsFor(
    chromeState.role,
    pathname,
    chromeState.classId,
    chromeState.badgeCount,
    chromeState.teacherPhotoUrl,
  );

  if (layout.showTopBar) {
    return (
      <View style={[styles.topBar, { backgroundColor: colors.elevated, borderBottomColor: colors.line }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab.active }}
            accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge} waiting` : tab.label}
            onPress={() => router.push(tab.href as never)}
            style={({ pressed }) => [styles.topItem, pressed && { opacity: 0.7 }]}
          >
            <View>
              <TabGlyph tab={tab} active={tab.active} size={20} colors={colors} />
              {tab.badge ? <CountBadge count={tab.badge} danger={colors.danger} ink={scheme === 'dark' ? '#1A120C' : colors.brandInk} /> : null}
            </View>
            <Text style={[styles.topLabel, { color: tab.active ? colors.brand : colors.mute }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
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
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab.active }}
            accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge} waiting` : tab.label}
            onPress={() => router.push(tab.href as never)}
            style={({ pressed }) => [styles.tab, { width: hit, height: hit }, pressed && { opacity: 0.7 }]}
          >
            <View>
              <TabGlyph tab={tab} active={tab.active} size={iconSize} colors={colors} />
              {tab.badge ? (
                <CountBadge count={tab.badge} danger={colors.danger} ink={scheme === 'dark' ? '#1A120C' : colors.brandInk} />
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
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
  if (tab.key === 'profile' && (tab.faceUrl || tab.faceName)) {
    const face = Math.max(22, size + 2);
    return (
      <View
        style={{
          borderWidth: active ? 2 : 0,
          borderColor: colors.brand,
          borderRadius: face / 2 + 2,
          padding: active ? 1 : 0,
        }}
      >
        <Avatar name={tab.faceName ?? 'You'} photoUrl={tab.faceUrl} size={face} />
      </View>
    );
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

function tabsFor(
  role: string,
  pathname: string,
  classId: string | null,
  badgeCount: number,
  teacherPhotoUrl: string | null,
): Tab[] {
  if (role === 'student') {
    return [
      { key: 'home', icon: 'today', label: 'Kelyra', href: '/todo', active: pathname === '/todo' },
      { key: 'ask', icon: 'ask', label: 'Ask', href: '/ask', active: pathname === '/ask' },
      { key: 'profile', icon: 'person', label: 'Profile', href: '/profile', active: pathname === '/profile' },
    ];
  }
  if (role === 'parent') {
    return [
      { key: 'home', icon: 'today', label: 'Kelyra', href: '/parent', active: pathname === '/parent' },
      { key: 'ask', icon: 'ask', label: 'Ask', href: '/ask', active: pathname === '/ask' },
      { key: 'profile', icon: 'person', label: 'Profile', href: '/profile', active: pathname === '/profile' },
    ];
  }

  const classRoot = classId ? `/class/${classId}` : '/';
  const onClassCluster =
    pathname.endsWith('/setup') ||
    pathname.includes('/gradebook') ||
    pathname.includes('/assignment') ||
    pathname.endsWith('/parents') ||
    pathname.includes('/parent/');
  const onClass = pathname.startsWith('/class/');
  const houseActive =
    pathname === '/' ||
    (onClass && !onClassCluster && !pathname.endsWith('/family') && !pathname.includes('/student/'));

  return [
    { key: 'home', icon: 'today', label: 'Kelyra', href: classRoot, active: houseActive },
    { key: 'capture', icon: 'capture', label: 'Capture', href: '/capture', active: pathname === '/capture' },
    {
      key: 'inbox',
      icon: 'inbox',
      label: 'Inbox',
      href: '/inbox',
      active: pathname === '/inbox',
      badge: badgeCount > 0 ? badgeCount : undefined,
    },
    {
      key: 'class',
      icon: 'records',
      label: 'Class',
      href: classId ? `${classRoot}/gradebook` : '/',
      active: onClassCluster,
    },
    { key: 'ask', icon: 'ask', label: 'Ask', href: '/ask', active: pathname === '/ask' },
    {
      key: 'profile',
      icon: 'person',
      label: 'Profile',
      href: '/profile',
      active: pathname === '/profile',
      faceUrl: teacherPhotoUrl,
      faceName: 'You',
    },
  ];
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
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  topItem: {
    flex: 1,
    minHeight: 44,
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
