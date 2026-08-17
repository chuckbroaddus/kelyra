import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  uri: string;
  width: number;
  height: number;
  zoom?: number;
};

export function ZoomableImage({ uri, width, height, zoom = 1 }: Props) {
  const [scale, setScale] = useState(zoom);

  useEffect(() => {
    setScale(zoom);
  }, [zoom, uri]);

  return (
    <View
      style={[styles.frame, { width, height }]}
      // @ts-expect-error web-only wheel handler
      onWheel={(event: { preventDefault?: () => void; deltaY: number }) => {
        event.preventDefault?.();
        setScale((current: number) => {
          const next = current * (event.deltaY > 0 ? 0.92 : 1.08);
          return Math.min(4, Math.max(1, next));
        });
      }}
    >
      <img
        src={uri}
        alt=""
        draggable={false}
        style={{
          width,
          height,
          objectFit: 'contain',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          touchAction: 'pinch-zoom',
          userSelect: 'none',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
