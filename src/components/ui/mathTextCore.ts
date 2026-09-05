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

/** Native WebView height floor / ceiling — never leave a blank 2000px slab. */
export const NATIVE_WEBVIEW_MIN_HEIGHT = 20;
export const NATIVE_WEBVIEW_HEIGHT_CAP = 1200;

/**
 * Clamp a postMessage height from the prose WebView.
 * Invalid / non-positive → null (caller falls back to Text, never a blank slab).
 */
export function clampNativeWebViewHeight(height: unknown): number | null {
  if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) return null;
  const h = Math.ceil(height);
  if (h < NATIVE_WEBVIEW_MIN_HEIGHT) return NATIVE_WEBVIEW_MIN_HEIGHT;
  if (h > NATIVE_WEBVIEW_HEIGHT_CAP) return NATIVE_WEBVIEW_HEIGHT_CAP;
  return h;
}

/** True when prose HTML includes at least one mounted KaTeX span (not source fallback). */
export function proseHtmlHasMountedKatex(bodyHtml: string): boolean {
  return /class="katex"/.test(bodyHtml);
}

export function segmentHasMath(segments: MathSegment[]): boolean {
  return segments.some((s) => s.kind === 'inline' || s.kind === 'display');
}

/** Prose block model for paragraph / list / display layout (MATHUI). */
export type ProseBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'display'; raw: string };

const ORDERED_RE = /^(\d+)\.\s+(.*)$/;
const BULLET_RE = /^[-*]\s+(.*)$/;

/**
 * Re-wrap inline tex with `\(...\)` so a later splitMathSegments round-trip works.
 * Display is emitted as its own prose block instead.
 */
function expandParagraphPieces(text: string): ProseBlock[] {
  const segs = splitMathSegments(text);
  const out: ProseBlock[] = [];
  let buf = '';
  const flush = () => {
    if (buf.length) {
      out.push({ kind: 'paragraph', text: buf });
      buf = '';
    }
  };
  for (const seg of segs) {
    if (seg.kind === 'display') {
      flush();
      out.push({ kind: 'display', raw: seg.raw });
    } else if (seg.kind === 'inline') {
      buf += `${BS}(${seg.raw}${BS})`;
    } else {
      buf += seg.raw;
    }
  }
  flush();
  return out;
}

/**
 * Split model text into paragraph | list | display-math blocks.
 * Line-based lists: `^\d+\. ` and `^[-*] `. Blank lines separate blocks.
 * Display `$$` / `\[...\]` inside a paragraph become their own display blocks.
 */
export function splitProseBlocks(text: string): ProseBlock[] {
  if (!text) return [{ kind: 'paragraph', text: '' }];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ProseBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    while (i < lines.length && lines[i]!.trim() === '') i++;
    if (i >= lines.length) break;

    const line = lines[i]!;

    if (ORDERED_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i]!.match(ORDERED_RE);
        if (!m) break;
        items.push(m[2]!);
        i++;
      }
      if (items.length) blocks.push({ kind: 'list', ordered: true, items });
      continue;
    }

    if (BULLET_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i]!.match(BULLET_RE);
        if (!m) break;
        items.push(m[1]!);
        i++;
      }
      if (items.length) blocks.push({ kind: 'list', ordered: false, items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== '') {
      if (ORDERED_RE.test(lines[i]!) || BULLET_RE.test(lines[i]!)) break;
      paraLines.push(lines[i]!);
      i++;
    }
    const para = paraLines.join('\n');
    for (const piece of expandParagraphPieces(para)) {
      blocks.push(piece);
    }
  }

  return blocks.length ? blocks : [{ kind: 'paragraph', text: '' }];
}

/** Escape text for insertion into an HTML document we control (native prose WebView). */
export function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build safe HTML for one inline run (text + inline math only).
 * Display segments become block divs mid-stream (caller usually peels them first).
 */
export function renderInlineHtml(text: string): string {
  const segs = splitMathSegments(text);
  let html = '';
  for (const seg of segs) {
    if (seg.kind === 'text') {
      html += escapeHtmlText(seg.raw);
      continue;
    }
    const displayMode = seg.kind === 'display';
    const katexHtml = renderKatexHtml(seg.raw, displayMode);
    if (!katexHtml) {
      const fallback = displayMode ? `$$${seg.raw}$$` : `$${seg.raw}$`;
      html += escapeHtmlText(fallback);
      continue;
    }
    if (displayMode) {
      html += `<div class="kelyra-math-display">${katexHtml}</div>`;
    } else {
      html += `<span class="kelyra-math-inline">${katexHtml}</span>`;
    }
  }
  return html;
}

/** Build body HTML for a full bubble (lists + paragraphs + display). Text escaped; math = KaTeX only. */
export function renderProseBodyHtml(blocks: ProseBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.kind === 'paragraph') {
      parts.push(`<p class="kelyra-prose-p">${renderInlineHtml(block.text)}</p>`);
    } else if (block.kind === 'display') {
      const katexHtml = renderKatexHtml(block.raw, true);
      if (katexHtml) {
        parts.push(`<div class="kelyra-math-display">${katexHtml}</div>`);
      } else {
        parts.push(`<p class="kelyra-prose-p">${escapeHtmlText(`$$${block.raw}$$`)}</p>`);
      }
    } else {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items
        .map((item) => `<li>${renderInlineHtml(item)}</li>`)
        .join('');
      parts.push(`<${tag} class="kelyra-prose-list">${items}</${tag}>`);
    }
  }
  return parts.join('');
}
