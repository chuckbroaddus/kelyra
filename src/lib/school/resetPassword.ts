const NO_LOGIN = 'No login yet, create one from People.';
const SUCCESS = 'Password reset. They must change it at next sign-in.';

const WORD_A = [
  'amber',
  'cedar',
  'maple',
  'river',
  'stone',
  'willow',
  'harbor',
  'cinder',
  'lumen',
  'nimbus',
  'pollen',
  'quince',
  'sable',
  'thicket',
  'velvet',
  'coral',
];
const WORD_B = [
  'gate',
  'path',
  'hall',
  'yard',
  'lane',
  'crest',
  'vale',
  'brook',
  'field',
  'grove',
  'ridge',
  'shore',
  'trail',
  'point',
  'haven',
  'glade',
];

export const RESET_PASSWORD_COPY = {
  action: 'Reset password',
  title: 'Reset password.',
  lead: (handle: string) =>
    `They will sign in with ${handle} and this password, then choose a new one.`,
  noLogin: NO_LOGIN,
  success: SUCCESS,
} as const;

type Actor = {
  id?: string | null;
  role?: string | null;
  also_administrator?: boolean | null;
} | null | undefined;
type Target = {
  id?: string | null;
  role?: string | null;
  also_administrator?: boolean | null;
} | null | undefined;

/** Same office wall as is_school_admin() / admin_create_login. Not class_teachers. Not is_staff. */
function isOfficeActor(actor: Actor): boolean {
  return actor?.role === 'superintendent' || actor?.role === 'administrator';
}

function isProtectedStaff(target: Target): boolean {
  if (!target?.role) return false;
  return target.role === 'superintendent' || target.role === 'administrator' || Boolean(target.also_administrator);
}

/** Office People / person account only. Teachers and your own row: omit. */
export function canShowOfficeReset(actor: Actor, target: Target): boolean {
  if (!isOfficeActor(actor)) return false;
  if (!target?.id) return false;
  if (actor?.id && actor.id === target.id) return false;
  if (actor?.role !== 'superintendent' && isProtectedStaff(target)) return false;
  return true;
}

/** Office People always opens the login card, including students and parents. */
export function peopleDirectoryPersonHref(profileId: string): string {
  return `/profile?person=${profileId}`;
}

/** Teachers bounce a student login to class Work. Office stays on /profile?person=. */
export function bounceStudentProfileToClass(actor: Actor): boolean {
  if (isOfficeActor(actor)) return false;
  return actor?.role === 'teacher';
}

export function hasLoginUsername(username: string | null | undefined): boolean {
  return Boolean(username && username.trim());
}

/** Ask must never reset auth passwords, including for staff. */
export function isAskPasswordToolDenied(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  return /password/.test(n) || n.includes('reset_login') || n === 'admin_reset_login_password';
}

function randInt(max: number): number {
  if (max <= 0) return 0;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0]! % max;
  }
  return Math.floor(Math.random() * max);
}

/** Pronounceable temp, 8+ characters. Shown once in the sheet. Do not log. */
export function generatePronounceableTemp(): string {
  const a = WORD_A[randInt(WORD_A.length)] ?? 'maple';
  const b = WORD_B[randInt(WORD_B.length)] ?? 'path';
  const n = 10 + randInt(90);
  const next = `${a}${n}${b}`;
  return next.length >= 8 ? next : `${next}kelyra`;
}

