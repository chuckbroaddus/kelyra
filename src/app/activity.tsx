import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { HandleLink } from '@/components/ui/HandleLink';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import { formatWhen } from '@/lib/format';
import { useAuth } from '@/lib/auth/AuthProvider';
import { actionLabel, auditSubject, roleDisplay } from '@/lib/school/audit';
import { listAuditEvents } from '@/lib/school/api';
import { formatHandle, isAdminRole } from '@/lib/school/roles';
import type { AuditEventRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function ActivityScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [rows, setRows] = useState<AuditEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminRole(profile)) {
        setError('Only administrators can read the log.');
        setRows([]);
        return;
      }
      void listAuditEvents()
        .then(setRows)
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Could not load the log');
          setRows([]);
        });
    }, [profile]),
  );

  const handles = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows ?? []) {
      if (row.actor_username) set.add(row.actor_username);
    }
    return [...set].sort();
  }, [rows]);

  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows ?? []) {
      if (row.actor_role) set.add(row.actor_role);
    }
    return [...set].sort();
  }, [rows]);

  const actions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows ?? []) set.add(row.action);
    return [...set].sort((a, b) => actionLabel(a).localeCompare(actionLabel(b)));
  }, [rows]);

  const visible = useMemo(() => {
    return (rows ?? []).filter((row) => {
      if (handle && row.actor_username !== handle) return false;
      if (role && row.actor_role !== role) return false;
      if (action && row.action !== action) return false;
      return true;
    });
  }, [action, handle, role, rows]);

  return (
    <Screen maxWidth={720} keyboard>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 12 }]}>
        Append-only. Nobody can edit or delete these rows — including the Superintendent.
        {rows
          ? ` Showing ${visible.length}${visible.length !== rows.length ? ` of ${rows.length}` : ''} event${rows.length === 1 ? '' : 's'}${
              rows.length ? `, back to ${formatWhen(rows[rows.length - 1]!.created_at)}` : ''
            }.`
          : ''}
      </Text>

      <SectionHeader label="Filter" first />
      <Text style={[styles.filterLabel, { color: colors.mute }]}>Handle</Text>
      <ChipRow>
        <Chip label="All" selected={handle == null} onPress={() => setHandle(null)} />
        {handles.map((item) => (
          <Chip
            key={item}
            label={formatHandle(item)}
            selected={handle === item}
            onPress={() => setHandle(item)}
          />
        ))}
      </ChipRow>
      <Text style={[styles.filterLabel, { color: colors.mute }]}>Role</Text>
      <ChipRow>
        <Chip label="All" selected={role == null} onPress={() => setRole(null)} />
        {roles.map((item) => (
          <Chip
            key={item}
            label={roleDisplay(item)}
            selected={role === item}
            onPress={() => setRole(item)}
          />
        ))}
      </ChipRow>
      <Text style={[styles.filterLabel, { color: colors.mute }]}>Action</Text>
      <ChipRow>
        <Chip label="All" selected={action == null} onPress={() => setAction(null)} />
        {actions.map((item) => (
          <Chip
            key={item}
            label={actionLabel(item)}
            selected={action === item}
            onPress={() => setAction(item)}
          />
        ))}
      </ChipRow>

      {rows == null ? <WorkingLine /> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {rows && visible.length === 0 && !error ? (
        <Text style={[type.body, { color: colors.mute, marginTop: 16 }]}>
          {rows.length === 0 ? 'No events yet.' : 'No events match those filters.'}
        </Text>
      ) : null}

      {visible.map((row) => {
        const subject = auditSubject(row);
        return (
          <View key={row.id} style={[styles.card, { borderBottomColor: colors.line }]}>
            <View style={styles.who}>
              {row.actor_username ? (
                <HandleLink username={row.actor_username} profileId={row.actor_id} />
              ) : (
                <Text style={[type.body, { fontWeight: '700', color: colors.ink }]}>@unknown</Text>
              )}
              <Text style={[type.meta, { color: colors.mute }]}>{roleDisplay(row.actor_role)}</Text>
            </View>
            <Text style={[type.body, { color: colors.ink, fontWeight: '600' }]}>{actionLabel(row.action)}</Text>
            {subject ? <Text style={[type.meta, { color: colors.mute }]}>{subject}</Text> : null}
            <Text style={[type.meta, { color: colors.mute }]}>{formatWhen(row.created_at)}</Text>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterLabel: {
    ...type.meta,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  error: { ...type.body, marginBottom: 12 },
  card: {
    paddingVertical: 14,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
});
