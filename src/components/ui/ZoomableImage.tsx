import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Platform, ScrollView, StyleSheet, View } from 'react-native';

type Props = {
  uri: string;
  width: number;
  height: number;
  zoom?: number;
};

export function ZoomableImage({ uri, width, height, zoom = 1 }: Props) {
  if (Platform.OS === 'ios') {
    return <IosZoom uri={uri} width={width} height={height} zoom={zoom} />;
  }
  return <PinchZoom uri={uri} width={width} height={height} zoom={zoom} />;
}

function IosZoom({ uri, width, height, zoom = 1 }: Props) {
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    ref.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [zoom, uri]);
  return (
    <ScrollView
      ref={ref}
      style={{ width, height }}
      contentContainerStyle={styles.center}
      maximumZoomScale={4}
      minimumZoomScale={1}
      zoomScale={zoom}
      centerContent
      bouncesZoom
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
    </ScrollView>
  );
}

function PinchZoom({ uri, width, height, zoom = 1 }: Props) {
  const [scale, setScale] = useState(zoom);
  const startDistance = useRef(0);
  const startScale = useRef(1);

  useEffect(() => {
    setScale(zoom);
  }, [zoom, uri]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => event.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponder: (event) => event.nativeEvent.touches.length >= 2,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          if (touches.length < 2) return;
          const first = touches[0];
          const second = touches[1];
          if (!first || !second) return;
          startDistance.current = distance(first, second);
          startScale.current = scale;
        },
        onPanResponderMove: (event) => {
          const touches = event.nativeEvent.touches;
          const first = touches[0];
          const second = touches[1];
          if (!first || !second || !startDistance.current) return;
          const next = startScale.current * (distance(first, second) / startDistance.current);
          setScale(Math.min(4, Math.max(1, next)));
        },
        onPanResponderRelease: () => {
          startDistance.current = 0;
        },
      }),
    [scale],
  );

  return (
    <View style={{ width, height, overflow: 'hidden' }} {...responder.panHandlers}>
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={{
          width,
          height,
          transform: [{ scale }],
        }}
      />
    </View>
  );
}

function distance(
  a: { pageX: number; pageY: number },
  b: { pageX: number; pageY: number },
): number {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
