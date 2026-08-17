import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/lib/theme/ThemeProvider';

export function HeaderBar() {
  const { colors } = useTheme();
  return <View style={[styles.bar, { backgroundColor: colors.elevated, borderBottomColor: colors.line }]} />;
}

export const stackScreenOptions = {
  headerShown: false,
};

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    borderBottomWidth: 1,
  },
});
