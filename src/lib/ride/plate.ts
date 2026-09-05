/** Normalize plate for match: uppercase, strip spaces/hyphens/punctuation. */
export function plateNorm(raw: string | null | undefined): string {
  return String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function vehicleValidOn(
  kind: 'today' | 'range' | 'indefinite',
  validFrom: string | null | undefined,
  validTo: string | null | undefined,
  on: string,
): boolean {
  if (kind === 'indefinite') return true;
  if (kind === 'today') return Boolean(validFrom) && validFrom === on;
  if (kind === 'range') {
    return Boolean(validFrom && validTo && on >= validFrom && on <= validTo);
  }
  return false;
}

export const RIDE_SUCCESS_PREFIX = 'Check in successful, you are ';
export const RIDE_SUCCESS_SUFFIX = ' vehicle in line';
export const RIDE_FAIL_MESSAGE = 'Check in failed';

export function formatCheckInSuccess(xx: number): string {
  return `${RIDE_SUCCESS_PREFIX}${xx}${RIDE_SUCCESS_SUFFIX}`;
}

/** Parent DTO must never include total / neighbor plates / restriction reason. */
export function assertParentTripSafe(dto: Record<string, unknown>): void {
  const banned = ['total', 'neighbor', 'reason', 'plates', 'queue_total'];
  const keys = Object.keys(dto).map((k) => k.toLowerCase());
  for (const b of banned) {
    if (keys.includes(b)) throw new Error(`parent trip DTO leaks ${b}`);
  }
  if (typeof dto.message === 'string') {
    if (/\bof\s+\d+/i.test(dto.message)) throw new Error('success copy must not include of N');
    if (/reason|restrict|blacklist|denied because/i.test(dto.message) && dto.message !== RIDE_FAIL_MESSAGE) {
      throw new Error('fail copy must not include reason');
    }
  }
}
