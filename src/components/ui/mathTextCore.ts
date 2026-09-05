/**
 * Pure tokenize + KaTeX render helpers for MathText.
 * Model blobs are never mounted as HTML — only KaTeX output of math spans.
 */
import katex from 'katex';

export type MathSegment =
  | { kind: 'text'; raw: string }
  | { kind: 'inline'; raw: string }
  | { kind: 'display'; raw: string };

/** Locked KaTeX options (S1-02/04/05). Pass a fresh `macros: {}` per call. */
export const KATEX_BASE_OPTIONS = {
  trust: false as const,
  throwOnError: false as const,
  maxSize: 20,
  maxExpand: 1000,
  output: 'htmlAndMathml' as const,
};

const BS = '\\';

/**
 * Split `$...$` `$$...$$` `\(...\)` `\[...\]`.
 * Unmatched openers stay as text (original source shown). Nested `$` inside `$$` not required.
 */
export function splitMathSegments(text: string): MathSegment[] {
  if (!text) return [{ kind: 'text', raw: '' }];
  const out: MathSegment[] = [];
  let i = 0;
  const n = text.length;

  const pushText = (raw: string) => {
    if (!raw) return;
    const last = out[out.length - 1];
    if (last?.kind === 'text') last.raw += raw;
    else out.push({ kind: 'text', raw });
  };


  while (i < n) {
    // $$...$$
    if (text.startsWith('$$', i)) {
      const end = text.indexOf('$$', i + 2);
      if (end === -1) {
        pushText(text.slice(i));
        break;
      }
      out.push({ kind: 'display', raw: text.slice(i + 2, end) });
      i = end + 2;
      continue;
    }

    // \[...\]
    if (text.startsWith(BS + '[', i)) {
      const close = BS + ']';
      const end = text.indexOf(close, i + 2);
      if (end === -1) {
        pushText(text.slice(i));
        break;
      }
      out.push({ kind: 'display', raw: text.slice(i + 2, end) });
      i = end + close.length;
      continue;
    }

    // \(...\)
    if (text.startsWith(BS + '(', i)) {
      const close = BS + ')';
      const end = text.indexOf(close, i + 2);
      if (end === -1) {
        pushText(text.slice(i));
        break;
      }
      out.push({ kind: 'inline', raw: text.slice(i + 2, end) });
      i = end + close.length;
      continue;
    }

    // $...$
    if (text[i] === '$') {
      const end = text.indexOf('$', i + 1);
      if (end === -1) {
        pushText(text.slice(i));
        break;
      }
      out.push({ kind: 'inline', raw: text.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    let next = n;
    const markers = ['$$', '$', BS + '[', BS + '('];
    for (const m of markers) {
      const at = text.indexOf(m, i);
      if (at !== -1 && at < next) next = at;
    }
    pushText(text.slice(i, next));
    i = next;
  }

  return out.length ? out : [{ kind: 'text', raw: text }];
}

/** Trust-gated / HTML-extension commands — never mount (S1-07). Show source Text instead. */
const TRUST_GATED = /\\(includegraphics|htmlClass|htmlId|htmlStyle|href|url)\b/;

/** Render one math span. Returns null on failure → caller shows Text(raw). */
export function renderKatexHtml(tex: string, displayMode: boolean): string | null {
  const trimmed = tex.trim();
  if (!trimmed) return null;
  // Refuse to mount spans that invoke trust-gated commands (even as error annotations).
  if (TRUST_GATED.test(trimmed)) return null;
  try {
    const html = katex.renderToString(trimmed, {
      ...KATEX_BASE_OPTIONS,
      displayMode,
      macros: {},
    });
    // S1-04/07: never mount error HTML or payloads that still echo unsafe URLs
    if (!html || html.includes('katex-error')) return null;
    if (/javascript:/i.test(html) || /data:\s*text\/html/i.test(html)) return null;
    if (/<img\b/i.test(html)) return null;
    return html;
  } catch {
    return null;
  }
}

export function segmentHasMath(segments: MathSegment[]): boolean {
  return segments.some((s) => s.kind === 'inline' || s.kind === 'display');
}
