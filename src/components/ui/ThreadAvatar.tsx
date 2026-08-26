import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, photoUri } from '@/components/ui/Avatar';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AvatarInitials } from '@/components/ui/AvatarInitials';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type ThreadFace = {
  name: string;
  photoUrl?: string | null;
};

type Props = {
  name: string;
  faces: ThreadFace[];
  photoUrl?: string | null;
  size?: number;
  /** Brand ember on the lower-right of the face. New message waiting. */
  unread?: boolean;
};

/** One face, a custom photo, or an iMessage-style montage of members. */
export function ThreadAvatar({ name, faces, photoUrl, size = 52, unread }: Props) {
  const { colors } = useTheme();
  const custom = photoUri(photoUrl);
  const shown = faces.filter((face) => face.name).slice(0, 4);
  const face =
    custom ? (
      <Avatar name={name} photoUrl={custom} size={size} />
    ) : shown.length <= 1 ? (
      <Avatar name={shown[0]?.name ?? name} photoUrl={shown[0]?.photoUrl} size={size} />
    ) : null;
  if (face) return <UnreadWell size={size} unread={unread}>{face}</UnreadWell>;

  const gap = 1;
  const half = (size - gap) / 2;
  const tiles =
    shown.length === 2
      ? [
          { face: shown[0]!, left: 0, top: 0, width: half, height: size },
          { face: shown[1]!, left: half + gap, top: 0, width: half, height: size },
        ]
      : shown.length === 3
        ? [
            { face: shown[0]!, left: 0, top: 0, width: half, height: size },
            { face: shown[1]!, left: half + gap, top: 0, width: half, height: half },
            { face: shown[2]!, left: half + gap, top: half + gap, width: half, height: half },
          ]
        : [
            { face: shown[0]!, left: 0, top: 0, width: half, height: half },
            { face: shown[1]!, left: half + gap, top: 0, width: half, height: half },
            { face: shown[2]!, left: 0, top: half + gap, width: half, height: half },
            { face: shown[3]!, left: half + gap, top: half + gap, width: half, height: half },
          ];

  return (
    <UnreadWell size={size} unread={unread}>
    <View
      pointerEvents="none"
      style={[
        styles.well,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.wash,
          borderColor: colors.line,
        },
      ]}
    >
      {tiles.map((tile, index) => {
        const uri = photoUri(tile.face.photoUrl);
        return (
        <View
          key={`${tile.face.name}-${index}`}
          style={{
            position: 'absolute',
            left: tile.left,
            top: tile.top,
            width: tile.width,
            height: tile.height,
            overflow: 'hidden',
            backgroundColor: colors.wash,
          }}
        >
          {uri ? (
            <RemoteImage
              uri={uri}
              contentFit="cover"
              style={{ width: tile.width, height: tile.height }}
            />
          ) : (
            <View style={{ width: tile.width, height: tile.height, alignItems: 'center', justifyContent: 'center' }}>
              <AvatarInitials name={tile.face.name} size={Math.min(tile.width, tile.height) * 0.9} />
            </View>
          )}
        </View>
        );
      })}
    </View>
    </UnreadWell>
  );
}

function UnreadWell({
  size,
  unread,
  children,
}: {
  size: number;
  unread?: boolean;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const pip = size >= 60 ? 14 : 12;
  return (
    <View style={{ width: size, height: size }}>
      {children}
      {unread ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[
            styles.pip,
            {
              width: pip,
              height: pip,
              borderRadius: pip / 2,
              backgroundColor: colors.brand,
              borderColor: colors.elevated,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    borderWidth: 1,
    flexShrink: 0,
    overflow: 'hidden',
  },
  pip: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    borderWidth: 2,
  },
});
