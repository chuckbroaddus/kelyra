import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...theme.screen,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    ...theme.title,
    fontSize: 20,
    fontWeight: '600',
  },
  link: {
    marginTop: 16,
  },
  linkText: theme.linkText,
});
