import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

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
    ...theme.screen,
    justifyContent: 'center',
  },
  title: {
    ...theme.title,
    fontSize: 22,
    fontWeight: '600',
  },
  body: theme.body,
});
