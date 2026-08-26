import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { AssignmentForm, emptyAssignmentForm, lessonFieldsFromForm, plannedAssignmentInput, type AssignmentFormValue } from '@/components/ui/AssignmentForm';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { createAssignment } from '@/lib/assignments/api';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { assertTaughtClass, assignLesson, listLessonPacks, listTaughtClasses } from '@/lib/lessons/api';
import { useAssignmentHeaderChrome } from '@/lib/lessons/chrome';
import { parsePackKey } from '@/lib/lessons/protocol';
import type { ClassRow, LessonPackRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function GradeAssignScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  useAssignmentHeaderChrome();
  usePushedTitle('Assign');
  const [value, setValue] = useState<AssignmentFormValue>(() => emptyAssignmentForm());
  const [packs, setPacks] = useState<LessonPackRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([listLessonPacks(), listTaughtClasses()])
      .then(([nextPacks, nextClasses]) => {
        setPacks(nextPacks);
        setClasses(nextClasses);
        setSelected(nextClasses.map((row) => row.id));
        setReady(true);
      })
      .catch((err) => {
        setStatus(err instanceof Error ? err.message : 'Could not load lessons');
        setReady(true);
      });
  }, []);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (!selected.length) throw new Error('Pick a class you teach.');
      if (value.workKind === 'lesson') {
        const pack = parsePackKey(value.packKey);
        if (!pack) throw new Error('Pick a lesson.');
        await assignLesson({
          classIds: selected,
          title: value.title,
          pack,
          ...lessonFieldsFromForm(value),
        });
      } else {
        for (const classId of selected) {
          await assertTaughtClass(classId);
          await createAssignment(plannedAssignmentInput(classId, value));
        }
      }
      const first = selected[0];
      router.replace(first ? (`/class/${first}/assignments` as never) : '/');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not assign');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen keyboard maxWidth={640}>
      <Text style={[type.meta, { color: colors.mute }]}>
        Assign a lesson or practice to classes you already teach. This does not create a class.
      </Text>
      {!ready ? <WorkingLine /> : null}
      {ready ? (
        <AssignmentForm
          value={value}
          onChange={setValue}
          busy={busy}
          submitLabel="Assign"
          onSubmit={() => void save()}
          onCancel={() => router.back()}
          packs={packs}
          taughtClasses={classes}
          selectedClassIds={selected}
          onToggleClass={(classId) =>
            setSelected((current) =>
              current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId],
            )
          }
        />
      ) : null}
      {status ? <Text style={[type.body, { color: colors.danger }]}>{status}</Text> : null}
    </Screen>
  );
}
