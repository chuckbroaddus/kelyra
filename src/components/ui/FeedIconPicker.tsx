import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormSheet } from '@/components/ui/FormSheet';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { radius, type } from '@/constants/theme';
import { FEED_ICON_CATALOG, feedIconLabel, type FeedIconName } from '@/lib/feeds/icons';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  visible: boolean;
  value: FeedIconName;
  title?: string;
  onClose: () => void;
  onPick: (name: FeedIconName) => void;
};

export function FeedIconPicker({ visible, value, title = 'Feed icon', onClose, onPick }: Props) {
  const { colors } = useTheme();
  return (
    <FormSheet visible={visible} title={title} onClose={onClose}>
      <Text style={[type.meta, { color: colors.mute }]}>
        This mark is the tab for this feed in Messages. Pick one that matches the class.
      </Text>
      <View style={styles.grid}>
        {FEED_ICON_CATALOG.map((item) => {
          const selected = item.name === value;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              onPress={() => {
                onPick(item.name);
                onClose();
              }}
              style={({ pressed }) => [
                styles.cell,
                selected && { backgroundColor: colors.brandSoft },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon name={item.name} color={selected ? colors.brand : colors.ink} size={24} />
              <Text
                style={[styles.label, { color: selected ? colors.brand : colors.ink }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </FormSheet>
  );
}

export function FeedIconRow({
  value,
  title = 'Feed icon',
  onPick,
}: {
  value: FeedIconName;
  title?: string;
  onPick: (name: FeedIconName) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ListRow
        title={title}
        status={feedIconLabel(value)}
        icon={value}
        onPress={() => setOpen(true)}
      />
      <FeedIconPicker
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onPick={(name) => void onPick(name)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  cell: {
    width: '30%',
    flexGrow: 1,
    minWidth: 88,
    maxWidth: 140,
    minHeight: 72,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  label: {
    ...type.badge,
    fontWeight: '600',
  },
});
