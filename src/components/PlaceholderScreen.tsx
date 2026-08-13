import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  body: string;
};

export function PlaceholderScreen({ title, body }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
  },
});
