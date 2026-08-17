import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppearanceControl } from '@/components/ui/AppearanceControl';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { deleteClass } from '@/lib/classes/delete';
import { listClasses } from '@/lib/classes/api';
import { chrome, type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { setActiveClass } from '@/lib/classes/api';
import { clearStudentSession } from '@/lib/student-session/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export function HamburgerDrawer() {
  const { colors, scheme } = useTheme();
  const { session, teacher, signOut } = useAuth();
  const chromeState = useChrome();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerW = Math.min(chrome.drawerWidth, width - 56);
  const x = useRef(new Animated.Value(-drawerW)).current;
  const [pendingClass, setPendingClass] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Animated.timing(x, {
      toValue: chromeState.drawerOpen ? 0 : -drawerW,
      duration: chromeState.drawerOpen ? 220 : 180,
      easing: chromeState.drawerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [chromeState.drawerOpen, drawerW, x]);

  const close = () => chromeState.setDrawerOpen(false);

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 80) close();
      },
    }),
  ).current;

  const go = (href: string, replace = false) => {
    close();
    if (replace) router.replace(href as never);
    else router.push(href as never);
  };

  return (
    <Modal
      visible={chromeState.drawerOpen}
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
              backgroundColor: colors.elevated,
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateX: x }],
            },
          ]}
        >
          {chromeState.role === 'teacher' ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open profile, ${session?.user.email ?? teacher?.email ?? 'Teacher'}`}
                onPress={() => go('/profile')}
                style={styles.who}
              >
                {({ pressed }) => (
                  <>
                    <Avatar
                      name={teacher?.display_name || session?.user.email || 'Teacher'}
                      photoUrl={chromeState.teacherPhotoUrl}
                      size={36}
                    />
                    <MarqueeText
                      text={session?.user.email ?? teacher?.email ?? 'Teacher'}
                      align="start"
                      paused={pressed}
                      fadeColor={colors.elevated}
                      style={[styles.whoName, { color: colors.ink }]}
                    />
                  </>
                )}
              </Pressable>
              {chromeState.classes.map((klass) => (
                <ListRow
                  key={klass.id}
                  title={klass.name}
                  avatarName={klass.name}
                  chevron={false}
                  selected={klass.id === chromeState.classId}
                  onPress={() => {
                    if (teacher) void setActiveClass(teacher.id, klass.id);
                    chromeState.refreshChrome();
                    go(`/class/${klass.id}`, true);
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
              <DrawerRow
                label="Another class"
                onPress={() => go('/?switch=1')}
              />
              <Hairline />
              {chromeState.classId ? (
                <>
                  <DrawerRow
                    label="Grade book"
                    onPress={() => {
                      chromeState.setContextTab('book', `/class/${chromeState.classId}/gradebook`);
                      go(`/class/${chromeState.classId}/gradebook`);
                    }}
                  />
                  <DrawerRow
                    label="Parents"
                    onPress={() => go(`/class/${chromeState.classId}/parents`)}
                  />
                  <DrawerRow
                    label="Family update"
                    onPress={() => go(`/class/${chromeState.classId}/family`)}
                  />
                </>
              ) : null}
              <Hairline />
              <Text style={[styles.section, { color: colors.mute }]}>Appearance</Text>
              <View style={styles.pad}>
                <AppearanceControl />
              </View>
              <DrawerRow
                label="Sign out"
                danger
                onPress={() => {
                  close();
                  void signOut().then(() => router.replace('/'));
                }}
              />
            </>
          ) : null}

          {chromeState.role === 'student' ? (
            <>
              <Text style={[styles.meta, { color: colors.mute }]} numberOfLines={2}>
                {chromeState.studentSession
                  ? `${chromeState.studentSession.displayName}\n${chromeState.studentSession.className}`
                  : 'Student'}
              </Text>
              <DrawerRow
                label="Leave class"
                onPress={() => {
                  close();
                  void clearStudentSession().then(() => router.replace('/join'));
                }}
              />
              <Hairline />
              <Text style={[styles.section, { color: colors.mute }]}>Appearance</Text>
              <View style={styles.pad}>
                <AppearanceControl />
              </View>
            </>
          ) : null}

          {chromeState.role === 'parent' ? (
            <>
              <Text style={[styles.meta, { color: colors.mute }]} numberOfLines={3}>
                Parent
                {chromeState.parentTokens.length
                  ? `\n${chromeState.parentTokens.map((child) => child.displayName).join(', ')}`
                  : ''}
              </Text>
              {chromeState.parentTokens.length > 1
                ? chromeState.parentTokens.map((child) => (
                    <DrawerRow
                      key={child.token}
                      label={child.displayName}
                      onPress={() => go(`/parent?t=${child.token}`, true)}
                    />
                  ))
                : null}
              <Hairline />
              <Text style={[styles.section, { color: colors.mute }]}>Appearance</Text>
              <View style={styles.pad}>
                <AppearanceControl />
              </View>
            </>
          ) : null}
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
                const remaining = await listClasses();
                if (remaining[0]) router.replace(`/class/${remaining[0].id}` as never);
                else router.replace('/');
              })
              .finally(() => setBusy(false));
          }}
        />
      </View>
    </Modal>
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
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  check?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
    >
      <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
      {check ? <Icon name="check" color={colors.brand} size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheet: {
    height: '100%',
    paddingHorizontal: 8,
  },
  meta: {
    ...type.meta,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  whoName: {
    ...type.meta,
    flex: 1,
    minWidth: 0,
  },
  section: {
    ...type.section,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  pad: {
    paddingHorizontal: 12,
    marginBottom: 12,
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
    gap: 8,
  },
  rowLabel: {
    ...type.body,
    fontWeight: '600',
    flex: 1,
  },
});
