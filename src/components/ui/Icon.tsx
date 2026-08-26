import { Image, View } from 'react-native';

import { ICON_ASSETS } from '@/components/ui/iconAssets';
import { KelyraMark } from '@/components/ui/KelyraMark';
import type { FeedIconName } from '@/lib/feeds/icons';

export type IconName =
  | 'setup'
  | 'today'
  | 'capture'
  | 'records'
  | 'classes'
  | 'family'
  | 'menu'
  | 'filter'
  | 'close'
  | 'inbox'
  | 'zoomIn'
  | 'zoomOut'
  | 'search'
  | 'bell'
  | 'ask'
  | 'person'
  | 'parents'
  | 'children'
  | 'back'
  | 'send'
  | 'check'
  | 'mail'
  | 'chat'
  | 'settings'
  | 'share'
  | 'save'
  | 'compose'
  | 'plus'
  | 'mic'
  | 'focus'
  | 'login'
  | 'history'
  | 'work'
  | 'practice'
  | 'details'
  | 'manage'
  | 'photo'
  | 'file'
  | 'link'
  | 'post'
  | 'alert'
  | 'speaker'
  | 'mute'
  | 'grades'
  | 'statusAssigned'
  | 'statusStarted'
  | 'statusCompleted'
  | 'statusGraded'
  | 'termAll'
  | 'termQ1'
  | 'termQ2'
  | 'termQ3'
  | 'termQ4'
  | 'termS1'
  | 'termS2'
  | 'termYear'
  | FeedIconName;

type Props = {
  name: IconName;
  color: string;
  size?: number;
};

export function Icon({ name, color, size = 22 }: Props) {
  if (name === 'ask') return <KelyraMark size={size} />;
  const source = ICON_ASSETS[name];
  if (!source) return <View style={{ width: size, height: size }} />;
  return (
    <Image
      source={source}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}
