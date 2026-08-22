import { usePathname, useRouter } from 'expo-router';
import { Animated, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { HoverTip } from '@/components/ui/HoverTip';
import { chrome, radius, type } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type ChipSpec = { key: string; label: string; hint?: string; onPress: () => void; selected: boolean };

export function ContextMenuRow() {
  const { colors } = useTheme();
  const chromeState = useChrome();
  const pathname = usePathname();
  const router = useRouter();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;
  const height = landscape ? chrome.contextHeightLandscape : chrome.contextHeight;

  if (chromeState.role === 'none' || chromeState.contextReserve === 0) return null;

  const chips = chipsFor({
    pathname,
    role: chromeState.role,
    contextTab: chromeState.contextTab,
    setContextTab: chromeState.setContextTab,
    classId: chromeState.classId,
    parentTokens: chromeState.parentTokens,
    router,
  });

  if (!chips.length) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          height,
          backgroundColor: colors.elevated,
          borderBottomColor: colors.line,
          transform: [{ translateY: chromeState.contextTranslate }],
          opacity: chromeState.contextOpacity,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: layout.pad }]}
      >
        {chips.map((chip) => (
          <HoverTip key={chip.key} label={chip.hint}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: chip.selected }}
            onPress={chip.onPress}
            style={[styles.chip, chip.selected && { backgroundColor: colors.brandSoft }]}
          >
            <Text style={[styles.label, { color: chip.selected ? colors.brand : colors.ink }]} numberOfLines={1}>
              {chip.label}
            </Text>
          </Pressable>
          </HoverTip>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function chipsFor(input: {
  pathname: string;
  role: string;
  contextTab: string;
  setContextTab: (tab: string, path?: string) => void;
  classId: string | null;
  parentTokens: { token: string; displayName: string }[];
  router: ReturnType<typeof useRouter>;
}): ChipSpec[] {
  const { pathname, contextTab, setContextTab, parentTokens, router } = input;

  if (pathname === '/capture') {
    const current = contextTab || 'photo';
    return [
      { key: 'photo', label: 'Photo', hint: 'Photograph a page', selected: current === 'photo', onPress: () => setContextTab('photo') },
      { key: 'voice', label: 'Voice', hint: 'Record a voice note', selected: current === 'voice', onPress: () => setContextTab('voice') },
      { key: 'pages', label: 'Pages', hint: 'Multi-page capture', selected: current === 'pages', onPress: () => setContextTab('pages') },
    ];
  }

  if (pathname === '/inbox') {
    const current = contextTab || 'all';
    return [
      { key: 'name', label: 'Needs a name', hint: 'Unassigned work', selected: current === 'name', onPress: () => setContextTab('name') },
      { key: 'review', label: 'Review', hint: 'Drafts waiting for Approve', selected: current === 'review', onPress: () => setContextTab('review') },
      { key: 'all', label: 'All', hint: 'Everything in Inbox', selected: current === 'all', onPress: () => setContextTab('all') },
    ];
  }

  if (pathname === '/todo') {
    const current = contextTab || 'todo';
    return [
      { key: 'todo', label: 'To-do', selected: current === 'todo', onPress: () => setContextTab('todo') },
      { key: 'done', label: 'Done', selected: current === 'done', onPress: () => setContextTab('done') },
    ];
  }

  if (pathname === '/parent' && parentTokens.length > 1) {
    return parentTokens.map((child, index) => ({
      key: child.token,
      label: child.displayName.split(/\s+/)[0] ?? child.displayName,
      selected: contextTab ? contextTab === child.token : index === 0,
      onPress: () => {
        setContextTab(child.token);
        router.replace(`/parent?t=${child.token}`);
      },
    }));
  }

  return [];
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 12,
    borderBottomWidth: 1,
  },
  row: {
    alignItems: 'center',
    gap: 8,
    height: '100%',
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...type.pill,
    fontSize: 14,
  },
});
