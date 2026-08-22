import { useLocalSearchParams } from 'expo-router';

import { ClassTabs } from '@/components/ui/ClassTabs';
import { FeedPane } from '@/components/ui/FeedPane';
import { Screen } from '@/components/ui/Screen';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';

export default function ClassFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { className } = useChrome();
  usePushedTitle(className ?? 'Class');

  return (
    <Screen keyboard maxWidth={640} scroll={false} avoidKeyboard={false}>
      {id ? <ClassTabs classId={id} /> : null}
      {id ? <FeedPane classId={id} scope="class" fill /> : null}
    </Screen>
  );
}
