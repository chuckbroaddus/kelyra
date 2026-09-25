import { formatHandle, handleFromInput } from './roles.ts';

/** NEW-PERSON-VALIDATION: required fields, formats, and conflicts for People → New person. */
export type CreateLoginField = 'displayName' | 'username' | 'email' | 'password' | 'role';

export type CreateLoginDraft = {
  displayName: string;
  username: string;
  email: string;
  password: string;
  role: string | null;
};

export type ExistingLogin = {
  username?: string | null;
  email?: string | null;
  display_name?: string | null;
};

export type CreateLoginErrors = Partial<Record<CreateLoginField, string>>;

/** Order the fields appear on screen (first error wins the pop-up). */
export const CREATE_LOGIN_FIELDS: CreateLoginField[] = ['displayName', 'username', 'email', 'password', 'role'];

export const CREATE_LOGIN_LABELS: Record<CreateLoginField, string> = {
  displayName: 'Display name',
  username: 'Username',
  email: 'Email',
  password: 'Temporary password',
  role: 'Role',
};

/** Server keeps only a–z, 0–9, and _ (unique_username), 32 max. Reject anything it would rewrite. */
const USERNAME_RE = /^[a-z0-9_]{2,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
export const MIN_TEMP_PASSWORD = 6;

function key(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(raw.trim());
}

export function usernameProblem(raw: string): string | null {
  const trimmed = raw.trim();
  if (/\s/.test(trimmed)) return 'Username cannot contain spaces';
  const handle = handleFromInput(trimmed);
  if (handle.length < 2) return 'Username must be at least 2 characters';
  if (handle.length > 32) return 'Username must be 32 characters or fewer';
  if (!USERNAME_RE.test(handle)) return 'Username can use only letters, numbers, and _';
  return null;
}

export function validateCreateLogin(draft: CreateLoginDraft, existing: ExistingLogin[] = []): CreateLoginErrors {
  const errors: CreateLoginErrors = {};
  const required = (field: CreateLoginField, value: string) => {
    if (!value.trim()) errors[field] = `${CREATE_LOGIN_LABELS[field]} is required`;
  };
  required('displayName', draft.displayName);
  required('username', draft.username);
  required('email', draft.email);
  // Spaces-only counts as blank for a temporary password.
  required('password', draft.password);
  if (!draft.role) errors.role = 'Role is required';

  if (!errors.username) {
    const problem = usernameProblem(draft.username);
    if (problem) errors.username = problem;
  }
  if (!errors.email && !isValidEmail(draft.email)) errors.email = 'Enter a valid email address';
  if (!errors.password && draft.password.length < MIN_TEMP_PASSWORD) {
    errors.password = `Temporary password must be at least ${MIN_TEMP_PASSWORD} characters`;
  }

  const handle = handleFromInput(draft.username);
  const email = key(draft.email);
  const name = key(draft.displayName);
  if (!errors.username && existing.some((row) => key(row.username) === handle)) {
    errors.username = `${formatHandle(handle)} is already taken`;
  }
  if (!errors.email && existing.some((row) => key(row.email) === email)) {
    errors.email = 'That email is already registered';
  }
  if (!errors.displayName && existing.some((row) => key(row.display_name) === name)) {
    errors.displayName = `${draft.displayName.trim().replace(/\s+/g, ' ')} already exists`;
  }
  return errors;
}

export function firstCreateLoginError(errors: CreateLoginErrors): string | null {
  for (const field of CREATE_LOGIN_FIELDS) {
    if (errors[field]) return errors[field] ?? null;
  }
  return null;
}

/** Server wording back onto the field it belongs to (race: someone else took it first). */
export function fieldForServerError(message: string): CreateLoginField | null {
  const text = message.toLowerCase();
  if (text.includes('email')) return 'email';
  if (text.includes('username')) return 'username';
  if (text.includes('display name')) return 'displayName';
  if (text.includes('password')) return 'password';
  return null;
}
