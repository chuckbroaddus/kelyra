import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
      <Screen centered>
        <Text style={[type.title, { textAlign: 'center', color: colors.ink }]}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.mute }]}>Go home</Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: type.button,
});
