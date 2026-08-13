import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth/AuthProvider';

export { ErrorBoundary } from 'expo-router';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.header,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.header },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Kelyra' }} />
          <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
          <Stack.Screen name="capture" options={{ title: 'Capture' }} />
          <Stack.Screen name="inbox" options={{ title: 'Inbox' }} />
          <Stack.Screen name="join" options={{ title: 'Join class' }} />
          <Stack.Screen name="todo" options={{ title: 'My practice' }} />
          <Stack.Screen name="parent" options={{ title: 'Progress' }} />
          <Stack.Screen name="class/[id]/index" options={{ title: 'Class' }} />
          <Stack.Screen name="class/[id]/gradebook" options={{ title: 'Grade book' }} />
          <Stack.Screen name="class/[id]/assign" options={{ title: 'Assign practice' }} />
          <Stack.Screen name="class/[id]/student/[studentId]" options={{ title: 'Student' }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
