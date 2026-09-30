/**
 * Class syllabus conversational interview route (GB-12).
 */
import { useLocalSearchParams, useRouter } from 'expo-router';

import { InterviewScreen } from '@/components/interview/InterviewScreen';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import type { InterviewSession } from '@/lib/interview';

export default function SyllabusInterviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  usePushedTitle('Syllabus interview');

  const onOpenForm = (_draft: Record<string, unknown>, _session: InterviewSession) => {
    if (!id) return;
    router.replace(`/class/${id}/syllabus?from=interview&step=review` as never);
  };

  return (
    <Screen maxWidth={720} keyboard>
      <InterviewScreen
        wizard="syllabus"
        classId={id ?? null}
        schoolId={profile?.school_id ?? null}
        ownerId={profile?.id ?? null}
        onOpenForm={onOpenForm}
        onClose={() => router.back()}
      />
    </Screen>
  );
}
