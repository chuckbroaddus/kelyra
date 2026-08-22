import { View } from 'react-native';

import { ICON_ASSETS } from '@/components/ui/iconAssets';
import { KelyraMark } from '@/components/ui/KelyraMark';

type Props = {
  name: string;
  color: string;
  size?: number;
};

function uriOf(source: unknown): string | undefined {
  if (!source) return undefined;
  if (typeof source === 'string') return source;
  if (typeof source === 'number') return String(source);
  if (typeof source === 'object') {
    const rec = source as { uri?: string; default?: unknown };
    if (typeof rec.uri === 'string') return rec.uri;
    if (rec.default) return uriOf(rec.default);
  }
  return undefined;
}

/** Web: mask the square PNG so tint matches native `tintColor`. */
export function Icon({ name, color, size = 22 }: Props) {
  if (name === 'ask') return <KelyraMark size={size} />;
  const uri = uriOf(ICON_ASSETS[name]);
  return (
    <View style={{ width: size, height: size }}>
      <div
        aria-hidden
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          WebkitMaskImage: uri ? `url("${uri}")` : undefined,
          maskImage: uri ? `url("${uri}")` : undefined,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
    </View>
  );
}
