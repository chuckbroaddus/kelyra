/**
 * Pure roster-photo suggestion builder (no network). Rough phone photos make the
 * vision model guess, so when the read is low-confidence every suggestion starts
 * unchecked and the teacher opts names in.
 */
export type RosterExtractRow = { name?: string; confident?: boolean };

export type RosterExtractPayload = {
  names?: RosterExtractRow[];
  rejected?: boolean;
  document_kind_guess?: string;
  low_confidence?: boolean;
};

export type SuggestedRosterName = {
  key: string;
  name: string;
  selected: boolean;
  alreadyHere: boolean;
};

/** Share of not-confident rows at or above which the whole list starts unchecked. */
export const LOW_CONFIDENCE_SHARE = 0.4;

export function normalizeRosterName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isLowConfidenceRoster(data: RosterExtractPayload): boolean {
  if (data.low_confidence === true) return true;
  const rows = data.names ?? [];
  if (!rows.length) return false;
  const unsure = rows.filter((row) => row.confident === false).length;
  return unsure / rows.length >= LOW_CONFIDENCE_SHARE;
}

export function buildRosterSuggestions(
  data: RosterExtractPayload,
  existingNames: string[],
): SuggestedRosterName[] {
  if (data.rejected || data.document_kind_guess === 'not_roster') return [];
  const lowConfidence = isLowConfidenceRoster(data);
  const existing = new Set(existingNames.map((name) => normalizeRosterName(name)));
  const seen = new Set<string>();
  const suggestions: SuggestedRosterName[] = [];
  for (const row of data.names ?? []) {
    const name = String(row.name ?? '').replace(/\s+/g, ' ').trim();
    const key = normalizeRosterName(name);
    if (!name || !key || seen.has(key)) continue;
    // Drop obvious header/junk lines the model sometimes returns.
    if (/^(present|absent|period\s*\d+|room\s*\d+|mr\.?\s|ms\.?\s|mrs\.?\s|dr\.?\s)/i.test(name)) {
      continue;
    }
    seen.add(key);
    const alreadyHere = existing.has(key);
    suggestions.push({
      key,
      name,
      selected: !alreadyHere && !lowConfidence && row.confident !== false,
      alreadyHere,
    });
  }
  return suggestions;
}
