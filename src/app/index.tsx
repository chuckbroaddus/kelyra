import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kelyra</Text>
      <Text style={styles.body}>
        Foundation only. Capture, inbox, grade book, and assign are placeholders.
      </Text>
      <Link href="/capture" style={styles.link}>
        <Text style={styles.linkText}>Capture (phone)</Text>
      </Link>
      <Link href="/inbox" style={styles.link}>
        <Text style={styles.linkText}>Inbox</Text>
      </Link>
      <Link href="/class/demo" style={styles.link}>
        <Text style={styles.linkText}>Class (web)</Text>
      </Link>
      <Link href="/join" style={styles.link}>
        <Text style={styles.linkText}>Student join</Text>
      </Link>
      <Link href="/parent" style={styles.link}>
        <Text style={styles.linkText}>Parent progress</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
    marginBottom: 8,
  },
  link: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 17,
    color: '#2e78b7',
  },
});
