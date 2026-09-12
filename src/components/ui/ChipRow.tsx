import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

type Props = {
  children: ReactNode;
  /** Tighter vertical rhythm under filters / form chip shelves (not destination tab rows). */
  compact?: boolean;
};

/** Amazon / Instagram shelf for chips. Never wrap into a button wall. */
export function ChipRow({ children, compact }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={compact ? styles.compactScroll : undefined}
      contentContainerStyle={[styles.row, compact && styles.compactRow]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  compactScroll: {
    flexGrow: 0,
  },
  row: {
    gap: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
  compactRow: {
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
});
