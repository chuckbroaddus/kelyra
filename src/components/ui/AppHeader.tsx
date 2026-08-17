import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { chrome, type } from '@/constants/theme';
import { isChromePushed, useChrome } from '@/lib/chrome/ChromeProvider';
import { formatCount } from '@/lib/format';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

function wordmarkFor(pathname: string, pushedTitle: string | null): string {
  if (isChromePushed(pathname)) {
    if (pathname === '/search') return 'Search';
    if (pathname === '/notifications') return 'Notifications';
    if (pathname === '/proposal') return 'Look at this';
    if (pathname.endsWith('/family')) return 'Family';
    if (pathname.endsWith('/assignment/new')) return pushedTitle || 'New Assignment';
    if (pathname.includes('/assignment/')) return pushedTitle || 'Assignment';
    return pushedTitle || 'Kelyra';
  }
  if (pathname === '/capture') return 'Capture';
  if (pathname === '/inbox') return 'Inbox';
  if (pathname === '/ask') return 'Ask';
  if (pathname === '/profile') return 'Profile';
  if (pathname === '/todo') return 'To-do';
  if (pathname.endsWith('/parents')) return 'Parents';
  if (pathname.endsWith('/assignments')) return 'Assignments';
  if (pathname.endsWith('/setup') || pathname.includes('/gradebook')) return 'Class';
  if (/^\/class\/[^/]+$/.test(pathname)) return 'Class';
  return 'Kelyra';
}

function searchPlaceholder(from: string, role: string): string {
  if (role === 'student') return 'Find your practice';
  if (role === 'parent') return 'Find in this note';
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
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;
  const bar = landscape ? chrome.headerHeightLandscape : chrome.headerHeight;
  const icon = landscape ? 22 : 24;
  const pushed = isChromePushed(pathname);
  const searching = pathname === '/search';
  const title = wordmarkFor(pathname, chromeState.pushedTitle);
  const onHome = title === 'Kelyra' && !pushed;
  const teacher = chromeState.role === 'teacher';
  const count = chromeState.badgeCount;

  if (chromeState.role === 'none') return null;

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
      <View style={[styles.bar, { height: bar, paddingRight: 4 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pushed ? 'Back' : 'Open menu'}
          onPress={() => {
            if (pushed) {
              if (chromeState.requestPushedBack()) return;
              router.back();
            } else chromeState.setDrawerOpen(true);
          }}
          style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
        >
          <Icon name={pushed ? 'back' : 'menu'} color={colors.ink} size={22} />
        </Pressable>

        {searching ? (
          <>
            <TextInput
              autoFocus
              value={chromeState.searchQuery}
              onChangeText={chromeState.setSearchQuery}
              placeholder={searchPlaceholder(chromeState.searchFrom, chromeState.role)}
              placeholderTextColor={colors.mute}
              keyboardAppearance={scheme}
              style={[
                styles.search,
                {
                  backgroundColor: colors.wash,
                  color: colors.ink,
                  borderColor: colors.line,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => {
                chromeState.setSearchQuery('');
                router.back();
              }}
              style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.cancelLabel, { color: colors.ink }]}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text
              style={[
                styles.wordmark,
                {
                  color: colors.ink,
                  fontSize: landscape ? 16 : onHome ? 20 : 18,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {teacher ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take a photo"
                onPress={chromeState.openHeaderCamera}
                style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
              >
                <Icon name="capture" color={colors.ink} size={icon} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              onPress={() => {
                chromeState.setSearchFrom(pathname);
                chromeState.setSearchQuery('');
                router.push('/search');
              }}
              style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
            >
              <Icon name="search" color={colors.ink} size={icon} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={count > 0 ? `Notifications, ${count} waiting` : 'Notifications'}
              onPress={() => router.push('/notifications')}
              style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
            >
              <Icon name="bell" color={colors.ink} size={icon} />
              {count > 0 ? (
                <View
                  style={[
                    styles.badge,
                    count > 99 && styles.badgeWide,
                    { backgroundColor: colors.danger },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: scheme === 'dark' ? '#1A120C' : colors.brandInk }]}>
                    {formatCount(count)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    gap: 8,
  },
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    ...type.title,
    flex: 1,
    fontWeight: '700',
  },
  search: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  cancel: {
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...type.button,
    fontSize: 15,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
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
