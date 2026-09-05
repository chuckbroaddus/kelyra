import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormSheet } from '@/components/ui/FormSheet';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { listParentVehicles, upsertParentVehicle, type ParentVehicle } from '@/lib/ride/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ParentVehiclesScreen() {
  const { colors } = useTheme();
  usePushedTitle('Vehicles');
  const [rows, setRows] = useState<ParentVehicle[]>([]);
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [label, setLabel] = useState('');
  const [validity, setValidity] = useState<'today' | 'range' | 'indefinite'>('indefinite');
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void listParentVehicles()
      .then(setRows)
      .catch((err) => setStatus(err instanceof Error ? err.message : 'Could not load vehicles'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function save() {
    try {
      await upsertParentVehicle({
        plateRaw: plate,
        make,
        model,
        label,
        validityKind: validity,
      });
      setOpen(false);
      setPlate('');
      setMake('');
      setModel('');
      setLabel('');
      refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not save');
    }
  }

  async function remove(id: string) {
    try {
      await upsertParentVehicle({ id, plateRaw: 'VOID', validityKind: 'indefinite', void: true });
      refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not remove');
    }
  }

  return (
    <Screen maxWidth={560}>
      <Text style={[type.title, { color: colors.ink }]}>Vehicles</Text>
      <Text style={[styles.lead, { color: colors.mute }]}>
        Own cars plus grandma/nanny cars. Validity: today, date range, or indefinite. At check-in you do not pick which
        car you sit in.
      </Text>
      <PrimaryButton label="Add vehicle" onPress={() => setOpen(true)} />
      {rows.map((row) => (
        <Card key={row.id}>
          <Text style={[type.body, { color: colors.ink }]}>
            {row.plate_raw}
            {row.label ? ` · ${row.label}` : ''}
          </Text>
          <Text style={{ color: colors.mute }}>
            {[row.make, row.model].filter(Boolean).join(' ')} · {row.validity_kind}
            {row.valid_today === false ? ' · not valid today' : ''}
          </Text>
          <GhostButton label="Remove" tone="danger" onPress={() => void remove(row.id)} />
        </Card>
      ))}
      {status ? <Text style={{ color: colors.mute }}>{status}</Text> : null}

      <FormSheet visible={open} title="Add vehicle" onClose={() => setOpen(false)}>
        <TextField label="Plate" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
        <TextField label="Make" value={make} onChangeText={setMake} />
        <TextField label="Model" value={model} onChangeText={setModel} />
        <TextField label="Label (optional, e.g. nanny)" value={label} onChangeText={setLabel} />
        <View style={styles.row}>
          {(['today', 'range', 'indefinite'] as const).map((kind) => (
            <GhostButton
              key={kind}
              label={kind}
              onPress={() => setValidity(kind)}
            />
          ))}
        </View>
        <Text style={{ color: colors.mute, marginBottom: 8 }}>Selected validity: {validity}</Text>
        <PrimaryButton label="Save" onPress={() => void save()} />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginBottom: 16, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
});
