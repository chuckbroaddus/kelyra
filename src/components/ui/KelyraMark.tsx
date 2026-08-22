import { Image, type StyleProp, type ImageStyle } from 'react-native';

import mark from '../../../assets/brand/kelyra.png';

/** Full-color Kelyra mark. Never tint — the gradient is the brand. */
export const kelyraMarkSource = mark;

export function KelyraMark({
  size,
  style,
  accessibilityLabel = 'Kelyra',
}: {
  size: number;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Image
      source={mark}
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
    />
  );
}
