import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  KATEX_BASE_OPTIONS,
  renderKatexHtml,
  renderProseBodyHtml,
  splitMathSegments,
  splitProseBlocks,
} from './mathTextCore.ts';

const root = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('LATEX-S1-02/05: locked KaTeX options trust false, caps', () => {
  assert.equal(KATEX_BASE_OPTIONS.trust, false);
  assert.equal(KATEX_BASE_OPTIONS.throwOnError, false);
  assert.ok(KATEX_BASE_OPTIONS.maxSize <= 20);
  assert.ok(KATEX_BASE_OPTIONS.maxExpand <= 1000);
});

test('LATEX-S1-03 / D-01: split frac and display', () => {
  const segs = splitMathSegments('half is $\\frac{1}{2}$ end');
  assert.equal(segs.length, 3);
  assert.deepEqual(segs[0], { kind: 'text', raw: 'half is ' });
  assert.equal(segs[1]!.kind, 'inline');
  assert.equal(segs[1]!.raw, '\\frac{1}{2}');
  assert.deepEqual(segs[2], { kind: 'text', raw: ' end' });

  const disp = splitMathSegments('$$x^2$$');
  assert.equal(disp.length, 1);
  assert.equal(disp[0]!.kind, 'display');
  assert.equal(disp[0]!.raw, 'x^2');
});

test('LATEX D-03: unmatched dollar shows as text source', () => {
  const segs = splitMathSegments('bad $frac');
  assert.equal(segs.length, 1);
  assert.equal(segs[0]!.kind, 'text');
  assert.equal(segs[0]!.raw, 'bad $frac');
});

test('LATEX delimiters paren and bracket forms', () => {
  const inline = splitMathSegments('a \\(b\\) c');
  assert.equal(inline[1]!.kind, 'inline');
  assert.equal(inline[1]!.raw, 'b');
  const block = splitMathSegments('\\[E=mc^2\\]');
  assert.equal(block[0]!.kind, 'display');
  assert.equal(block[0]!.raw, 'E=mc^2');
});

test('LATEX-S1-01: no whole-blob innerHTML on Explain/Ask/Help', () => {
  const mathText = read('src/components/ui/MathText.tsx');
  const mathWeb = read('src/components/ui/MathText.web.tsx');
  const explain = read('src/components/ui/ExplainDraftCard.tsx');
  const ask = read('src/app/ask.tsx');
  const help = read('src/app/todo/[submissionId].tsx');

  assert.match(explain, /MathText/);
  assert.match(ask, /MathText/);
  assert.match(help, /MathText/);
  assert.doesNotMatch(explain, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(ask, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(help, /dangerouslySetInnerHTML/);

  assert.match(mathWeb, /dangerouslySetInnerHTML:\s*\{\s*__html:\s*html\s*\}/);
  assert.doesNotMatch(mathWeb, /dangerouslySetInnerHTML:\s*\{\s*__html:\s*(source|children|seg\.raw)/);
  assert.doesNotMatch(mathText, /dangerouslySetInnerHTML/);
});

test('LATEX-S1-02 source: trust false always', () => {
  const core = read('src/components/ui/mathTextCore.ts');
  assert.match(core, /trust:\s*false/);
  assert.doesNotMatch(core, /trust:\s*true/);
});

test('LATEX-S1-04/X-03: parse error returns null, no throw', () => {
  const html = renderKatexHtml('\\notacommand{{{', false);
  assert.equal(html, null);
  assert.doesNotThrow(() => renderKatexHtml('\\frac{', true));
});

test('LATEX-S1-07 / X-02: htmlClass href includegraphics inert', () => {
  assert.equal(renderKatexHtml('\\htmlClass{evil}{x}', false), null);
  assert.equal(renderKatexHtml('\\href{javascript:alert(1)}{x}', false), null);
  assert.equal(renderKatexHtml('\\includegraphics{http://evil.example/x.png}', false), null);
});

test('LATEX XSS: script tag in body stays text segment', () => {
  const segs = splitMathSegments('<script>alert(1)</script> and $\\frac{1}{2}$');
  assert.equal(segs[0]!.kind, 'text');
  assert.match(segs[0]!.raw, /<script>alert\(1\)<\/script>/);
  const frac = renderKatexHtml('\\frac{1}{2}', false);
  assert.ok(frac);
  assert.match(frac!, /katex/);
  assert.doesNotMatch(frac!, /<script/i);
});

test('LATEX D-04: Ask Help ExplainDraftCard import MathText', () => {
  assert.match(read('src/app/ask.tsx'), /from '@\/components\/ui\/MathText'/);
  assert.match(read('src/app/todo/[submissionId].tsx'), /from '@\/components\/ui\/MathText'/);
  assert.match(read('src/components/ui/ExplainDraftCard.tsx'), /from '@\/components\/ui\/MathText'/);
});

test('LATEX H-01: G0 refuse path unchanged', () => {
  const ask = read('src/app/ask.tsx');
  assert.match(ask, /GAUTH_REFUSAL_TITLE/);
  assert.match(ask, /item\.text\.startsWith\(GAUTH_REFUSAL_TITLE\)/);
  assert.match(ask, /<Text style=\{\[type\.section/);
});

test('LATEX S1-06 native WebView guards', () => {
  const native = read('src/components/ui/MathText.tsx');
  assert.match(native, /originWhitelist/);
  assert.match(native, /onShouldStartLoadWithRequest/);
  assert.match(native, /injectedJavaScript=\{undefined\}/);
  assert.doesNotMatch(native, /file:/);
});

test('LATEX frac renders katex HTML on success', () => {
  const html = renderKatexHtml('\\frac{1}{2}', false);
  assert.ok(html);
  assert.match(html!, /frac|mfrac|katex/);
});

// --- MATHUI L-01…L-06 ---

test('MATHUI L-01: web inline math uses p/span flow, not flex-wrap row', () => {
  const mathWeb = read('src/components/ui/MathText.web.tsx');
  assert.doesNotMatch(mathWeb, /flexDirection:\s*['"]row['"]/);
  assert.doesNotMatch(mathWeb, /flexWrap:\s*['"]wrap['"]/);
  assert.match(mathWeb, /createElement\(\s*['"]p['"]/);
  assert.match(mathWeb, /kelyra-math-inline/);
  assert.match(mathWeb, /verticalAlign:\s*['"]baseline['"]|vertical-align:\s*baseline/);
});

test('MATHUI L-02: display math is its own block', () => {
  const blocks = splitProseBlocks('Let x be given.\n\n$$x^2+1$$\n\nDone.');
  assert.ok(blocks.some((b) => b.kind === 'display' && b.raw.includes('x^2')));
  assert.ok(blocks.some((b) => b.kind === 'paragraph' && b.text.includes('Let x')));
  const mathWeb = read('src/components/ui/MathText.web.tsx');
  assert.match(mathWeb, /kelyra-math-display/);
  assert.match(mathWeb, /overflowX:\s*['"]auto['"]|overflow-x:\s*auto/);
});

test('MATHUI L-03: numbered list markers share one column (split + ol)', () => {
  const blocks = splitProseBlocks('Steps:\n\n1. First $a$\n2. Second\n3. Third');
  const list = blocks.find((b) => b.kind === 'list');
  assert.ok(list);
  assert.equal(list!.kind, 'list');
  if (list!.kind === 'list') {
    assert.equal(list.ordered, true);
    assert.equal(list.items.length, 3);
    assert.match(list.items[0]!, /First/);
    assert.equal(list.items[1], 'Second');
    assert.equal(list.items[2], 'Third');
  }
  const mathWeb = read('src/components/ui/MathText.web.tsx');
  assert.match(mathWeb, /['"]ol['"]/);
  assert.match(mathWeb, /listStylePosition:\s*['"]outside['"]|list-style-position:\s*outside/);
  const native = read('src/components/ui/MathText.tsx');
  assert.match(native, /width:\s*28/);
  assert.match(native, /listRow/);
});

test('MATHUI L-04: same renderer on Explain / Help / notes', () => {
  assert.match(read('src/app/ask.tsx'), /from '@\/components\/ui\/MathText'/);
  assert.match(read('src/app/todo/[submissionId].tsx'), /from '@\/components\/ui\/MathText'/);
  assert.match(read('src/components/ui/ExplainDraftCard.tsx'), /from '@\/components\/ui\/MathText'/);
  assert.match(read('src/app/class/[id]/student/[studentId].tsx'), /from '@\/components\/ui\/MathText'/);
  assert.match(read('src/app/class/[id]/student/[studentId].tsx'), /teacher_note/);
});

test('MATHUI L-05 / LATEX XSS P0 still pass via prose HTML', () => {
  const blocks = splitProseBlocks('1. <script>alert(1)</script>\n2. ok $\\frac{1}{2}$');
  const html = renderProseBodyHtml(blocks);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /katex/);
  assert.equal(renderKatexHtml('\\href{javascript:alert(1)}{x}', false), null);
});

test('MATHUI L-06: Student G0 / parent co-teacher walls unchanged', () => {
  const ask = read('src/app/ask.tsx');
  assert.match(ask, /GAUTH_REFUSAL_TITLE/);
  assert.match(ask, /item\.text\.startsWith\(GAUTH_REFUSAL_TITLE\)/);
  // Refusal still uses Text, not MathText
  assert.match(ask, /GAUTH_REFUSAL_TITLE[\s\S]*?<Text style=\{\[type\.section/);
});

test('MATHUI prose: bullet list split', () => {
  const blocks = splitProseBlocks('- alpha\n- beta with $x$');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]!.kind, 'list');
  if (blocks[0]!.kind === 'list') {
    assert.equal(blocks[0].ordered, false);
    assert.equal(blocks[0].items.length, 2);
  }
});

test('MATHUI prose: native one WebView per bubble when math present', () => {
  const native = read('src/components/ui/MathText.tsx');
  assert.match(native, /one offline WebView per bubble|ProseWebView/);
  assert.match(native, /renderProseBodyHtml/);
  // Must not create MathWebSpan-per-segment pattern
  assert.doesNotMatch(native, /function MathWebSpan/);
});
