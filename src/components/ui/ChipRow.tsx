import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

type Props = {
  children: ReactNode;
};

/** Amazon / Instagram shelf for chips. Never wrap into a button wall. */
export function ChipRow({ children }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
});
