/**
 * Pending multi-page strip before syllabus / school-policy document read.
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { type } from '@/constants/theme';
import { pageCountLabel } from '@/lib/ingest/gradingDocPages';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type IngestPendingPage = {
  key: string;
  uri: string;
  mimeType: string;
};

type Props = {
  pages: IngestPendingPage[];
  busy?: boolean;
  /** Remaining room under the 20-page cap (for Add another). */
  canAddMore?: boolean;
  onRemove: (key: string) => void;
  onAddAnother: () => void;
  onRead: () => void;
  onClear: () => void;
};

export function IngestPendingPagesCard({
  pages,
  busy,
  canAddMore = true,
  onRemove,
  onAddAnother,
  onRead,
  onClear,
}: Props) {
  const { colors } = useTheme();
  if (!pages.length) return null;
  const n = pages.length;

  return (
    <Card>
      <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>
        Ready to read · {pageCountLabel(n)}
      </Text>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        Pages stay in this order. Remove any extra shot, add another page, then read.
      </Text>
      <View style={styles.thumbs}>
        {pages.map((page, index) => (
          <View key={page.key} style={[styles.thumbWrap, { borderColor: colors.line }]}>
            <Image source={{ uri: page.uri }} style={styles.thumb} resizeMode="cover" />
            <Text style={[type.meta, styles.pageNum, { color: colors.ink }]}>{index + 1}</Text>
            <Pressable
              accessibilityLabel={`Remove page ${index + 1}`}
              onPress={() => onRemove(page.key)}
              style={[styles.remove, { backgroundColor: colors.bg }]}
              disabled={busy}
            >
              <Text style={[type.meta, { color: colors.danger }]}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        {canAddMore ? (
          <GhostButton align="left" label="Add another page" onPress={onAddAnother} disabled={busy} />
        ) : (
          <Text style={[type.meta, { color: colors.mute }]}>That’s the 20-page limit.</Text>
        )}
        <PrimaryButton
          label={n === 1 ? 'Read this page' : `Read these ${n} pages`}
          onPress={onRead}
          disabled={busy}
        />
        <GhostButton align="left" label="Clear pages" onPress={onClear} disabled={busy} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  thumbWrap: {
    width: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
    paddingBottom: 4,
  },
  thumb: { width: '100%', height: 96, backgroundColor: '#ddd' },
  pageNum: { textAlign: 'center', marginTop: 2 },
  remove: { alignItems: 'center', paddingVertical: 2 },
  actions: { gap: 8 },
});
