import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { pickRawPhoto, waitForModalDismiss } from '@/lib/media/pickPhoto';
import { loadParentProgressMine } from '@/lib/parents/api';
import {
  invokeRideLpr,
  listDismissalLines,
  myTrip,
  parentCheckIn,
  uploadRidePhoto,
  type DismissalLine,
  type MyTrip,
} from '@/lib/ride/api';
import { parentCheckInMessage } from '@/lib/ride/copy';
import { RIDE_FAIL_MESSAGE } from '@/lib/ride/plate';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ParentRideScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  usePushedTitle('Car rider');
  const [lines, setLines] = useState<DismissalLine[]>([]);
  const [lineId, setLineId] = useState<string | null>(null);
  const [children, setChildren] = useState<Array<{ student_id: string; display_name: string }>>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [trip, setTrip] = useState<MyTrip | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [aheadPlate, setAheadPlate] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [lineRows, progress] = await Promise.all([
      listDismissalLines().catch(() => [] as DismissalLine[]),
      loadParentProgressMine().catch(() => null),
    ]);
    setLines(lineRows);
    setLineId((cur) => cur ?? lineRows[0]?.id ?? null);
    const kids = (progress?.children ?? []).map((c) => {
      const row = c as { student_id?: string; id?: string; display_name: string };
      return {
        student_id: row.student_id ?? row.id ?? '',
        display_name: row.display_name,
      };
    }).filter((c) => c.student_id);
    setChildren(kids);
    if (lineRows[0]?.id) {
      const t = await myTrip(lineId ?? lineRows[0].id).catch(() => null);
      setTrip(t);
    }
  }, [lineId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  function toggleChild(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function runCheckIn(opts: { imFirst: boolean; photo?: boolean }) {
    if (!lineId || !session?.user?.id) {
      setStatus(RIDE_FAIL_MESSAGE);
      return;
    }
    if (!picked.length) {
      setStatus(RIDE_FAIL_MESSAGE);
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      let storagePath: string | null = null;
      let plateRaw: string | null = aheadPlate.trim() || null;
      let plateSource: 'lpr' | 'typed' | 'stt' | null = plateRaw ? 'typed' : null;
      if (opts.photo || (!opts.imFirst && !plateRaw)) {
        await waitForModalDismiss();
        const photo = await pickRawPhoto(true);
        if (!photo) {
          setStatus(RIDE_FAIL_MESSAGE);
          return;
        }
        storagePath = await uploadRidePhoto(session.user.id, photo.uri, photo.mimeType);
        const lpr = await invokeRideLpr(storagePath);
        if (lpr.plate) {
          plateRaw = lpr.plate;
          plateSource = 'lpr';
          setAheadPlate(lpr.plate);
        }
      }
      const result = await parentCheckIn({
        lineId,
        studentIds: picked,
        imFirst: opts.imFirst,
        storagePath,
        aheadPlateRaw: opts.imFirst ? null : plateRaw,
        aheadPlateSource: opts.imFirst ? null : plateSource,
      });
      setStatus(parentCheckInMessage(result));
      const t = await myTrip(lineId);
      setTrip(t);
    } catch {
      setStatus(RIDE_FAIL_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen maxWidth={560}>
      <Text style={[type.title, { color: colors.ink }]}>Car rider</Text>
      <Text style={[styles.lead, { color: colors.mute }]}>
        Pick children for this stop, then photo the car ahead — or I&apos;m first. You do not pick which of your cars
        you are in.
      </Text>

      <Card>
        <Text style={[styles.label, { color: colors.mute }]}>Line</Text>
        <ChipRow>
          {lines.map((line) => (
            <Chip
              key={line.id}
              label={line.name}
              selected={lineId === line.id}
              onPress={() => {
                setLineId(line.id);
                void myTrip(line.id).then(setTrip);
              }}
            />
          ))}
        </ChipRow>
      </Card>

      <Card>
        <Text style={[styles.label, { color: colors.mute }]}>Children this stop</Text>
        <ChipRow>
          {children.map((child) => (
            <Chip
              key={child.student_id}
              label={child.display_name}
              selected={picked.includes(child.student_id)}
              onPress={() => toggleChild(child.student_id)}
            />
          ))}
        </ChipRow>
        {!children.length ? (
          <Text style={{ color: colors.mute }}>No linked children on this login.</Text>
        ) : null}
      </Card>

      <Card>
        <TextField
          label="Car ahead plate (if LPR unreadable — type or speak into this field)"
          value={aheadPlate}
          onChangeText={setAheadPlate}
          autoCapitalize="characters"
        />
        <View style={styles.row}>
          <PrimaryButton label={busy ? 'Working…' : 'Photo car ahead'} disabled={busy} onPress={() => void runCheckIn({ imFirst: false, photo: true })} />
          <GhostButton label="I'm first" disabled={busy} onPress={() => void runCheckIn({ imFirst: true })} />
        </View>
      </Card>

      {status ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>{status}</Text>
        </Card>
      ) : null}

      {trip?.status === 'in_line' && trip.position_xx != null ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>
            You are {trip.position_xx} vehicle in line
          </Text>
        </Card>
      ) : null}

      <GhostButton label="Manage vehicles" onPress={() => router.push('/parent/vehicles')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginBottom: 16, lineHeight: 22 },
  label: { marginBottom: 8, fontSize: 13 },
  row: { gap: 12, marginTop: 12 },
});
