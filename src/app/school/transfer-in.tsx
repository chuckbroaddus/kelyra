/**
 * GB-17 office transfer-in entry (FR-CR-07).
 */
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import {
  buildTransferInPeriod,
  buildTransferInTerm,
  convertTransferLetter,
  defaultCreditPolicy,
  DEFAULT_TRANSFER_LETTER_TO_PCT,
} from '@/lib/grade/posting';
import { transferInGrade } from '@/lib/grade/posting/api';
import { makeScaleFromTemplate } from '@/lib/grade/scale/scale';
import { getBundledHelpTopic } from '@/lib/help/helpTopics';
import { isOfficeRole } from '@/lib/school/roles';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Kind = 'period' | 'term';

export default function TransferInScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const office = isOfficeRole(profile);
  usePushedTitle('Transfer-in grade');

  const [kind, setKind] = useState<Kind>('term');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [code, setCode] = useState('S1');
  const [course, setCourse] = useState('');
  const [letter, setLetter] = useState('B+');
  const [pctText, setPctText] = useState('');
  const [reason, setReason] = useState('transfer-in');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const help = getBundledHelpTopic('help.transfer_in');
  const scale = useMemo(() => makeScaleFromTemplate('us_10'), []);
  const map = DEFAULT_TRANSFER_LETTER_TO_PCT;

  const previewPct = useMemo(() => {
    if (pctText.trim() !== '' && Number.isFinite(Number(pctText))) return Number(pctText);
    if (letter.trim()) return convertTransferLetter(letter, map);
    return null;
  }, [pctText, letter, map]);

  if (!office) {
    return (
      <Screen maxWidth={560}>
        <Text style={[type.body, { color: colors.ink }]}>Office access required.</Text>
        <GhostButton label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const onSave = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      if (!classId.trim() || !studentId.trim()) {
        throw new Error('class id and student id are required');
      }
      const pct = pctText.trim() === '' ? null : Number(pctText);
      if (kind === 'period') {
        const built = buildTransferInPeriod({
          class_id: classId.trim(),
          student_id: studentId.trim(),
          marking_period_code: code.trim() || '6W1',
          letter: letter.trim() || null,
          pct,
          scale,
          transfer_map: map,
          stored_by: profile?.id ?? 'office',
          reason,
        });
        await transferInGrade({
          kind: 'period',
          classId: classId.trim(),
          studentId: studentId.trim(),
          payload: {
            marking_period_code: built.row.marking_period_code,
            pct: built.row.pct,
            letter: built.row.letter,
            reason,
          },
        });
      } else {
        const built = buildTransferInTerm({
          class_id: classId.trim(),
          student_id: studentId.trim(),
          course: course.trim() || 'Transfer course',
          credit_term: code.trim() || 'S1',
          letter: letter.trim() || null,
          pct,
          scale,
          transfer_map: map,
          credit_policy: defaultCreditPolicy(),
          stored_by: profile?.id ?? 'office',
          reason,
        });
        await transferInGrade({
          kind: 'term',
          classId: classId.trim(),
          studentId: studentId.trim(),
          payload: {
            course: built.row.course,
            credit_term: built.row.credit_term,
            pct: built.row.pct,
            letter: built.row.letter,
            credits_attempted: built.row.credits_attempted,
            credits_earned: built.row.credits_earned,
            course_level: built.row.course_level,
            reason,
          },
        });
      }
      setStatus('Transfer-in saved with audit.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save transfer-in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen maxWidth={560}>
      <Text style={[type.title, { color: colors.ink }]}>Transfer-in grade</Text>
      {help ? (
        <Card>
          <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>{help.title}</Text>
          <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>{help.meaning}</Text>
        </Card>
      ) : null}
      <ChipRow>
        <Chip label="Semester / term" selected={kind === 'term'} onPress={() => setKind('term')} />
        <Chip label="Marking period" selected={kind === 'period'} onPress={() => setKind('period')} />
      </ChipRow>
      <TextField label="Class id" value={classId} onChangeText={setClassId} />
      <TextField label="Student id" value={studentId} onChangeText={setStudentId} />
      <TextField
        label={kind === 'term' ? 'Credit term (S1, S2…)' : 'Period code (6W1, Q1…)'}
        value={code}
        onChangeText={setCode}
      />
      {kind === 'term' ? (
        <TextField label="Course name" value={course} onChangeText={setCourse} />
      ) : null}
      <TextField label="Letter (optional if percent set)" value={letter} onChangeText={setLetter} />
      <TextField label="Percent (optional if letter set)" value={pctText} onChangeText={setPctText} />
      <TextField label="Reason" value={reason} onChangeText={setReason} />
      <Text style={[type.meta, { color: colors.mute }]}>
        Preview percent: {previewPct == null ? '—' : `${previewPct}%`} (via transfer map)
      </Text>
      {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
      {status ? <Text style={[type.body, { color: colors.ink }]}>{status}</Text> : null}
      <View style={styles.row}>
        <PrimaryButton
          label={busy ? 'Saving…' : 'Save transfer-in'}
          onPress={() => void onSave()}
          disabled={busy}
        />
        <GhostButton label="Close" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, marginTop: 12 },
});
