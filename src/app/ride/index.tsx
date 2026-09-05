import { useFocusEffect } from 'expo-router';
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
import {
  invokeRideLpr,
  listDismissalLines,
  nudgeParent,
  orderFix,
  queueLive,
  releasePickup,
  staffAttachVehicle,
  staffWalkPhoto,
  uploadRidePhoto,
  type DismissalLine,
} from '@/lib/ride/api';
import { nudgeCopy } from '@/lib/ride/copy';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Slot = {
  slot_ord?: number;
  parent_id?: string;
  plate_norm?: string | null;
  unknown_flag?: boolean;
  conflict_first?: boolean;
  parent_name?: string;
  students?: Array<{ id: string; display_name: string }>;
};

export default function StaffRideScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  usePushedTitle('Dismissal curb');
  const [lines, setLines] = useState<DismissalLine[]>([]);
  const [lineId, setLineId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [conflict, setConflict] = useState(false);
  const [walkId, setWalkId] = useState<string | null>(null);
  const [seq, setSeq] = useState(1);
  const [attachParent, setAttachParent] = useState('');
  const [attachPlate, setAttachPlate] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async (id: string) => {
    const live = await queueLive(id);
    setConflict(Boolean(live.conflict_first));
    setSlots((live.slots as Slot[]) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void listDismissalLines()
        .then(async (rows) => {
          setLines(rows);
          const id = lineId ?? rows[0]?.id ?? null;
          setLineId(id);
          if (id) await refresh(id);
        })
        .catch((err) => setStatus(err instanceof Error ? err.message : 'Could not load'));
    }, [lineId, refresh]),
  );

  async function walkNext() {
    if (!lineId || !session?.user?.id) return;
    setStatus(null);
    try {
      await waitForModalDismiss();
      const photo = await pickRawPhoto(true);
      if (!photo) return;
      const path = await uploadRidePhoto(session.user.id, photo.uri, photo.mimeType);
      const lpr = await invokeRideLpr(path);
      const plate = lpr.plate ?? attachPlate.trim() ?? null;
      const result = await staffWalkPhoto({
        lineId,
        storagePath: path,
        staffSeq: seq,
        walkId,
        plateRaw: plate,
        plateSource: lpr.plate ? 'lpr' : plate ? 'typed' : 'unknown',
        unknownFlag: !plate,
      });
      if (typeof result.walk_id === 'string') setWalkId(result.walk_id);
      setSeq((n) => n + 1);
      await refresh(lineId);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Walk photo failed');
    }
  }

  async function fixOrder() {
    if (!lineId) return;
    const ordered = slots.map((s) => s.parent_id).filter((id): id is string => Boolean(id));
    await orderFix(lineId, ordered);
    await refresh(lineId);
  }

  return (
    <Screen maxWidth={720}>
      <Text style={[type.title, { color: colors.ink }]}>Curb / stage</Text>
      <ChipRow>
        {lines.map((line) => (
          <Chip
            key={line.id}
            label={line.name}
            selected={lineId === line.id}
            onPress={() => {
              setLineId(line.id);
              setSeq(1);
              setWalkId(null);
              void refresh(line.id);
            }}
          />
        ))}
      </ChipRow>

      {conflict ? (
        <Card>
          <Text style={{ color: colors.ink }}>Duplicate I&apos;m first — tap reorder / order fix.</Text>
          <PrimaryButton label="Apply current order_fix" onPress={() => void fixOrder()} />
        </Card>
      ) : null}

      <PrimaryButton label={`Walk photo #${seq}`} onPress={() => void walkNext()} />

      {slots.map((slot) => (
        <Card key={`${slot.parent_id}-${slot.slot_ord}`}>
          <Text style={[type.body, { color: colors.ink }]}>
            {slot.slot_ord}. {slot.parent_name ?? 'Unknown'} {slot.plate_norm ? `· ${slot.plate_norm}` : ''}
            {slot.unknown_flag ? ' · unknown' : ''}
          </Text>
          <Text style={{ color: colors.mute }}>
            {(slot.students ?? []).map((s) => s.display_name).join(', ') || '—'}
          </Text>
          <View style={styles.row}>
            {slot.parent_id ? (
              <>
                <GhostButton
                  label="Checkout"
                  onPress={() => {
                    if (!lineId || !slot.parent_id) return;
                    void releasePickup(lineId, slot.parent_id).then(() => refresh(lineId));
                  }}
                />
                <GhostButton
                  label="Nudge"
                  onPress={() => {
                    if (!lineId || !slot.parent_id) return;
                    void nudgeParent(lineId, slot.parent_id).then(() => setStatus(nudgeCopy()));
                  }}
                />
              </>
            ) : null}
          </View>
        </Card>
      ))}

      <Card>
        <Text style={[styles.label, { color: colors.mute }]}>Attach plate (type/STT text)</Text>
        <TextField label="Parent id" value={attachParent} onChangeText={setAttachParent} />
        <TextField label="Plate" value={attachPlate} onChangeText={setAttachPlate} autoCapitalize="characters" />
        <PrimaryButton
          label="Attach"
          onPress={() => {
            void staffAttachVehicle({
              parentId: attachParent,
              plateRaw: attachPlate,
              plateSource: 'typed',
            })
              .then(() => setStatus('Attached'))
              .catch((err) => setStatus(err instanceof Error ? err.message : 'Attach failed'));
          }}
        />
      </Card>

      {status ? <Text style={{ color: colors.mute }}>{status}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  label: { marginBottom: 8 },
});
