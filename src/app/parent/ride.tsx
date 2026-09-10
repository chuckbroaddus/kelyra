import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { firstName } from '@/lib/format';
import { pickRawPhoto, waitForModalDismiss } from '@/lib/media/pickPhoto';
import { loadParentProgressMine } from '@/lib/parents/api';
import {
  invokeRideLpr,
  listDismissalLines,
  myTrip,
  parentCheckIn,
  parentLeave,
  uploadRidePhoto,
  type DismissalLine,
  type MyTrip,
} from '@/lib/ride/api';
import {
  parentCheckInMessage,
  parentLeaveConfirmBody,
  parentLeaveSuccessMessage,
  RIDE_LEAVE_FAIL_MESSAGE,
} from '@/lib/ride/copy';
import { RIDE_FAIL_MESSAGE } from '@/lib/ride/plate';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ParentRideScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  usePushedTitle('Ride');
  const [lines, setLines] = useState<DismissalLine[]>([]);
  const [lineId, setLineId] = useState<string | null>(null);
  const [children, setChildren] = useState<Array<{ student_id: string; display_name: string }>>([]);
  const [picked, setPicked] = useState<string[]>([]);
  /** Live waiting trip (any line) — pinned for Leave; SoT is server. */
  const [trip, setTrip] = useState<MyTrip | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [aheadPlate, setAheadPlate] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const waiting =
    trip?.status === 'in_line' && trip.position_xx != null && Boolean(trip.line_id);
  const waitingLineId = waiting ? trip!.line_id! : null;
  const sameLineWaiting = Boolean(waiting && lineId && waitingLineId === lineId);
  const waitingLine = lines.find((l) => l.id === waitingLineId) ?? null;
  const waitingLineName = waitingLine?.name ?? 'this line';

  const tripChildNames = useMemo(() => {
    const ids = trip?.student_ids ?? [];
    return ids
      .map((id) => {
        const row = children.find((c) => c.student_id === id);
        return row ? firstName(row.display_name) : null;
      })
      .filter((n): n is string => Boolean(n));
  }, [trip?.student_ids, children]);

  const leaveA11y = `Leave line ${waitingLineName}${
    tripChildNames.length ? ` for ${tripChildNames.join(', ')}` : ''
  }`;

  const refresh = useCallback(async () => {
    const [lineRows, progress] = await Promise.all([
      listDismissalLines().catch(() => [] as DismissalLine[]),
      loadParentProgressMine().catch(() => null),
    ]);
    setLines(lineRows);
    setLineId((cur) => cur ?? lineRows[0]?.id ?? null);
    const kids = (progress?.children ?? [])
      .map((c) => {
        const row = c as { student_id?: string; id?: string; display_name: string };
        return {
          student_id: row.student_id ?? row.id ?? '',
          display_name: row.display_name,
        };
      })
      .filter((c) => c.student_id);
    setChildren(kids);
    // Any-line waiting trip so Leave stays pinned when chips target another line
    const t = await myTrip(null).catch(() => null);
    setTrip(t);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  function toggleChild(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function runCheckIn(opts: { imFirst: boolean; photo?: boolean }) {
    if (!session?.user?.id) {
      setStatus('Sign in again');
      return;
    }
    if (!lineId) {
      setStatus('No line available');
      return;
    }
    if (waiting && waitingLineId === lineId) {
      setStatus('Leave this line before checking in here again.');
      return;
    }
    if (!picked.length) {
      setStatus('Pick children first');
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
          setStatus('Photo canceled');
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
      const t = await myTrip(null).catch(() => null);
      setTrip(t);
    } catch {
      setStatus(RIDE_FAIL_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  async function confirmLeave() {
    if (!waitingLineId) {
      setLeaveOpen(false);
      return;
    }
    setBusy(true);
    try {
      const result = await parentLeave(waitingLineId);
      setLeaveOpen(false);
      if (!result.ok) {
        setStatus(RIDE_LEAVE_FAIL_MESSAGE);
        return;
      }
      setStatus(parentLeaveSuccessMessage(waitingLineName));
      setTrip(null);
      setPicked([]);
      setAheadPlate('');
      await refresh();
    } catch {
      setLeaveOpen(false);
      setStatus(RIDE_LEAVE_FAIL_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  const checkInDisabled = busy || sameLineWaiting;

  return (
    <Screen maxWidth={560}>
      <Text style={[type.title, { color: colors.ink }]}>Ride</Text>
      <Text style={[styles.lead, { color: colors.mute }]}>
        {waiting
          ? 'You’re in this line.'
          : 'Pick children for this stop, then photo the car ahead — or I’m first. You do not pick which of your cars you are in.'}
      </Text>

      {waiting && trip?.position_xx != null ? (
        <Card>
          <Text style={[styles.label, { color: colors.mute }]}>Line · {waitingLineName}</Text>
          <Text style={[type.body, { color: colors.ink }]}>You are {trip.position_xx}</Text>
          {tripChildNames.length ? (
            <Text style={[styles.tripKids, { color: colors.mute }]}>{tripChildNames.join(', ')}</Text>
          ) : null}
          <GhostButton
            label="Leave line"
            accessibilityLabel={leaveA11y}
            disabled={busy}
            onPress={() => setLeaveOpen(true)}
          />
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.label, { color: colors.mute }]}>
          {waiting && !sameLineWaiting ? 'Another line' : 'Line'}
        </Text>
        <ChipRow>
          {lines.map((line) => (
            <Chip
              key={line.id}
              label={line.name}
              selected={lineId === line.id}
              onPress={() => setLineId(line.id)}
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
              onPress={() => {
                if (sameLineWaiting) return;
                toggleChild(child.student_id);
              }}
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
          editable={!checkInDisabled}
        />
        <View style={styles.row}>
          <PrimaryButton
            label={busy ? 'Working…' : 'Photo car ahead'}
            disabled={checkInDisabled}
            onPress={() => void runCheckIn({ imFirst: false, photo: true })}
          />
          <GhostButton
            label="I'm first"
            disabled={checkInDisabled}
            onPress={() => void runCheckIn({ imFirst: true })}
          />
        </View>
        {sameLineWaiting ? (
          <Text style={[styles.muteHelper, { color: colors.mute }]}>
            Leave this line before checking in here again.
          </Text>
        ) : null}
      </Card>

      {status ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>{status}</Text>
        </Card>
      ) : null}

      <GhostButton label="Manage vehicles" onPress={() => router.push('/parent/vehicles')} />

      <ConfirmSheet
        visible={leaveOpen}
        tone="primary"
        title={`Leave ${waitingLineName}?`}
        body={parentLeaveConfirmBody(tripChildNames)}
        confirmLabel="Leave line"
        cancelLabel="Keep waiting"
        confirmAccessibilityLabel={leaveA11y}
        busy={busy}
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => void confirmLeave()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginBottom: 16, lineHeight: 22 },
  label: { marginBottom: 8, fontSize: 13 },
  tripKids: { marginTop: 4, marginBottom: 8, lineHeight: 20 },
  row: { gap: 12, marginTop: 12 },
  muteHelper: { marginTop: 8, fontSize: 13, lineHeight: 18 },
});
