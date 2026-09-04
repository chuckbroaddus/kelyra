import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { HandleLink } from '@/components/ui/HandleLink';
import { HoverTip, tipIfNew } from '@/components/ui/HoverTip';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { SettingsSheet } from '@/components/ui/SettingsSheet';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { Icon } from '@/components/ui/Icon';
import { KelyraMark } from '@/components/ui/KelyraMark';
import { ListRow } from '@/components/ui/ListRow';
import { deleteClass } from '@/lib/classes/delete';
import { chrome, shadows, type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { isOfficeChromeRole } from '@/lib/chrome/seat';
import { formatHandle, isAlsoParent } from '@/lib/school/roles';
import { setActiveClass } from '@/lib/classes/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

function matches(label: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return label.toLowerCase().includes(needle);
}

export function HamburgerDrawer() {
  const { colors, scheme } = useTheme();
  const { session, teacher, profile, signOut } = useAuth();
  const chromeState = useChrome();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const drawerW = Math.min(chrome.drawerWidth, width - 56);
  const peek = Math.max(insets.top + chrome.headerHeight, 72);
  const x = useRef(new Animated.Value(drawerW)).current;
  const strip = useRef(new Animated.Value(peek)).current;
  const [present, setPresent] = useState(false);
  const presentRef = useRef(false);
  const trayY = useRef(new Animated.Value(0)).current;
  const trayVisible = useRef(true);
  const lastY = useRef(0);
  const acc = useRef(0);
  const lastDir = useRef<1 | -1 | 0>(0);
  const [pendingClass, setPendingClass] = useState<{ id: string; name: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const trayH = 56;
  const trayBottom = 8 + Math.max(insets.bottom, 8);
  const hideDistance = trayH + trayBottom + 12;

  useEffect(() => {
    if (chromeState.drawerOpen) {
      presentRef.current = true;
      setPresent(true);
      x.setValue(drawerW);
      strip.setValue(peek);
      Animated.sequence([
        Animated.timing(x, {
          toValue: 0,
          duration: chrome.motion.drawerInX,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(strip, {
          toValue: height,
          duration: chrome.motion.drawerInY,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }
    if (!presentRef.current) return;
    Animated.sequence([
      Animated.timing(strip, {
        toValue: peek,
        duration: chrome.motion.drawerOutY,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(x, {
        toValue: drawerW,
        duration: chrome.motion.drawerOutX,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      presentRef.current = false;
      setPresent(false);
    });
  }, [chromeState.drawerOpen, drawerW, height, peek, strip, x]);

  useEffect(() => {
    if (!chromeState.drawerOpen) return;
    setQuery('');
    trayVisible.current = true;
    lastY.current = 0;
    acc.current = 0;
    lastDir.current = 0;
    trayY.setValue(0);
  }, [chromeState.drawerOpen, trayY]);

  const close = () => chromeState.setDrawerOpen(false);

  const hideDrawerNow = () => {
    presentRef.current = false;
    x.setValue(drawerW);
    strip.setValue(peek);
    setPresent(false);
    chromeState.setDrawerOpen(false);
  };

  const openSettings = () => {
    hideDrawerNow();
    setSettingsOpen(true);
  };

  const showTray = () => {
    if (trayVisible.current) return;
    trayVisible.current = true;
    Animated.timing(trayY, {
      toValue: 0,
      duration: chrome.motion.tray,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const hideTray = () => {
    if (!trayVisible.current) return;
    trayVisible.current = false;
    Animated.timing(trayY, {
      toValue: hideDistance,
      duration: chrome.motion.tray,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const onMenuScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement, velocity } = event.nativeEvent;
    const y = contentOffset.y;
    const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
    if (y > maxY) {
      lastY.current = maxY;
      acc.current = 0;
      lastDir.current = 0;
      return;
    }
    if (y < 8) {
      lastY.current = y;
      acc.current = 0;
      showTray();
      return;
    }
    const dy = y - lastY.current;
    lastY.current = y;
    const vy = velocity?.y ?? 0;
    if (vy > 1.2) {
      acc.current = 0;
      hideTray();
      return;
    }
    if (vy < -1.2) {
      acc.current = 0;
      if (y >= maxY - 16) return;
      showTray();
      return;
    }
    const dir: 1 | -1 | 0 = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    if (dir !== 0 && dir !== lastDir.current) {
      acc.current = 0;
      lastDir.current = dir;
    }
    acc.current += dy;
    if (acc.current > 12) {
      acc.current = 0;
      hideTray();
    } else if (acc.current < -8) {
      acc.current = 0;
      if (y < maxY - 16) showTray();
    }
  };

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) close();
      },
    }),
  ).current;

  const go = (href: string, replace = false) => {
    close();
    if (replace) router.replace(href as never);
    else router.push(href as never);
  };

  const runSearch = () => {
    const next = query.trim();
    chromeState.setSearchFrom('/');
    chromeState.setSearchQuery(next);
    go('/search');
  };

  const staff = chromeState.role === 'teacher' || chromeState.role === 'administrator' || chromeState.role === 'superintendent';
  const officeSeat = isOfficeChromeRole(chromeState.role);
  const teacherSeat = chromeState.role === 'teacher';
  const q = query;

  return (
    <>
    <Modal
      visible={present}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      <View style={styles.root}>
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: scheme === 'dark' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(26, 22, 18, 0.40)' },
          ]}
          onPress={close}
          accessibilityLabel="Close menu"
        />
        <Animated.View
          {...swipe.panHandlers}
          style={[
            styles.sheet,
            {
              width: drawerW,
              height: strip,
              backgroundColor: colors.elevated,
              paddingTop: insets.top + 12,
              transform: [{ translateX: x }],
            },
          ]}
        >
          <ScrollView
            style={styles.scroller}
            contentContainerStyle={{ paddingBottom: trayH + trayBottom + 16 }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            onScroll={onMenuScroll}
          >
          {staff ? (
            <>
              {matches(profile?.username ? formatHandle(profile.username) : session?.user.email ?? teacher?.email ?? 'Profile', q) ? (
              <WhoRow
                name={teacher?.display_name || profile?.username || session?.user.email || 'Teacher'}
                photoUrl={chromeState.teacherPhotoUrl}
                username={profile?.username}
                profileId={profile?.id}
                fallback={session?.user.email ?? teacher?.email ?? 'Teacher'}
                fadeColor={colors.elevated}
                ink={colors.ink}
                onPress={() => go('/profile')}
              />
              ) : null}
              {officeSeat && profile?.role === 'superintendent' ? (
                <>
                  {matches('Feed', q) ? (
                    <DrawerRow label="Feed" onPress={() => go('/?tab=feed')} />
                  ) : null}
                  {matches('Classes', q) ? (
                    <DrawerRow label="Classes" onPress={() => go('/?tab=classes')} />
                  ) : null}
                  {matches('People', q) ? (
                    <DrawerRow label="People" onPress={() => go('/?tab=people')} />
                  ) : null}
                  {matches('Manage', q) || matches('School', q) ? (
                    <DrawerRow label="Manage" onPress={() => go('/?tab=manage')} />
                  ) : null}
                  {matches('Kelyra', q) || matches('Ask', q) ? (
                    <DrawerRow
                      label="Kelyra"
                      onPress={() => go('/ask')}
                      leading={<KelyraMark size={22} />}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {chromeState.classes.filter((klass) => matches(klass.name, q)).map((klass) => (
                    <ListRow
                      key={klass.id}
                      title={klass.name}
                      avatarName={klass.name}
                      chevron={false}
                      selected={klass.id === chromeState.classId}
                      onPress={() => {
                        if (teacher) void setActiveClass(teacher.id, klass.id);
                        chromeState.refreshChrome();
                        go(teacherSeat ? `/class/${klass.id}` : `/admin/class/${klass.id}`, true);
                      }}
                      trailing={[
                        {
                          key: 'delete',
                          label: 'Delete',
                          tone: 'danger',
                          autoCommit: false,
                          onPress: () => setPendingClass({ id: klass.id, name: klass.name }),
                        },
                      ]}
                    />
                  ))}
                  {teacherSeat && matches('Another class', q) ? (
                    <DrawerRow label="Another class" onPress={() => go('/?switch=1')} />
                  ) : null}
                  <Hairline />
                  {officeSeat ? (
                    <>
                      {matches('People', q) ? <DrawerRow label="People" onPress={() => go('/?tab=people')} /> : null}
                      {matches('Activity', q) ? <DrawerRow label="Activity" onPress={() => go('/activity')} /> : null}
                      {matches('Messages', q) ? <DrawerRow label="Messages" onPress={() => go('/messages')} /> : null}
                      {matches('Responsibilities', q) ? (
                        <DrawerRow label="Responsibilities" onPress={() => go('/admin/matrix')} />
                      ) : null}
                      <Hairline />
                    </>
                  ) : null}
                  {chromeState.classId && teacherSeat ? (
                    <>
                      {q.trim() && matches('Grade book', q) ? (
                      <DrawerRow
                        label="Grade book"
                        onPress={() => {
                          chromeState.setContextTab('book', `/class/${chromeState.classId}/gradebook`);
                          go(`/class/${chromeState.classId}/gradebook`);
                        }}
                      />
                      ) : null}
                      {q.trim() && matches('Parents', q) ? (
                        <DrawerRow label="Parents" onPress={() => go(`/class/${chromeState.classId}/parents`)} />
                      ) : null}
                      {matches('Family update', q) ? (
                        <DrawerRow label="Family update" onPress={() => go(`/class/${chromeState.classId}/family`)} />
                      ) : null}
                    </>
                  ) : null}
                </>
              )}
              {chromeState.canChooseSeat ? (
                <>
                  {teacherSeat && matches('Office', q) ? (
                    <DrawerRow
                      label="Office"
                      onPress={() => {
                        chromeState.setChromeSeat('office');
                        go('/', true);
                      }}
                    />
                  ) : null}
                  {officeSeat && matches('Teach', q) ? (
                    <DrawerRow
                      label="Teach"
                      onPress={() => {
                        chromeState.setChromeSeat('teacher');
                        go('/', true);
                      }}
                    />
                  ) : null}
                  <Hairline />
                </>
              ) : null}
              {isAlsoParent(profile) && matches('My children', q) ? (
                <>
                  <DrawerRow label="My children" onPress={() => go('/parent')} />
                  <Hairline />
                </>
              ) : null}
              {officeSeat && profile?.role !== 'superintendent' && matches('Feed', q) ? (
                <DrawerRow label="Feed" onPress={() => go('/?tab=feed')} />
              ) : null}
              <Hairline />
              {matches('Sign out', q) ? (
              <DrawerRow
                label="Sign out"
                danger
                onPress={() => {
                  close();
                  void signOut().then(() => router.replace('/'));
                }}
              />
              ) : null}
            </>
          ) : null}

          {chromeState.role === 'student' ? (
            <>
              {profile?.username ? (
                <WhoRow
                  name={profile.display_name || profile.username}
                  photoUrl={chromeState.teacherPhotoUrl}
                  username={profile.username}
                  profileId={profile.id}
                  fadeColor={colors.elevated}
                  ink={colors.ink}
                  onPress={() => go('/profile')}
                />
              ) : (
                <Text style={[styles.meta, { color: colors.mute }]} numberOfLines={2}>
                  {chromeState.studentSession?.displayName ?? 'Student'}
                  {chromeState.studentSession?.className
                    ? `\n${chromeState.studentSession.className}`
                    : ''}
                </Text>
              )}
              {matches('Assignments', q) ? (
                <DrawerRow label="Assignments" onPress={() => go('/todo')} />
              ) : null}
              {matches('Feeds', q) ? <DrawerRow label="Feeds" onPress={() => go('/student/feed')} /> : null}
              {matches('Classes', q) ? <DrawerRow label="Classes" onPress={() => go('/student/class')} /> : null}
              {matches('Grades', q) ? <DrawerRow label="Grades" onPress={() => go('/student/grades')} /> : null}
              {matches('People', q) ? <DrawerRow label="People" onPress={() => go('/student/people')} /> : null}
              {matches('Sign out', q) ? (
                <DrawerRow
                  label="Sign out"
                  danger
                  onPress={() => {
                    close();
                    void signOut().then(() => router.replace('/'));
                  }}
                />
              ) : null}
            </>
          ) : null}

          {chromeState.role === 'parent' ? (
            <>
              {profile?.username ? (
                <WhoRow
                  name={profile.display_name || profile.username}
                  photoUrl={chromeState.teacherPhotoUrl}
                  username={profile.username}
                  profileId={profile.id}
                  fadeColor={colors.elevated}
                  ink={colors.ink}
                  onPress={() => go('/profile')}
                />
              ) : (
                <Text style={[styles.meta, { color: colors.mute }]}>Parent</Text>
              )}
              {matches('My children', q) ? (
                <DrawerRow label="My children" onPress={() => go('/parent')} />
              ) : null}
              {matches('Sign out', q) ? (
                <DrawerRow
                  label="Sign out"
                  danger
                  onPress={() => {
                    close();
                    void signOut().then(() => router.replace('/'));
                  }}
                />
              ) : null}
            </>
          ) : null}
          </ScrollView>

          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.float,
              {
                left: 12,
                right: 12,
                bottom: trayBottom,
                transform: [{ translateY: trayY }],
              },
            ]}
          >
            <View
              style={[
                styles.tray,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.line,
                  ...(scheme === 'light' ? shadows.light : null),
                },
              ]}
            >
              <View style={[styles.search, { backgroundColor: colors.wash, borderColor: colors.line }]}>
                <Icon name="search" color={colors.ink} size={22} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={runSearch}
                  placeholder="Search"
                  placeholderTextColor={colors.mute}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  accessibilityLabel="Search"
                  style={[styles.searchField, { color: colors.ink }]}
                />
              </View>
              <HoverTip label="Settings">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  onPress={openSettings}
                  style={({ pressed }) => [styles.gear, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="settings" color={colors.ink} size={22} />
                  </View>
                </Pressable>
              </HoverTip>
            </View>
          </Animated.View>
        </Animated.View>
        <ConfirmSheet
          visible={Boolean(pendingClass)}
          title={`Delete ${pendingClass?.name ?? 'class'}?`}
          body="This deletes the class, its homework, practice, and grade book. Students who are only in this class will be deleted. Students who are also in another class will stay on those rosters. This cannot be undone."
          confirmLabel={`Delete ${pendingClass?.name ?? 'class'}`}
          typeName={pendingClass?.name}
          busy={busy}
          onCancel={() => setPendingClass(null)}
          onConfirm={() => {
            if (!pendingClass) return;
            setBusy(true);
            void deleteClass(pendingClass.id)
              .then(async () => {
                setPendingClass(null);
                close();
                chromeState.refreshChrome();
                router.replace('/?switch=1' as never);
              })
              .finally(() => setBusy(false));
          }}
        />
      </View>
    </Modal>
    <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function WhoRow({
  name,
  photoUrl,
  username,
  profileId,
  fallback,
  fadeColor,
  ink,
  onPress,
}: {
  name: string;
  photoUrl?: string | null;
  username?: string | null;
  profileId?: string | null;
  fallback?: string;
  fadeColor: string;
  ink: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.who}>
      {username ? (
        <HandleLink username={username} profileId={profileId} style={styles.whoName} />
      ) : (
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.whoNameWrap}>
          <MarqueeText text={fallback || name} align="end" fadeColor={fadeColor} style={[styles.whoName, { color: ink }]} />
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open profile, ${username ? formatHandle(username) : name}`}
        onPress={onPress}
      >
        <Avatar name={name} photoUrl={photoUrl} size={36} />
      </Pressable>
    </View>
  );
}

function Hairline() {
  const { colors } = useTheme();
  return <View style={[styles.rule, { backgroundColor: colors.line }]} />;
}

function DrawerRow({
  label,
  onPress,
  danger,
  check,
  tooltip,
  leading,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  check?: boolean;
  tooltip?: string;
  leading?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <HoverTip label={tipIfNew(label, tooltip)} fill>
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
    >
      <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
      {leading}
      {check ? <Icon name="check" color={colors.brand} size={18} /> : null}
    </Pressable>
    </HoverTip>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingHorizontal: 8,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  scroller: {
    flex: 1,
  },
  float: {
    position: 'absolute',
    zIndex: 16,
  },
  tray: {
    minHeight: 56,
    borderRadius: chrome.trayRadius,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  search: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchField: {
    ...type.body,
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
  },
  gear: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    ...type.meta,
    paddingHorizontal: 16,
    marginBottom: 12,
    textAlign: 'right',
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  whoNameWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
  whoName: {
    ...type.meta,
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
  },
  rule: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  rowLabel: {
    ...type.body,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
