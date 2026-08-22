import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { DetailsRows } from '@/components/ui/DetailsRows';
import { FormSheet } from '@/components/ui/FormSheet';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { formatHandle, STAFF_PROFILE_FIELDS, type StaffProfileFieldKey } from '@/lib/school/roles';
import { updateProfileDetails } from '@/lib/school/api';
import type { ProfileRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  profile: ProfileRow;
  canEdit: boolean;
  onSaved: (next: ProfileRow) => void;
  fields?: StaffProfileFieldKey[];
};

function valueFor(profile: ProfileRow, key: StaffProfileFieldKey): string {
  if (key === 'username') return formatHandle(profile.username);
  const raw = profile[key];
  return typeof raw === 'string' ? raw : '';
}

export function ProfileDetails({ profile, canEdit, onSaved, fields }: Props) {
  const shownFields = fields?.length
    ? STAFF_PROFILE_FIELDS.filter((field) => fields.includes(field.key))
    : STAFF_PROFILE_FIELDS;
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<StaffProfileFieldKey, string>>({
    display_name: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEdit = () => {
    setError(null);
    setDraft({
      display_name: profile.display_name ?? '',
      username: profile.username,
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      address: profile.address ?? '',
      notes: profile.notes ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await updateProfileDetails({
        profileId: profile.id,
        displayName: draft.display_name,
        username: draft.username,
        email: draft.email,
        phone: draft.phone,
        address: draft.address,
        notes: draft.notes,
      });
      setOpen(false);
      onSaved(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <DetailsRows
        rows={shownFields.map((field) => ({
          key: field.key,
          label: field.label,
          value: valueFor(profile, field.key) || null,
        }))}
        onPress={canEdit ? openEdit : () => undefined}
        onClear={undefined}
      />
      {!canEdit ? (
        <Text style={[styles.lock, { color: colors.mute }]}>You cannot edit this profile.</Text>
      ) : null}
      <FormSheet visible={open} title="Edit profile" onClose={() => setOpen(false)}>
        {STAFF_PROFILE_FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            value={draft[field.key]}
            autoCapitalize={field.key === 'email' || field.key === 'username' ? 'none' : 'sentences'}
            keyboardType={
              field.key === 'email' ? 'email-address' : field.key === 'phone' ? 'phone-pad' : 'default'
            }
            multiline={field.key === 'address' || field.key === 'notes'}
            onChangeText={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
          />
        ))}
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={() => void save()} />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  lock: {
    ...type.meta,
    marginTop: 8,
  },
  error: {
    ...type.meta,
    marginVertical: 8,
  },
});
