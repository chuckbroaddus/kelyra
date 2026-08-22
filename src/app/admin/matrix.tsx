import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { HoverTip } from '@/components/ui/HoverTip';
import { Screen } from '@/components/ui/Screen';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { radius, type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import {
  ACCESS_HELP,
  ACCESS_LABEL,
  type Access,
  type Capability,
  nextAccess,
  SCHOOL_ROLES,
} from '@/lib/school/matrix';
import { loadCapabilityRows, resetGrantsToDefaults, saveGrant } from '@/lib/school/matrixApi';
import { roleLabel } from '@/lib/school/roles';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function MatrixScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [rows, setRows] = useState<Capability[] | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canEdit = profile?.role === 'superintendent';

  const areas = useMemo(() => {
    const set = new Set((rows ?? []).map((row) => row.area));
    return [...set];
  }, [rows]);

  const visible = (rows ?? []).filter((row) => !area || row.area === area);

  usePushedTitle('Responsibilities');

  useFocusEffect(
    useCallback(() => {
      void loadCapabilityRows()
        .then(setRows)
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not load responsibilities'));
    }, []),
  );

  const cycle = async (row: Capability, role: (typeof SCHOOL_ROLES)[number]) => {
    if (!canEdit || row.id === 'audit.mutate') return;
    const next = nextAccess(row[role]);
    setBusy(true);
    setError(null);
    try {
      await saveGrant(row.id, role, next);
      setRows((current) =>
        (current ?? []).map((item) => (item.id === row.id ? { ...item, [role]: next } : item)),
      );
      setStatus('Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!canEdit) return;
    setBusy(true);
    setError(null);
    try {
      setRows(await resetGrantsToDefaults());
      setStatus('Reset to the product defaults.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen maxWidth={640}>
      <Text style={[type.body, { color: colors.mute }]}>
        Tap a seat to cycle None → Own → School → All. Own is self, own classes, or own children. School is
        the office. All is break-glass.
      </Text>

      <ChipRow>
        <Chip label="All areas" selected={area == null} onPress={() => setArea(null)} />
        {areas.map((item) => (
          <Chip key={item} label={item} selected={area === item} onPress={() => setArea(item)} />
        ))}
      </ChipRow>

      {error ? <Text style={[styles.flash, { color: colors.danger }]}>{error}</Text> : null}
      {status ? <Text style={[styles.flash, { color: colors.mute }]}>{status}</Text> : null}
      {rows == null ? <WorkingLine /> : null}

      <View style={styles.list}>
      {visible.map((row) => (
        <Card key={row.id}>
          <HoverTip label={row.help} fill>
            <View style={styles.cap}>
              <Text style={[type.meta, { color: colors.mute }]}>{row.area}</Text>
              <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>{row.label}</Text>
              <Text style={[type.meta, { color: colors.mute }]}>{row.help}</Text>
            </View>
          </HoverTip>
          <View style={styles.seats}>
            {SCHOOL_ROLES.map((role) => {
              const value = row[role];
              const locked = !canEdit || busy || row.id === 'audit.mutate';
              return (
                <HoverTip key={role} label={`${roleLabel(role)}: ${ACCESS_HELP[value]}`}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${row.label}, ${roleLabel(role)}, ${ACCESS_LABEL[value]}`}
                    onPress={() => void cycle(row, role)}
                    disabled={locked}
                    style={[
                      styles.seat,
                      {
                        backgroundColor:
                          value === 'all' ? colors.brandSoft : value === 'school' ? colors.wash : colors.elevated,
                        borderColor: value === 'none' ? colors.line : colors.brand,
                        opacity: locked && row.id === 'audit.mutate' ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[type.badge, { color: colors.mute }]} numberOfLines={1}>
                      {roleLabel(role)}
                    </Text>
                    <Text
                      style={[
                        type.meta,
                        { color: value === 'none' ? colors.mute : colors.ink, fontWeight: '700' },
                      ]}
                    >
                      {ACCESS_LABEL[value]}
                    </Text>
                  </Pressable>
                </HoverTip>
              );
            })}
          </View>
        </Card>
      ))}
      </View>

      {canEdit ? <GhostButton label="Reset to defaults" onPress={() => void reset()} /> : null}
      {!canEdit ? (
        <Text style={[type.meta, { color: colors.mute }]}>Only the superintendent can change this.</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flash: {
    ...type.body,
    marginTop: 8,
  },
  list: {
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  cap: {
    gap: 2,
  },
  seats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seat: {
    minWidth: 104,
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
});
