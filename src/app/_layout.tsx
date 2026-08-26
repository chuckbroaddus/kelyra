import { DarkTheme, DefaultTheme, ThemeProvider as NavigationTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppShell } from '@/components/ui/AppShell';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { LESSON_PLAYER_STACK_OPTIONS } from '@/lib/lessons/chrome';
import { ThemeProvider, useTheme } from '@/lib/theme/ThemeProvider';

export { ErrorBoundary } from 'expo-router';

function ThemedRoot() {
  const { colors, scheme } = useTheme();
  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.brand,
      background: colors.bg,
      card: colors.elevated,
      text: colors.ink,
      border: colors.line,
      notification: colors.danger,
    },
  };

  return (
    <NavigationTheme value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppShell>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'none',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="capture" />
          <Stack.Screen name="inbox" />
          <Stack.Screen name="join" />
          <Stack.Screen name="todo" />
          <Stack.Screen name="parent" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="ask" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="search" />
          <Stack.Screen name="proposal" />
          <Stack.Screen name="password" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="feed" />
          <Stack.Screen name="activity" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="class/[id]" />
          <Stack.Screen name="lesson/[assignmentId]" options={LESSON_PLAYER_STACK_OPTIONS} />
          <Stack.Screen name="assignment/new" />
        </Stack>
      </AppShell>
    </NavigationTheme>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedRoot />
      </AuthProvider>
    </ThemeProvider>
  );
}
