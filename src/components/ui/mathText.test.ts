import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  KATEX_BASE_OPTIONS,
  renderKatexHtml,
  splitMathSegments,
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
