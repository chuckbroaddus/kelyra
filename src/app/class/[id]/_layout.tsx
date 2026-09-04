import { Stack } from 'expo-router';

import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ClassStackLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'none',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="feed" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="syllabus" />
      <Stack.Screen name="gradebook" />
      <Stack.Screen name="assignments" />
      <Stack.Screen name="assignment/[assignmentId]" />
      <Stack.Screen name="lesson-result/[submissionId]" />
      <Stack.Screen name="review/[submissionId]" />
      <Stack.Screen name="family" />
      <Stack.Screen name="parents" />
      <Stack.Screen name="parent/[parentId]" />
      <Stack.Screen name="assign" />
      <Stack.Screen name="student/[studentId]" />
    </Stack>
  );
}
