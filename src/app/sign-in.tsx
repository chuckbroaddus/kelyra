import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { SplashLanding } from '@/components/ui/SplashLanding';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useTheme } from '@/lib/theme/ThemeProvider';

/** Deep links and join redirect land here — same unified splash auth as `/`. */
export default function SignInScreen() {
  const { colors } = useTheme();
  const { configured, error } = useAuth();

  if (!configured) {
    return (
      <Screen centered maxWidth={400}>
        <Text style={[type.title, { color: colors.ink }]}>Supabase is not configured</Text>
        <Text style={[styles.lead, { color: colors.mute }]}>
          Copy .env.example to .env and add your project URL and anon key.
        </Text>
      </Screen>
    );
  }

  return <SplashLanding error={error} initialRevealForm />;
}

const styles = StyleSheet.create({
  lead: {
    ...type.body,
    marginTop: 8,
  },
});
