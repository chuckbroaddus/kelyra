import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { DateInput } from '@/components/ui/DateInput';
import { FormSheet } from '@/components/ui/FormSheet';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { listParentVehicles, upsertParentVehicle, type ParentVehicle } from '@/lib/ride/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

function formatValidity(row: ParentVehicle): string {
  if (row.validity_kind === 'range' && row.valid_from && row.valid_to) {
    const from = row.valid_from.slice(0, 10);
    const to = row.valid_to.slice(0, 10);
    return `range ${from}–${to}`;
  }
  return row.validity_kind;
}

export default function ParentVehiclesScreen() {
  const { colors } = useTheme();
  usePushedTitle('Vehicles');
  const [rows, setRows] = useState<ParentVehicle[]>([]);
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [label, setLabel] = useState('');
  const [validity, setValidity] = useState<'today' | 'range' | 'indefinite'>('indefinite');
  const [validFrom, setValidFrom] = useState<string | null>(null);
  const [validTo, setValidTo] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setPlate('');
    setYear('');
    setMake('');
    setModel('');
    setLabel('');
    setValidity('indefinite');
    setValidFrom(null);
    setValidTo(null);
    setStatus(null);
  }, []);

  const closeSheet = useCallback(() => {
    setOpen(false);
    resetForm();
  }, [resetForm]);

  const selectValidity = useCallback((kind: 'today' | 'range' | 'indefinite') => {
    setValidity(kind);
    if (kind !== 'range') {
      setValidFrom(null);
      setValidTo(null);
    }
    setStatus(null);
  }, []);

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
      if (validity === 'range') {
        if (!validFrom || !validTo) {
          setStatus('Start date and end date are required for a date range.');
          return;
        }
        if (validTo < validFrom) {
          setStatus('End date must be on or after start date.');
          return;
        }
      }
      const trimmedYear = year.trim();
      const parsedYear = trimmedYear === '' ? null : Number.parseInt(trimmedYear, 10);
      const yearValue =
        parsedYear != null && Number.isFinite(parsedYear) ? parsedYear : null;
      await upsertParentVehicle({
        plateRaw: plate,
        year: yearValue,
        make,
        model,
        label,
        validityKind: validity,
        validFrom: validity === 'range' ? validFrom : null,
        validTo: validity === 'range' ? validTo : null,
      });
      closeSheet();
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
            {[row.year, row.make, row.model].filter(Boolean).join(' ')} · {formatValidity(row)}
            {row.valid_today === false ? ' · not valid today' : ''}
          </Text>
          <GhostButton label="Remove" tone="danger" onPress={() => void remove(row.id)} />
        </Card>
      ))}
      {status && !open ? <Text style={{ color: colors.mute }}>{status}</Text> : null}

      <FormSheet visible={open} title="Add vehicle" onClose={closeSheet}>
        <TextField label="Plate" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
        <TextField label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" />
        <TextField label="Make" value={make} onChangeText={setMake} />
        <TextField label="Model" value={model} onChangeText={setModel} />
        <TextField label="Label (optional, e.g. nanny)" value={label} onChangeText={setLabel} />
        <Text style={[type.meta, { color: colors.mute, marginBottom: 6 }]}>Validity</Text>
        <ChipRow>
          {(['today', 'range', 'indefinite'] as const).map((kind) => (
            <Chip
              key={kind}
              label={kind}
              selected={validity === kind}
              onPress={() => selectValidity(kind)}
            />
          ))}
        </ChipRow>
        {validity === 'range' ? (
          <View style={styles.dates}>
            <DateInput
              label="Start date"
              value={validFrom}
              onChange={setValidFrom}
              required
              max={validTo}
            />
            <DateInput
              label="End date"
              value={validTo}
              onChange={setValidTo}
              required
              min={validFrom}
            />
          </View>
        ) : null}
        {status ? <Text style={[type.meta, { color: colors.danger, marginTop: 8 }]}>{status}</Text> : null}
        <PrimaryButton label="Save" onPress={() => void save()} />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginBottom: 16, lineHeight: 22 },
  dates: { gap: 12, marginTop: 12, marginBottom: 8 },
});
