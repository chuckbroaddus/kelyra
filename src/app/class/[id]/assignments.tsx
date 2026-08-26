import { useLocalSearchParams } from 'expo-router';

import { AssignmentWorkList } from '@/components/ui/AssignmentWorkList';
import { ClassTabs } from '@/components/ui/ClassTabs';
import { PhaseBanner } from '@/components/ui/PhaseBanner';
import { Screen } from '@/components/ui/Screen';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';

export default function AssignmentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { className } = useChrome();
  usePushedTitle(className ?? 'Class');

  return (
    <Screen maxWidth={720}>
      {id ? <ClassTabs classId={id} /> : null}
      {id ? <AssignmentWorkList classId={id} /> : null}
      <PhaseBanner
        phase={3}
        compact
        detail="Swipe a row to delete. Tap to edit. The grade book already has the column."
      />
    </Screen>
  );
}
