/**
 * School grading-policy conversational interview route (GB-12).
 */
import { useRouter } from 'expo-router';

import { InterviewScreen } from '@/components/interview/InterviewScreen';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { putInterviewHandoff, type InterviewSession } from '@/lib/interview';

export default function SchoolGradingPolicyInterviewScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  usePushedTitle('Answer a few questions');
  const schoolId = profile?.school_id ?? '';

  const onOpenForm = (_draft: Record<string, unknown>, session: InterviewSession) => {
    // Hand the SetupDraft to the policy form; it merges via the same path as document ingest.
    putInterviewHandoff('school', schoolId, session);
    router.replace('/school/grading-policy?from=interview' as never);
  };

  return (
    <Screen maxWidth={720} keyboard>
      <InterviewScreen
        wizard="school"
        schoolId={schoolId}
        ownerId={profile?.id ?? null}
        onOpenForm={onOpenForm}
        onClose={() => router.back()}
      />
    </Screen>
  );
}
