/**
 * School grading-policy conversational interview route (GB-12).
 */
import { useRouter } from 'expo-router';

import { InterviewScreen } from '@/components/interview/InterviewScreen';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import type { InterviewSession } from '@/lib/interview';

export default function SchoolGradingPolicyInterviewScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  usePushedTitle('Policy interview');
  const schoolId = profile?.school_id ?? '';

  const onOpenForm = (_draft: Record<string, unknown>, _session: InterviewSession) => {
    // Same SetupDraft object conceptually; wizard loads its own empty then user reviews.
    // Pass via query flag so wizard can prefer interview draft from memory if needed later.
    router.replace('/school/grading-policy?from=interview&step=review' as never);
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
