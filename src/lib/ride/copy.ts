import { formatCheckInSuccess, RIDE_FAIL_MESSAGE } from './plate.ts';

export function parentCheckInMessage(result: { ok?: boolean; message?: string; position_xx?: number | null }): string {
  if (!result?.ok) return RIDE_FAIL_MESSAGE;
  if (typeof result.position_xx === 'number') return formatCheckInSuccess(result.position_xx);
  if (typeof result.message === 'string' && result.message.startsWith('Check in successful')) {
    return result.message;
  }
  return RIDE_FAIL_MESSAGE;
}

export function nudgeCopy(): string {
  // No neighbor plates / names
  return 'Your line is moving — please check in when you arrive.';
}
