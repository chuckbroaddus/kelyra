/**
 * JOURNAL-ATTACH: a web address typed or pasted into a Journal body becomes a link card.
 * The address stays in the saved body (no schema change); list rows hide the raw text
 * and show the card instead. Pure — safe for node tests.
 */
const HTTP_URL = /https?:\/\/[^\s<>"']+/gi;
const WWW_URL = /(^|\s)(www\.[^\s<>"']+)/gi;
const TRAILING = /[),.;!?]+$/;

/** Every distinct web address in the text, in order, normalized to https:// for bare www. */
export function diaryBodyUrls(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const url = raw.replace(TRAILING, '');
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  for (const m of text.matchAll(HTTP_URL)) push(m[0]);
  for (const m of text.matchAll(WWW_URL)) {
    const bare = m[2]!.replace(TRAILING, '');
    if (![...seen].some((u) => u.includes(bare))) push(`https://${bare}`);
  }
  return out;
}

/** Body text with the web addresses taken out (for list rows that show cards instead). */
export function diaryBodyWithoutUrls(text: string): string {
  return text
    .replace(HTTP_URL, (m) => m.replace(/^[^]*?([),.;!?]*)$/, '$1'))
    .replace(WWW_URL, (_m, lead: string, bare: string) => lead + bare.replace(/^[^]*?([),.;!?]*)$/, '$1'))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim();
}
