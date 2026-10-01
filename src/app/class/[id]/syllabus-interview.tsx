/**
 * Class syllabus conversational interview route (GB-12).
 * Seeds the interview with the class's current draft + school locks so known
 * settings are skipped, then hands answers to the syllabus form (same draft the
 * document path fills).
 */
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { InterviewScreen } from '@/components/interview/InterviewScreen';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { draftFromBundle, type SyllabusWizardDraft } from '@/components/syllabus/wizardModel';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getClass } from '@/lib/classes/api';
import { putInterviewHandoff, type InterviewSession } from '@/lib/interview';
import { loadLatestPublished, type SyllabusLockReasons, type SyllabusLocks } from '@/lib/school/gradingPolicy';
import { getClassSyllabus } from '@/lib/syllabus/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function SyllabusInterviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  usePushedTitle('Answer a few questions');
  const [seed, setSeed] = useState<{ draft: SyllabusWizardDraft; className: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    void (async () => {
      try {
        const [klass, bundle] = await Promise.all([getClass(id), getClassSyllabus(id)]);
        let schoolPolicy: { locks?: Partial<SyllabusLocks> | null; lock_reasons?: Partial<SyllabusLockReasons> | null; rollup_preset?: string | null } | null = null;
        if (profile?.school_id) {
          try {
            const pub = await loadLatestPublished(profile.school_id);
            const payload = (pub?.payload ?? null) as { locks?: SyllabusLocks; lock_reasons?: SyllabusLockReasons; rollup_preset?: string | null } | null;
            if (payload) {
              schoolPolicy = { locks: payload.locks ?? null, lock_reasons: payload.lock_reasons ?? null, rollup_preset: payload.rollup_preset ?? null };
            }
          } catch {
            // optional school defaults
          }
        }
        const draft = draftFromBundle({ classId: id, syllabus: bundle.syllabus, categories: bundle.categories, schoolPolicy });
        if (alive) setSeed({ draft, className: klass?.name ?? '' });
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load this class');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, profile?.school_id]);

  const onOpenForm = useCallback(
    (_draft: Record<string, unknown>, session: InterviewSession) => {
      if (!id) return;
      putInterviewHandoff('syllabus', id, session);
      router.replace(`/class/${id}/syllabus?from=interview` as never);
    },
    [id, router],
  );

  if (!seed) {
    return (
      <Screen maxWidth={720}>
        {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : <WorkingLine />}
      </Screen>
    );
  }

  return (
    <Screen maxWidth={720} keyboard>
      <InterviewScreen
        wizard="syllabus"
        classId={id ?? null}
        schoolId={profile?.school_id ?? null}
        ownerId={profile?.id ?? null}
        existingDraft={seed.draft as unknown as Record<string, unknown>}
        className={seed.draft.title || seed.className}
        onOpenForm={onOpenForm}
        onClose={() => router.back()}
      />
    </Screen>
  );
}
