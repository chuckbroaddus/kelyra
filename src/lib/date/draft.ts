/**
 * Pure draft lifecycle for DateInput.
 * Cancel restores committed; Clear writes null. Commit only on Done / day-click / parse.
 */

export type DateDraft = {
  committed: string | null;
  draft: string | null;
  open: boolean;
};

export function emptyDraft(committed: string | null = null): DateDraft {
  return { committed, draft: committed, open: false };
}

export function openDateDraft(state: DateDraft, smartDefault: string): DateDraft {
  return {
    committed: state.committed,
    draft: state.committed ?? smartDefault,
    open: true,
  };
}

export function changeDateDraft(state: DateDraft, draft: string): DateDraft {
  if (!state.open) return state;
  return { ...state, draft };
}

export function cancelDateDraft(state: DateDraft): DateDraft {
  return { committed: state.committed, draft: state.committed, open: false };
}

/** Clear commits null immediately (not Cancel). */
export function clearDateDraft(state: DateDraft): DateDraft {
  return { committed: null, draft: null, open: false };
}

export function commitDateDraft(state: DateDraft): DateDraft {
  return { committed: state.draft, draft: state.draft, open: false };
}

export function syncCommitted(state: DateDraft, committed: string | null): DateDraft {
  if (state.open) return { ...state, committed };
  return { committed, draft: committed, open: false };
}
