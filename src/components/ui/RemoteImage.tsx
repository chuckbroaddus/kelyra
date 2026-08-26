import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

import { cacheKeyForUri } from '@/lib/media/paths';

type Props = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
  recyclingKey?: string;
  priority?: 'low' | 'normal' | 'high';
  accessibilityLabel?: string;
  onError?: () => void;
};

function isRemote(uri: string): boolean {
  return /^https?:/i.test(uri);
}

export function RemoteImage({
  uri,
  style,
  contentFit = 'cover',
  recyclingKey,
  priority = 'low',
  accessibilityLabel,
  onError,
}: Props) {
  const cacheKey = isRemote(uri) ? cacheKeyForUri(uri) : uri.split('?')[0] ?? uri;
  return (
    <Image
      source={{ uri, cacheKey }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey ?? cacheKey}
      priority={priority}
      transition={0}
      allowDownscaling
      accessibilityLabel={accessibilityLabel}
      onError={onError}
    />
  );
}

export const remoteImageFill = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
}).fill;
