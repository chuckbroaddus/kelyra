/**
 * CAL-P6 named laws (Chuck send 1A 3A 4A 5C 6B 8A 9A 10B).
 * SoT: notes/company/calendar-p6-pm-lock.md · calendar-p6-intent.md
 * Look KEEP: Set B hanging-ledger (PR 151).
 */

/** CAL-P6-01 — locked stance letters only. */
export const CAL_P6_STANCES = ['1A', '3A', '4A', '5C', '6B', '8A', '9A', '10B'] as const;

/** CAL-P6-1A — full-band drum claim; no on-drum leading carve. */
export const CAL_P6_1A_FULL_BAND = 'CAL-P6-1A' as const;
/** On-drum left carve dropped (was CAL-3DW-12 ~20–24px). Off-row edge pop KEEP. */
export const CAL_P6_1A_ON_DRUM_CARVE_PX = 0;

/** CAL-P6-3A — tap-down drill; phone pinch-out / web `<` climb one level. */
export const CAL_P6_3A_HIERARCHY = 'CAL-P6-3A' as const;

/** CAL-P6-4A — Single Day always mounts hour gutter/track. */
export const CAL_P6_4A_ALWAYS_HOURS = 'CAL-P6-4A' as const;

/** CAL-P6-5C — Day List mounts drum; shared listAnchorDay lockstep. */
export const CAL_P6_5C_LIST_ANCHOR = 'CAL-P6-5C' as const;

/** CAL-P6-6B — Month List soft rubber-band then commit adjacent month. */
export const CAL_P6_6B_SOFT_BOUNDARY = 'CAL-P6-6B' as const;
/** Overscroll past this (pt) after rubber → month commit. */
export const CAL_P6_6B_COMMIT_OVERSCROLL_PX = 56;

/** CAL-P6-8A — drum pinned; PersonTabs hide/show with tray. */
export const CAL_P6_8A_PIN_DRUM = 'CAL-P6-8A' as const;

/** CAL-P6-9A — leave via start outside drum; forward restores Calendar. */
export const CAL_P6_9A_STACK_RESTORE = 'CAL-P6-9A' as const;

/** CAL-P6-10B — empty hour slot → Add Event immediately (no confirm). */
export const CAL_P6_10B_SLOT_CREATE = 'CAL-P6-10B' as const;

/** Default timed event length when creating from an hour slot (minutes). */
export const CAL_P6_10B_DEFAULT_DURATION_MIN = 60;
