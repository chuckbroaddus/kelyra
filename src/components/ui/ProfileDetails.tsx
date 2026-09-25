import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/Button';
import { DateInput } from '@/components/ui/DateInput';
import { DetailsRows } from '@/components/ui/DetailsRows';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { coerceBirthdayISO, formatLocaleDate } from '@/lib/date/iso';
import {
  applyStudentOptionalDraft,
  isTeacherOnlyStudentKey,
  metaString,
  STUDENT_OFFICE_OPTIONAL_FIELDS,
  studentOptionalDraftFromMetadata,
} from '@/lib/people/metadata';
import { formatHandle, STAFF_PROFILE_FIELDS, type StaffProfileFieldKey } from '@/lib/school/roles';
import { setStudentLink, updateProfileDetails } from '@/lib/school/api';
import { getStudent, mintOfficeStudent, updateStudentMetadata } from '@/lib/students/api';
import type { ProfileRow, StudentRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  profile: ProfileRow;
  canEdit: boolean;
  onSaved: (next: ProfileRow) => void;
  fields?: StaffProfileFieldKey[];
  /** When false, hide allergies / emergency / health (student seat). Default true for office. */
  showSensitiveStudentFields?: boolean;
  /** Acting staff id for minting a student card if profile.student_id is null. */
  actorId?: string | null;
};

function valueFor(profile: ProfileRow, key: StaffProfileFieldKey): string {
  if (key === 'username') return formatHandle(profile.username);
  const raw = profile[key];
  return typeof raw === 'string' ? raw : '';
}

export function ProfileDetails({
  profile,
  canEdit,
  onSaved,
  fields,
  showSensitiveStudentFields = true,
  actorId = null,
}: Props) {
  const shownFields = fields?.length
    ? STAFF_PROFILE_FIELDS.filter((field) => fields.includes(field.key))
    : STAFF_PROFILE_FIELDS;
  const { colors } = useTheme();
  const isStudent = profile.role === 'student';
  const optionalFields = showSensitiveStudentFields
    ? STUDENT_OFFICE_OPTIONAL_FIELDS
    : STUDENT_OFFICE_OPTIONAL_FIELDS.filter((field) => !isTeacherOnlyStudentKey(field.key));

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<StaffProfileFieldKey, string>>({
    display_name: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [studentDraft, setStudentDraft] = useState<Record<string, string>>({});
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (!isStudent || !profile.student_id) {
      setStudent(null);
      return;
    }
    void getStudent(profile.student_id)
      .then((row) => {
        if (live) setStudent(row);
      })
      .catch(() => {
        if (live) setStudent(null);
      });
    return () => {
      live = false;
    };
  }, [isStudent, profile.student_id, profile.id]);

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
    setStudentDraft(studentOptionalDraftFromMetadata(student?.metadata));
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
      let linked = next;
      if (isStudent && showSensitiveStudentFields) {
        const built = applyStudentOptionalDraft(student?.metadata ?? {}, studentDraft);
        if (!built.ok) {
          setError(built.error);
          return;
        }
        if (student) {
          const updated = await updateStudentMetadata(student, built.metadata);
          setStudent(updated);
        } else if (actorId) {
          const minted = await mintOfficeStudent({
            displayName: draft.display_name || profile.display_name || profile.username,
            teacherId: actorId,
            metadata: built.metadata,
          });
          await setStudentLink(profile.id, minted.id);
          setStudent(minted);
          linked = { ...next, student_id: minted.id };
        }
      }
      setOpen(false);
      onSaved(linked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  };

  const studentRows =
    isStudent && optionalFields.length
      ? optionalFields.map((field) => ({
          key: `student:${field.key}`,
          label: field.label,
          value:
            field.key === 'birthday'
              ? formatLocaleDate(coerceBirthdayISO(metaString(student?.metadata, 'birthday')))
              : metaString(student?.metadata, field.key),
        }))
      : [];

  return (
    <View>
      <DetailsRows
        rows={[
          ...shownFields.map((field) => ({
            key: field.key,
            label: field.label,
            value: valueFor(profile, field.key) || null,
          })),
          ...studentRows,
        ]}
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
        {isStudent && showSensitiveStudentFields
          ? optionalFields.map((field) =>
              field.key === 'birthday' ? (
                <DateInput
                  key={field.key}
                  label={field.label}
                  mode="birthday"
                  clearable
                  value={coerceBirthdayISO(studentDraft[field.key])}
                  onChange={(iso) =>
                    setStudentDraft((current) => ({ ...current, [field.key]: iso ?? '' }))
                  }
                />
              ) : (
                <TextField
                  key={field.key}
                  label={field.label}
                  value={studentDraft[field.key] ?? ''}
                  multiline={field.key === 'allergies' || field.key === 'health_conditions'}
                  keyboardType={field.key === 'emergency_phone' ? 'phone-pad' : 'default'}
                  onChangeText={(value) =>
                    setStudentDraft((current) => ({ ...current, [field.key]: value }))
                  }
                />
              ),
            )
          : null}
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
