import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function StudentScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();

  return (
    <PlaceholderScreen
      title="Student"
      body={`Placeholder student ${studentId}. Timeline, drafted gaps, Approve, and parent invite will live here.`}
    />
  );
}
