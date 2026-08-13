import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function ClassStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Class' }} />
      <Stack.Screen name="gradebook" options={{ title: 'Grade book' }} />
      <Stack.Screen name="assign" options={{ title: 'Assign practice' }} />
      <Stack.Screen name="student/[studentId]" options={{ title: 'Student' }} />
    </Stack>
  );
}
