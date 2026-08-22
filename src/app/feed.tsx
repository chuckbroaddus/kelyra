import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { FeedPane } from '@/components/ui/FeedPane';
import { Screen } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { useTheme } from '@/lib/theme/ThemeProvider';

/** Standalone feed for students and old links. Staff use School / Class tabs. */
export default function FeedScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { classId: classParam } = useLocalSearchParams<{ classId?: string }>();
  const classId = typeof classParam === 'string' && classParam ? classParam : null;
  usePushedTitle(classId ? 'Class updates' : 'Feed');

  return (
    <Screen keyboard maxWidth={640}>
      <Text style={[type.display, { color: colors.ink }]}>
        {classId ? 'Class updates' : profile?.role === 'student' ? 'Your classes' : 'School feed'}
      </Text>
      <FeedPane classId={classId} scope={classId ? 'class' : 'all'} />
    </Screen>
  );
}
