/** Homework shutter. Hidden on Messages so a group photo cannot run portrait cutout. */
export function showHeaderCapture(pathname: string, role: string): boolean {
  return role === 'teacher' && !pathname.startsWith('/messages');
}
