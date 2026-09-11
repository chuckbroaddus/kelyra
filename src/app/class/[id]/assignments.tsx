import { useLocalSearchParams } from 'expo-router';

import { AssignmentWorkList } from '@/components/ui/AssignmentWorkList';
import { ClassTabs } from '@/components/ui/ClassTabs';
import { Screen } from '@/components/ui/Screen';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';

export default function AssignmentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { className } = useChrome();
  usePushedTitle(className ?? 'Class');

  return (
    <Screen maxWidth={720} collapse={id ? <ClassTabs classId={id} /> : null}>
      {id ? <AssignmentWorkList classId={id} /> : null}
    </Screen>
  );
}
