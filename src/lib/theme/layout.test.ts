import assert from 'node:assert/strict';
import test from 'node:test';

import { isPhoneFormFactor, layoutBreakpoint } from './layoutBreakpoint.ts';

test('iPhone landscape (width ≥720) is phone-landscape, not tablet', () => {
  // Common handset landscape sizes — short side stays under 720.
  assert.equal(layoutBreakpoint(812, 375), 'phone-landscape');
  assert.equal(layoutBreakpoint(844, 390), 'phone-landscape');
  assert.equal(layoutBreakpoint(932, 430), 'phone-landscape');
  assert.equal(isPhoneFormFactor(812, 375), true);
  assert.equal(isPhoneFormFactor(932, 430), true);
});

test('iPhone portrait stays phone-portrait', () => {
  assert.equal(layoutBreakpoint(375, 812), 'phone-portrait');
  assert.equal(layoutBreakpoint(390, 844), 'phone-portrait');
  assert.equal(isPhoneFormFactor(375, 812), true);
});

test('tablet sizes stay tablet in both orientations', () => {
  assert.equal(layoutBreakpoint(1024, 768), 'tablet');
  assert.equal(layoutBreakpoint(768, 1024), 'tablet');
  assert.equal(isPhoneFormFactor(768, 1024), false);
  assert.equal(isPhoneFormFactor(820, 1180), false);
});

test('useLayout still keys showTopBar off width ≥720 and uses shortest-side phone (source contract)', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const dir = path.dirname(new URL(import.meta.url).pathname);
  const layoutSrc = fs.readFileSync(path.join(dir, 'layout.ts'), 'utf8');
  const bpSrc = fs.readFileSync(path.join(dir, 'layoutBreakpoint.ts'), 'utf8');
  assert.match(layoutSrc, /showTopBar\s*=\s*width\s*>=\s*720/);
  assert.match(layoutSrc, /isPhoneFormFactor/);
  assert.match(layoutSrc, /layoutBreakpoint/);
  assert.match(bpSrc, /Math\.min\(width,\s*height\)\s*<\s*720/);
});
