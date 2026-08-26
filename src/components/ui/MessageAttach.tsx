import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { type } from '@/constants/theme';
import { linkHost, signedMessageUrl, unfurlLink, type DraftAttach } from '@/lib/messages/attachments';
import type { MessageFile, MessageLink, MessagePayload, MessagePhoto, MessageWorkCard } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

function isWork(payload: MessagePayload): payload is MessageWorkCard {
  return payload.type === 'work_card';
}
function isPhoto(payload: MessagePayload): payload is MessagePhoto {
  return payload.type === 'photo';
}
function isFile(payload: MessagePayload): payload is MessageFile {
  return payload.type === 'file';
}
function isLink(payload: MessagePayload): payload is MessageLink {
  return payload.type === 'link';
}

export function AttachPreview({
  attach,
  onClear,
}: {
  attach: DraftAttach;
  onClear: () => void;
}) {
  const { colors } = useTheme();
  const [url, setUrl] = useState<string | null>(attach.type === 'link' ? attach.image_url ?? null : null);

  useEffect(() => {
    let live = true;
    if (attach.type === 'photo') {
      void signedMessageUrl('photo', attach.storage_path, 'thumb').then((next) => {
        if (live) setUrl(next);
      });
    }
    if (attach.type === 'link') setUrl(attach.image_url ?? null);
    return () => {
      live = false;
    };
  }, [attach]);

  return (
    <View style={[styles.preview, { borderColor: colors.line, backgroundColor: colors.elevated }]}>
      {url ? <RemoteImage uri={url} style={styles.thumb} /> : null}
      <View style={styles.previewText}>
        <Text style={[type.meta, { color: colors.mute }]} numberOfLines={1}>
          {attach.type === 'photo' ? 'Photo' : attach.type === 'file' ? attach.name : attach.title}
        </Text>
        {attach.type === 'link' ? (
          <Text style={[type.meta, { color: colors.mute }]} numberOfLines={1}>
            {linkHost(attach.url)}
          </Text>
        ) : null}
      </View>
      <GhostButton align="left" label="Remove" onPress={onClear} />
    </View>
  );
}

export function MessagePayloadView({
  payload,
  body,
  onOpenWork,
}: {
  payload: MessagePayload;
  body: string;
  onOpenWork: (card: MessageWorkCard) => void;
}) {
  const { colors } = useTheme();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [broke, setBroke] = useState(false);
  const [open, setOpen] = useState(false);
  const [linkImage, setLinkImage] = useState<string | null>(isLink(payload) ? payload.image_url ?? null : null);

  useEffect(() => {
    let live = true;
    setFullUrl(null);
    setFileUrl(null);
    if (isPhoto(payload)) {
      void signedMessageUrl('photo', payload.storage_path, 'thumb').then((next) => {
        if (live) setFileUrl(next);
      });
    } else if (isFile(payload)) {
      void signedMessageUrl(payload.type, payload.storage_path).then((next) => {
        if (live) setFileUrl(next);
      });
    }
    if (isLink(payload) && !payload.image_url) {
      void unfurlLink(payload.url).then((next) => {
        if (live && next.image_url) setLinkImage(next.image_url);
      });
    } else if (isLink(payload)) {
      setLinkImage(payload.image_url ?? null);
    }
    return () => {
      live = false;
    };
  }, [payload]);

  if (isWork(payload)) {
    return (
      <Card>
        <Text style={[type.meta, { color: colors.mute }]}>Shared work</Text>
        <Text style={[type.body, { color: colors.ink }]}>{body}</Text>
        <GhostButton align="left" label="Open" onPress={() => onOpenWork(payload)} />
      </Card>
    );
  }

  if (isPhoto(payload)) {
    const viewerUri = fullUrl || fileUrl;
    return (
      <View style={styles.stack}>
        {fileUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Photo. Open to send or save."
            onPress={() => {
              if (!fullUrl) {
                void signedMessageUrl('photo', payload.storage_path, 'original').then((next) => {
                  setFullUrl(next ?? fileUrl);
                  setOpen(true);
                });
                return;
              }
              setOpen(true);
            }}
          >
            <RemoteImage uri={fileUrl} style={styles.photo} contentFit="cover" />
          </Pressable>
        ) : null}
        {body && body !== 'Photo' ? <Text style={[type.body, { color: colors.ink }]}>{body}</Text> : null}
        <ImageViewer visible={open && Boolean(viewerUri)} uris={viewerUri ? [viewerUri] : []} onClose={() => setOpen(false)} />
      </View>
    );
  }

  if (isFile(payload)) {
    return (
      <View style={styles.stack}>
        <GhostButton
          align="left"
          label={payload.name}
          onPress={() => {
            if (fileUrl) void Linking.openURL(fileUrl);
          }}
        />
        {body && body !== payload.name ? <Text style={[type.body, { color: colors.ink }]}>{body}</Text> : null}
      </View>
    );
  }

  if (isLink(payload)) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={payload.title}
        onPress={() => void Linking.openURL(payload.url)}
        style={styles.stack}
      >
        {linkImage && !broke ? (
          <RemoteImage
            uri={linkImage}
            style={styles.linkArt}
            contentFit="cover"
            onError={() => setBroke(true)}
          />
        ) : null}
        <Text style={[type.body, { color: colors.ink, fontWeight: '600' }]}>{payload.title}</Text>
        {payload.description ? (
          <Text style={[type.meta, { color: colors.mute }]} numberOfLines={3}>
            {payload.description}
          </Text>
        ) : null}
        <Text style={[type.meta, { color: colors.mute }]}>{linkHost(payload.url)}</Text>
      </Pressable>
    );
  }

  return <Text style={[type.body, { color: colors.ink }]}>{body}</Text>;
}

const styles = StyleSheet.create({
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  previewText: {
    flex: 1,
    minWidth: 0,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  stack: {
    gap: 8,
    minWidth: 180,
  },
  photo: {
    width: 220,
    height: 160,
    borderRadius: 8,
  },
  linkArt: {
    width: 220,
    height: 120,
    borderRadius: 8,
  },
});
