import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ClassHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Class</Text>
      <Text style={styles.body}>Placeholder class id: {id}</Text>
      <Link href={`/class/${id}/gradebook`} style={styles.link}>
        <Text style={styles.linkText}>Grade book</Text>
      </Link>
      <Link href={`/class/${id}/assign`} style={styles.link}>
        <Text style={styles.linkText}>Assign practice</Text>
      </Link>
      <Link href={`/class/${id}/student/demo`} style={styles.link}>
        <Text style={styles.linkText}>Student page</Text>
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
    fontSize: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
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
