import {
  birthdayForSave,
  birthdayUnchanged,
  coerceBirthdayISO,
  formatBirthdayMd,
  parseLooseDate as parseBirthdayInput,
} from '@/lib/date/iso';
import type { ParentMetadataKey, StudentMetadataKey } from '@/lib/supabase/types';

export {
  birthdayForSave,
  birthdayUnchanged,
  coerceBirthdayISO,
  formatBirthdayMd,
  parseBirthdayInput,
};

export const STUDENT_DETAIL_FIELDS: Array<{ key: Exclude<StudentMetadataKey, 'focusLog'>; label: string }> = [
  { key: 'preferred_name', label: 'Preferred name' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'grade_or_age', label: 'Grade or age' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'emergency_name', label: 'Emergency contact' },
  { key: 'emergency_phone', label: 'Emergency phone' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'health_conditions', label: 'Health conditions' },
  { key: 'notes', label: 'Notes' },
];

/** Office create-account + People student profile Optional group (Chuck 2026-09-25). */
export const STUDENT_OFFICE_OPTIONAL_FIELDS: Array<{
  key: Exclude<StudentMetadataKey, 'focusLog'>;
  label: string;
}> = [
  { key: 'preferred_name', label: 'Preferred name' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'grade_or_age', label: 'Grade or age' },
  { key: 'emergency_name', label: 'Emergency contact' },
  { key: 'emergency_phone', label: 'Emergency phone' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'health_conditions', label: 'Health conditions' },
];

export const PARENT_DETAIL_FIELDS: Array<{ key: ParentMetadataKey; label: string }> = [
  { key: 'relationship', label: 'Relationship' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'preferred_contact', label: 'Preferred contact' },
  { key: 'notes', label: 'Notes' },
];

export const TEACHER_ONLY_STUDENT_KEYS: StudentMetadataKey[] = [
  'allergies',
  'health_conditions',
  'notes',
  'emergency_name',
  'emergency_phone',
  'phone',
  'email',
  'address',
  'grade_or_age',
];

export function isTeacherOnlyStudentKey(key: string): boolean {
  return (TEACHER_ONLY_STUDENT_KEYS as string[]).includes(key);
}

export function metaString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function setMetaKey(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
  value: string | null,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };
  const trimmed = value?.trim() ?? '';
  if (!trimmed) delete next[key];
  else next[key] = trimmed;
  return next;
}

/** Build metadata patch from optional field drafts. Birthday uses birthdayForSave. */
export function applyStudentOptionalDraft(
  metadata: Record<string, unknown> | null | undefined,
  draft: Record<string, string>,
  fields: Array<{ key: string }> = STUDENT_OFFICE_OPTIONAL_FIELDS,
): { ok: true; metadata: Record<string, unknown> } | { ok: false; error: string } {
  let next = { ...(metadata ?? {}) };
  for (const field of fields) {
    const raw = draft[field.key] ?? '';
    if (field.key === 'birthday') {
      const stored = metaString(metadata, 'birthday');
      if (birthdayUnchanged(raw, stored)) continue;
      const result = birthdayForSave(raw);
      if (!result.ok) return result;
      next = setMetaKey(next, field.key, result.value);
    } else {
      next = setMetaKey(next, field.key, raw);
    }
  }
  return { ok: true, metadata: next };
}

export function studentOptionalDraftFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  fields: Array<{ key: string }> = STUDENT_OFFICE_OPTIONAL_FIELDS,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of fields) {
    const stored = metaString(metadata, field.key) ?? '';
    next[field.key] = field.key === 'birthday' ? coerceBirthdayISO(stored) ?? stored : stored;
  }
  return next;
}

export function studentOptionalHasValues(draft: Record<string, string>): boolean {
  return STUDENT_OFFICE_OPTIONAL_FIELDS.some((field) => (draft[field.key] ?? '').trim());
}

export function relationshipLabel(metadata: Record<string, unknown> | null | undefined): string | null {
  const rel = metaString(metadata, 'relationship');
  if (!rel) return null;
  if (rel === 'other') return metaString(metadata, 'relationship_other') ?? 'Other';
  if (rel === 'mother') return 'Mother';
  if (rel === 'father') return 'Father';
  if (rel === 'guardian') return 'Guardian';
  return rel;
}

const STUDENT_FIELD_ALIASES: Record<string, Exclude<StudentMetadataKey, 'focusLog'>> = {
  preferred_name: 'preferred_name',
  'preferred name': 'preferred_name',
  nickname: 'preferred_name',
  birthday: 'birthday',
  'date of birth': 'birthday',
  dob: 'birthday',
  grade_or_age: 'grade_or_age',
  grade: 'grade_or_age',
  age: 'grade_or_age',
  'grade or age': 'grade_or_age',
  phone: 'phone',
  telephone: 'phone',
  email: 'email',
  address: 'address',
  emergency_name: 'emergency_name',
  'emergency contact': 'emergency_name',
  'emergency name': 'emergency_name',
  emergency_phone: 'emergency_phone',
  'emergency phone': 'emergency_phone',
  allergies: 'allergies',
  allergy: 'allergies',
  health_conditions: 'health_conditions',
  'health conditions': 'health_conditions',
  health: 'health_conditions',
  notes: 'notes',
  note: 'notes',
};

const PARENT_FIELD_ALIASES: Record<string, ParentMetadataKey> = {
  relationship: 'relationship',
  phone: 'phone',
  telephone: 'phone',
  email: 'email',
  address: 'address',
  preferred_contact: 'preferred_contact',
  'preferred contact': 'preferred_contact',
  notes: 'notes',
  note: 'notes',
};

export type MappedField = { key: string; label: string; value: string; canonical: boolean };

export function mapClassifierFields(
  fields: Array<{ label: string; value: string }>,
  kind: 'student' | 'parent',
): MappedField[] {
  const aliases = kind === 'student' ? STUDENT_FIELD_ALIASES : PARENT_FIELD_ALIASES;
  const notes: string[] = [];
  const mapped: MappedField[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    const label = field.label.trim();
    const value = field.value.trim();
    if (!label || !value) continue;
    const key = aliases[label.toLowerCase()];
    if (key && !seen.has(key)) {
      seen.add(key);
      const pretty = (kind === 'student' ? STUDENT_DETAIL_FIELDS : PARENT_DETAIL_FIELDS).find(
        (row) => row.key === key,
      )?.label ?? label;
      mapped.push({ key, label: pretty, value, canonical: true });
    } else {
      notes.push(`${label}: ${value}`);
    }
  }
  if (notes.length) {
    mapped.push({ key: 'notes', label: 'Notes', value: notes.join('\n'), canonical: false });
  }
  return mapped;
}
