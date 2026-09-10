import { formatCheckInSuccess, RIDE_FAIL_MESSAGE } from './plate.ts';

export const RIDE_LEAVE_FAIL_MESSAGE = 'Leave failed';

export function parentCheckInMessage(result: { ok?: boolean; message?: string; position_xx?: number | null }): string {
  if (!result?.ok) return RIDE_FAIL_MESSAGE;
  if (typeof result.position_xx === 'number') return formatCheckInSuccess(result.position_xx);
  if (typeof result.message === 'string' && result.message.startsWith('Check in successful')) {
    return result.message;
  }
  return RIDE_FAIL_MESSAGE;
}

/** Success: out of this line only — no XX, no total, no picked-up / released / checkout. */
export function parentLeaveSuccessMessage(lineName: string): string {
  const name = lineName.trim() || 'this line';
  return `You’re out of ${name}.`;
}

export function parentLeaveConfirmBody(childFirstNames: string[]): string {
  const names = childFirstNames.filter(Boolean);
  const who = names.length ? names.join(', ') : 'your children';
  return `You’ll stop waiting on this line for ${who}. You can check in again later. This is not pickup.`;
}

export function nudgeCopy(): string {
  // No neighbor plates / names
  return 'Your line is moving — please check in when you arrive.';
}
