import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { archiveDayPhotos, ensureDefaultLines, setPickupRestriction } from '@/lib/ride/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function AdminRideScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  usePushedTitle('Ride office');
  const [studentId, setStudentId] = useState('');
  const [parentId, setParentId] = useState('');
  const [reason, setReason] = useState('');
  const [day, setDay] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const isSuper = profile?.role === 'superintendent';

  return (
    <Screen maxWidth={560}>
      <Text style={[type.title, { color: colors.ink }]}>Ride office</Text>
      <Card>
        <PrimaryButton
          label="Ensure default lines (K–2 / 3–5)"
          onPress={() => {
            void ensureDefaultLines()
              .then((rows) => setStatus(`Lines: ${rows.map((r) => r.name).join(', ')}`))
              .catch((err) => setStatus(err instanceof Error ? err.message : 'Failed'));
          }}
        />
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.mute }]}>Pickup restriction</Text>
        <TextField label="Student id" value={studentId} onChangeText={setStudentId} />
        <TextField label="Parent id (optional)" value={parentId} onChangeText={setParentId} />
        <TextField label="Office reason (never shown to parent)" value={reason} onChangeText={setReason} />
        <PrimaryButton
          label="Save restriction"
          onPress={() => {
            void setPickupRestriction({
              studentId,
              parentId: parentId || null,
              reason: reason || null,
              active: true,
            })
              .then(() => setStatus('Restriction saved'))
              .catch((err) => setStatus(err instanceof Error ? err.message : 'Failed'));
          }}
        />
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.mute }]}>
          Archive day&apos;s photos (superintendent only)
        </Text>
        <TextField label="School date YYYY-MM-DD" value={day} onChangeText={setDay} />
        <PrimaryButton
          label="Archive"
          disabled={!isSuper}
          onPress={() => {
            void archiveDayPhotos(day)
              .then((r) => setStatus(`Archived ${r.archived_count ?? 0}`))
              .catch((err) => setStatus(err instanceof Error ? err.message : 'Not allowed'));
          }}
        />
        {!isSuper ? (
          <Text style={{ color: colors.mute }}>Administrators cannot archive.</Text>
        ) : null}
      </Card>

      {status ? <GhostButton label={status} onPress={() => setStatus(null)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8 },
});
