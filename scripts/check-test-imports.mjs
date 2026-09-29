#!/usr/bin/env node
/**
 * Fail when a changed app module imports node:test or a test file.
 * The screen bundle cannot resolve node:test, and that overlay is not a product bug.
 *
 *   node scripts/check-test-imports.mjs --changed src/app/index.tsx src/lib/chrome/seat.ts
 */
import fs from 'node:fs';

const importPattern =
  /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function specsIn(source) {
  const found = [];
  for (const match of source.matchAll(importPattern)) {
    const spec = match[1] || match[2] || '';
    if (spec) found.push(spec);
  }
  return found;
}

function isAppModule(file) {
  if (!/\.(ts|tsx|js|mjs)$/.test(file)) return false;
  if (/\.test\.(ts|tsx|js|mjs)$/.test(file)) return false;
  return true;
}

function badSpec(spec) {
  return spec === 'node:test' || spec.includes('.test.') || spec.endsWith('.test');
}

const files = process.argv.slice(2).filter((arg) => arg !== '--changed');
let failed = false;
for (const file of files) {
  if (!isAppModule(file) || !fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const spec of specsIn(source)) {
    if (!badSpec(spec)) continue;
    process.stderr.write(`${file} imports ${spec}\n`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
