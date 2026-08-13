import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/lib/auth/AuthProvider';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Kelyra' }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
        <Stack.Screen name="capture" options={{ title: 'Capture' }} />
        <Stack.Screen name="inbox" options={{ title: 'Inbox' }} />
        <Stack.Screen name="join" options={{ title: 'Join class' }} />
        <Stack.Screen name="parent" options={{ title: 'Progress' }} />
        <Stack.Screen name="class/[id]/index" options={{ title: 'Class' }} />
        <Stack.Screen name="class/[id]/gradebook" options={{ title: 'Grade book' }} />
        <Stack.Screen name="class/[id]/assign" options={{ title: 'Assign practice' }} />
        <Stack.Screen name="class/[id]/student/[studentId]" options={{ title: 'Student' }} />
      </Stack>
    </AuthProvider>
  );
}
