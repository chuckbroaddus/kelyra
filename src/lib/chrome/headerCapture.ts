/**
 * Header Open Capture (Stamp 7). Spoken name Open Capture. Route /capture.
 * Every signed-in seat. Hidden on Messages and while Search is open (Search hide is AppHeader).
 * Office seats also hide on My children (/parent with office chrome still up).
 * Photograph grant is seat-based — not matrix capture.use.
 */
const SIGNED_IN = new Set([
  'superintendent',
  'administrator',
  'teacher',
  'parent',
  'student',
]);

export function showHeaderCapture(pathname: string, role: string): boolean {
  if (!SIGNED_IN.has(role)) return false;
  if (pathname.startsWith('/messages')) return false;
  // My children keeps office chrome; hide the office shutter there (AC-SC-11).
  if (
    (role === 'superintendent' || role === 'administrator') &&
    pathname.startsWith('/parent')
  ) {
    return false;
  }
  return true;
}
