/** Family-safe Submitted stamp — submissions.submitted_at only; never approved_at. */
export function familySubmittedAt(submittedAt: string | null | undefined): string | null {
  if (submittedAt == null) return null;
  const trimmed = submittedAt.trim();
  return trimmed ? trimmed : null;
}
