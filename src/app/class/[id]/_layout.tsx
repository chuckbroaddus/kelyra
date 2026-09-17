import { Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ClassTabs } from '@/components/ui/ClassTabs';
import { CollapsingPageChrome } from '@/components/ui/CollapsingPageChrome';
import { isClassDeskTabsRoute } from '@/lib/chrome/classTabs';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

/**
 * Host ClassTabs here so PersonTabs stays mounted across desk pane replaces
 * (CT-A / AC-CT-05). §9.6 leave/return still uses CollapsingPageChrome + chrome.visible.
 * Gradebook shelf + syllabus warning stay in Screen.collapse on that pane.
 */
export default function ClassStackLayout() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();
  const layout = useLayout();
  const chrome = useOptionalChrome();
  const topReserve = chrome?.contextReserve ?? 0;
  const classId = Array.isArray(id) ? id[0] : id;
  const showTabs = Boolean(classId) && isClassDeskTabsRoute(pathname);
  const stacked = pathname.includes('/gradebook');

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {showTabs && classId ? (
        <View
          style={[
            styles.tabs,
            {
              paddingHorizontal: layout.pad,
              paddingTop: layout.pad + topReserve,
              maxWidth: pathname.includes('/gradebook') ? 1100 : 720,
            },
          ]}
        >
          <CollapsingPageChrome>
            <ClassTabs classId={classId} stacked={stacked} />
          </CollapsingPageChrome>
        </View>
      ) : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="feed" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="syllabus" />
        <Stack.Screen name="gradebook" />
        <Stack.Screen name="assignments" />
        <Stack.Screen name="assignment/[assignmentId]" />
        <Stack.Screen name="lesson-result/[submissionId]" />
        <Stack.Screen name="review/[submissionId]" />
        <Stack.Screen name="family" />
        <Stack.Screen name="parents" />
        <Stack.Screen name="parent/[parentId]" />
        <Stack.Screen name="assign" />
        <Stack.Screen name="student/[studentId]" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: {
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
  },
});
