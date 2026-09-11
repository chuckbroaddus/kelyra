/**
 * KEYGRADE Approve wall — Teach seat only.
 * Parent seat / office / superintendent cannot Approve keyed drafts (CEO locks + Pack B).
 */
export type KeygradeApproveSeat =
  | 'teacher'
  | 'parent'
  | 'student'
  | 'administrator'
  | 'superintendent'
  | 'none'
  | string
  | null
  | undefined;

/** True only when active chrome seat is teacher. Dual-hat Parent seat must fail closed. */
export function canApproveKeygrade(seat: KeygradeApproveSeat): boolean {
  return seat === 'teacher';
}

export function keygradeApproveDeniedReason(seat: KeygradeApproveSeat): string | null {
  if (canApproveKeygrade(seat)) return null;
  if (seat === 'parent') return 'Parent seat cannot Approve keyed drafts. Switch to Teach.';
  if (seat === 'administrator' || seat === 'superintendent') {
    return 'Office and superintendent KEYGRADE Approve is out of v1.';
  }
  if (seat === 'student') return 'Students cannot Approve.';
  return 'Teach seat required to Approve.';
}
