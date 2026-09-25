import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { MessagePayloadView } from '@/components/ui/MessageAttach';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { radius, type } from '@/constants/theme';
import {
  ROW_CHIP_H,
  ROW_GAP,
  ROW_LINK_H,
  ROW_META_H,
  ROW_PAD_V,
  ROW_PHOTO_H,
  ROW_TEXT_LINE,
  ROW_TITLE_H,
  type RowBlock,
} from '@/lib/diary/rowPlan';
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

/**
 * JOURNAL-LINK: list-row link card — preview image, page title, site — at a fixed
 * ROW_LINK_H so the Day List's row heights stay exact. Tap opens the page.
 */
export function DiaryLinkRowCard({ url }: { url: string }) {
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
  const host = linkHost(url);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open ${link.title || host}`}
      onPress={() => void Linking.openURL(url)}
      style={[styles.linkRowCard, { borderColor: colors.line, backgroundColor: colors.elevated }]}
    >
      <View style={[styles.linkRowThumb, { backgroundColor: colors.wash }]}>
        {link.image_url ? (
          <RemoteImage uri={link.image_url} style={styles.linkRowThumb} contentFit="cover" />
        ) : (
          <Icon name="link" size={20} color={colors.mute} />
        )}
      </View>
      <View style={styles.linkRowText}>
        <Text numberOfLines={2} maxFontSizeMultiplier={1} style={[styles.linkRowTitle, { color: colors.ink }]}>
          {link.title || host}
        </Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1} style={[styles.linkRowHost, { color: colors.mute }]}>
          {host}
        </Text>
      </View>
    </Pressable>
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

/** Short-TTL signed URLs for a row's media, re-signed when the set of paths changes. */
function useSignedMedia(media: DiaryMediaRow[]): Map<string, string> {
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
  return signed;
}

/**
 * JOURNAL-INLINE: a Journal list row laid out from `planDiaryRow` — title, then body
 * text with each `[Photo N]` / `[File: name]` marker swapped for the real thumbnail or
 * file chip in place, then leftover media and link chips, then the meta line. Every
 * block has a fixed height (the Day List needs exact row heights), so text is capped
 * with numberOfLines and font scaling is pinned. Taps on a photo open the viewer; taps
 * anywhere else fall through to the card (open the entry).
 */
export function DiaryRowContent({
  blocks,
  media,
  onOpenPhotos,
}: {
  blocks: RowBlock[];
  media: DiaryMediaRow[];
  onOpenPhotos: (uris: string[], index: number) => void;
}) {
  const { colors } = useTheme();
  const signed = useSignedMedia(media);
  const photos = media.filter((m) => m.kind === 'photo');
  const photoUris = photos.map((p) => signed.get(p.storage_path) ?? '');
  const openPhoto = (index: number) => {
    const uris = photoUris.filter(Boolean);
    const at = uris.indexOf(photoUris[index] ?? '');
    if (at >= 0) onOpenPhotos(uris, at);
  };
  return (
    <View style={styles.rowStack}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'title':
            return (
              <Text key={`t${i}`} numberOfLines={1} maxFontSizeMultiplier={1} style={[styles.rowTitle, { color: colors.ink }]}>
                {block.text}
              </Text>
            );
          case 'text':
            return (
              <Text
                key={`x${i}`}
                numberOfLines={block.lines}
                maxFontSizeMultiplier={1}
                style={[styles.rowBody, { color: colors.ink, height: block.lines * ROW_TEXT_LINE }]}
              >
                {block.text}
              </Text>
            );
          case 'photo': {
            const uri = photoUris[block.index];
            return (
              <Pressable
                key={`p${i}`}
                accessibilityRole="button"
                accessibilityLabel={`Journal photo ${block.index + 1}`}
                onPress={() => openPhoto(block.index)}
                style={[styles.rowPhoto, { backgroundColor: colors.wash }]}
              >
                {uri ? <RemoteImage uri={uri} style={styles.rowPhotoImg} contentFit="cover" /> : null}
              </Pressable>
            );
          }
          case 'grid':
            return (
              <View key={`g${i}`} style={styles.photoGrid}>
                {block.indices.slice(0, 4).map((index, k) => {
                  const uri = photoUris[index];
                  return (
                    <Pressable
                      key={index}
                      accessibilityRole="button"
                      accessibilityLabel={`Journal photo ${index + 1}`}
                      onPress={() => openPhoto(index)}
                      style={[styles.tileWrap, { backgroundColor: colors.wash }]}
                    >
                      {uri ? <RemoteImage uri={uri} style={styles.tile} contentFit="cover" /> : null}
                      {k === 3 && block.indices.length > 4 ? (
                        <View style={styles.more}>
                          <Text style={[type.body, styles.moreText]}>+{block.indices.length - 4}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            );
          case 'file': {
            const row = media.find((m) => m.id === block.mediaId);
            const url = row ? signed.get(row.storage_path) : undefined;
            return (
              <View key={`f${i}`} style={styles.rowChipSlot}>
                <DiaryFileChip name={block.name} onPress={url ? () => void Linking.openURL(url) : undefined} />
              </View>
            );
          }
          case 'link':
            return <DiaryLinkRowCard key={`l${i}`} url={block.url} />;
          case 'meta':
            return (
              <Text key={`m${i}`} numberOfLines={1} maxFontSizeMultiplier={1} style={[styles.rowMeta, { color: colors.mute }]}>
                {block.text}
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rowStack: { flex: 1, minWidth: 0, gap: ROW_GAP, paddingVertical: ROW_PAD_V, alignSelf: 'stretch' },
  rowTitle: { fontSize: 16, lineHeight: ROW_TITLE_H, fontWeight: '600' },
  rowBody: { fontSize: 15, lineHeight: ROW_TEXT_LINE },
  rowMeta: { fontSize: 13, lineHeight: ROW_META_H },
  rowPhoto: { width: '100%', maxWidth: 320, height: ROW_PHOTO_H, borderRadius: 8, overflow: 'hidden' },
  rowPhotoImg: { width: '100%', height: ROW_PHOTO_H },
  rowChipSlot: { height: ROW_CHIP_H, justifyContent: 'center' },
  linkRowCard: {
    height: ROW_LINK_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    maxWidth: 360,
    overflow: 'hidden',
  },
  linkRowThumb: { width: 56, height: 56, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  linkRowText: { flex: 1, minWidth: 0, gap: 2 },
  linkRowTitle: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  linkRowHost: { fontSize: 12, lineHeight: 16 },
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
