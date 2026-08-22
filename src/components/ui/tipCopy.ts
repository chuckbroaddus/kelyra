/** Hover copy only when it adds something the visible label does not already say. */
export function tipIfNew(visible: string | undefined, tip: string | null | undefined): string | undefined {
  const extra = tip?.trim();
  if (!extra) return undefined;
  const shown = visible?.trim();
  if (shown && shown.toLowerCase() === extra.toLowerCase()) return undefined;
  return extra;
}
