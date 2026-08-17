import { Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  title: string;
  body: string;
};

export function PlaceholderScreen({ title, body }: Props) {
  const { colors } = useTheme();
  return (
    <Screen centered>
      <Text style={[type.title, { color: colors.ink }]}>{title}</Text>
      <Text style={[type.body, { marginTop: 8, color: colors.mute }]}>{body}</Text>
    </Screen>
  );
}
