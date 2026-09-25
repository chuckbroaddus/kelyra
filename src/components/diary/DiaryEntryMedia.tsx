import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { MessagePayloadView } from '@/components/ui/MessageAttach';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { radius, type } from '@/constants/theme';
import type { DiaryMediaRow } from '@/lib/diary/types';
import { signedDiaryUrls } from '@/lib/media/signedUrl';
import { linkHost, unfurlLink } from '@/lib/messages/attachments';
import type { MessageLink } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

/** One unfurl per URL per app session (list rows re-render often). */
const unfurlCache = new Map<string, Promise<MessageLink>>();
function unfurlOnce(url: string): Promise<MessageLink> {
  let hit = unfurlCache.get(url);
  if (!hit) {
    hit = unfurlLink(url).catch(() => ({ type: 'link' as const, url, title: linkHost(url) }));
    unfurlCache.set(url, hit);
  }
  return hit;
}

/** JOURNAL-ATTACH: web address → Feed-style link card (same MessagePayloadView the Feed uses). */
export function DiaryLinkCard({ url }: { url: string }) {
  const { colors } = useTheme();
  const [link, setLink] = useState<MessageLink>({ type: 'link', url, title: linkHost(url) });
  useEffect(() => {
    let live = true;
    setLink({ type: 'link', url, title: linkHost(url) });
    void unfurlOnce(url).then((next) => {
      if (live) setLink(next);
    });
    return () => {
      live = false;
    };
  }, [url]);
  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.elevated }]}>
      <MessagePayloadView payload={link} body="" onOpenWork={() => {}} />
    </View>
  );
}

/** File row: glyph + name. Tap opens (signed URL); optional × removes a staged file. */
export function DiaryFileChip({
  name,
  onPress,
  onRemove,
}: {
  name: string;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fileChip, { borderColor: colors.line, backgroundColor: colors.elevated }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${name}`}
        disabled={!onPress}
        onPress={onPress}
        style={styles.fileMain}
      >
        <Icon name="file" size={18} color={colors.mute} />
        <Text numberOfLines={1} style={[type.meta, styles.fileName, { color: colors.ink }]}>
          {name}
        </Text>
      </Pressable>
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${name}`} hitSlop={8} onPress={onRemove}>
          <Icon name="close" size={14} color={colors.mute} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Journal list row attachments, Feed-style: photos as image tiles, files as named rows,
 * then link cards for web addresses in the body. Private `diary` bucket, short-TTL signed URLs.
 */
export function DiaryRowMedia({
  media,
  urls,
  onOpenPhotos,
}: {
  media: DiaryMediaRow[];
  urls: string[];
  onOpenPhotos: (uris: string[], index: number) => void;
}) {
  const { colors } = useTheme();
  const [signed, setSigned] = useState<Map<string, string>>(new Map());
  const pathsKey = media.map((m) => m.storage_path).join('|');

  useEffect(() => {
    let live = true;
    if (!media.length) {
      setSigned(new Map());
      return;
    }
    void signedDiaryUrls(media.map((m) => m.storage_path))
      .then((map) => {
        if (live) setSigned(map);
      })
      .catch(() => {
        if (live) setSigned(new Map());
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey]);

  const photos = media.filter((m) => m.kind === 'photo');
  const files = media.filter((m) => m.kind === 'file');
  const photoUris = photos.map((p) => signed.get(p.storage_path)).filter((u): u is string => Boolean(u));
  if (!photos.length && !files.length && !urls.length) return null;

  return (
    <View style={styles.stack}>
      {photoUris.length === 1 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Journal photo" onPress={() => onOpenPhotos(photoUris, 0)}>
          <RemoteImage uri={photoUris[0]!} style={styles.photo} contentFit="cover" />
        </Pressable>
      ) : photoUris.length > 1 ? (
        <View style={styles.photoGrid}>
          {photoUris.slice(0, 4).map((uri, index) => (
            <Pressable
              key={uri}
              accessibilityRole="button"
              accessibilityLabel={`Journal photo ${index + 1} of ${photoUris.length}`}
              onPress={() => onOpenPhotos(photoUris, index)}
              style={[styles.tileWrap, { backgroundColor: colors.wash }]}
            >
              <RemoteImage uri={uri} style={styles.tile} contentFit="cover" />
              {index === 3 && photoUris.length > 4 ? (
                <View style={styles.more}>
                  <Text style={[type.body, styles.moreText]}>+{photoUris.length - 4}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
      {files.map((file) => {
        const url = signed.get(file.storage_path);
        return (
          <DiaryFileChip
            key={file.id}
            name={file.file_name || 'File'}
            onPress={url ? () => void Linking.openURL(url) : undefined}
          />
        );
      })}
      {urls.map((url) => (
        <DiaryLinkCard key={url} url={url} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8, marginTop: 8 },
  card: { borderWidth: 1, borderRadius: radius.sm, padding: 8, alignSelf: 'flex-start', maxWidth: '100%' },
  photo: { width: 220, height: 160, borderRadius: 8 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: 224 },
  tileWrap: { width: 108, height: 108, borderRadius: 8, overflow: 'hidden' },
  tile: { width: 108, height: 108 },
  more: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { color: '#FFFFFF', fontWeight: '600' },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  fileMain: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  fileName: { flexShrink: 1 },
});
