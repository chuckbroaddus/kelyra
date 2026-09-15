/** Pure draft-work checks — safe for unit tests without Supabase/RN. */

export type DraftWorkShape = {
  gaps?: Array<{ label: string; sortOrder?: number }> | null;
  teacherNote?: string | null;
  draftScore?: number | null;
  studentName?: string | null;
  scoreMark?: string | null;
  method?: string | null;
  items?: unknown[] | null;
  pageAssetIds?: string[] | null;
};

/** True when the draft already has gap/score work — pageAssetIds alone are not work (batch mint). */
export function draftHasWork(draft: DraftWorkShape | null | undefined): boolean {
  return Boolean(
    draft &&
      (draft.gaps?.length ||
        draft.teacherNote ||
        draft.draftScore != null ||
        draft.studentName ||
        draft.scoreMark === 'pass' ||
        draft.scoreMark === 'fail' ||
        draft.method === 'key_score' ||
        (Array.isArray(draft.items) && draft.items.length > 0)),
  );
}
