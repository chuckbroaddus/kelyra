#!/usr/bin/env node
/**
 * Pull speaker notes + slide text from a .pptx. Does not copy the PPT.
 *
 *   node scripts/extract-pptx.mjs path/to/deck.pptx [--out dir]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';

const args = process.argv.slice(2);
const pptx = args.find((a) => a.endsWith('.pptx'));
if (!pptx) {
  console.error('usage: node scripts/extract-pptx.mjs file.pptx [--out dir]');
  process.exit(1);
}
const outFlag = args.indexOf('--out');
const outDir =
  outFlag >= 0
    ? args[outFlag + 1]
    : join('notes/teacher-decks/from-pptx', basename(pptx, extname(pptx)));

const tmp = mkdtempSync(join(tmpdir(), 'kelyra-pptx-'));
try {
  execFileSync('unzip', ['-qq', '-o', pptx, '-d', tmp]);
  const slidesDir = join(tmp, 'ppt', 'slides');
  const notesDir = join(tmp, 'ppt', 'notesSlides');
  const slides = readdirSync(slidesDir)
    .filter((name) => /^slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0));
  const parts = [];
  for (const name of slides) {
    const n = Number(name.match(/\d+/)?.[0] ?? 0);
    const xml = readFileSync(join(slidesDir, name), 'utf8');
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => decode(m[1])).filter(Boolean);
    let notes = '';
    const noteFile = join(notesDir, `notesSlide${n}.xml`);
    try {
      const noteXml = readFileSync(noteFile, 'utf8');
      notes = [...noteXml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
        .map((m) => decode(m[1]))
        .filter((t) => t && !/^slide \d+$/i.test(t))
        .join(' ');
    } catch {
      // no notes
    }
    parts.push({ n, text: texts.join(' '), notes });
  }
  mkdirSync(outDir, { recursive: true });
  const outline = parts
    .map((p) => `## Slide ${p.n}\n${p.text}${p.notes ? `\nNotes: ${p.notes}` : ''}`)
    .join('\n\n');
  writeFileSync(join(outDir, 'outline.txt'), `${outline}\n`);
  writeFileSync(join(outDir, 'slides.json'), `${JSON.stringify(parts, null, 2)}\n`);
  console.log(`wrote ${parts.length} slides to ${outDir} (PPT not copied)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

function decode(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
