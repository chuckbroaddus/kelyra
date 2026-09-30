/**
 * periodGlyphs.test.ts
 * Unit tests for every period_model + SRS §5.10 acc 1-4.
 * Run: node --experimental-strip-types --test src/components/ui/periodGlyphs.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { glyphsForCalendar, type GradingCalendar, type PeriodModel } from './periodGlyphs.ts';

function makeCal(model: PeriodModel, scope: 'semester'|'year' = 'semester', periods: any[] = []): GradingCalendar {
  return {
    id: 'cal1', school_id: null, name: 'Test', level: 'high',
    period_model: model, periods, rollups: [], show_interims_in_filter: false, glyph_scope: scope,
  };
}

test('glyphsForCalendar returns All first always', () => {
  const c = makeCal('nine_weeks');
  const gs = glyphsForCalendar(c);
  assert.equal(gs.length > 0, true);
  assert.equal(gs[0].id, 'all');
  assert.equal(gs[0].sweepDeg, 360);
});

test('nine_weeks uses Q and S 90/180 per FR-03/07', () => {
  const c = makeCal('nine_weeks');
  const gs = glyphsForCalendar(c);
  const ids = gs.map(g => g.id);
  assert.deepEqual(ids, ['all','q1','q2','s1','q3','q4','s2']);
  const q1 = gs.find(g=>g.id==='q1')!;
  assert.equal(q1.startDeg, 180);
  assert.equal(q1.sweepDeg, 90);
  const s1 = gs.find(g=>g.id==='s1')!;
  assert.equal(s1.sweepDeg, 180);
});

test('six_weeks default semester scope uses 120° thirds FR-04 acc1', () => {
  const c = makeCal('six_weeks', 'semester');
  const gs = glyphsForCalendar(c);
  const ids = gs.map(g=>g.id);
  assert.deepEqual(ids, ['all','6w1','6w2','6w3','s1','6w4','6w5','6w6','s2']);
  const w1 = gs.find(g=>g.id==='6w1')!;
  assert.equal(w1.startDeg, 180); assert.equal(w1.sweepDeg, 120);
  const w2 = gs.find(g=>g.id==='6w2')!;
  assert.equal(w2.startDeg, 300); assert.equal(w2.sweepDeg, 120);
});

test('six_weeks year scope uses 60° sixths', () => {
  const c = makeCal('six_weeks', 'year');
  const gs = glyphsForCalendar(c);
  const w1 = gs.find(g=>g.id==='6wy1')!;
  assert.equal(w1.sweepDeg, 60);
});

test('trimester, semester, year, college per FR-07', () => {
  assert.deepEqual(glyphsForCalendar(makeCal('trimester')).map(g=>g.id), ['all','t1','t2','t3']);
  assert.deepEqual(glyphsForCalendar(makeCal('semester')).map(g=>g.id), ['all','s1','s2']);
  assert.deepEqual(glyphsForCalendar(makeCal('year')).map(g=>g.id), ['all','year']);
  assert.deepEqual(glyphsForCalendar(makeCal('college')).map(g=>g.id), ['all']);
});

test('custom equal sweep computed', () => {
  const c = makeCal('custom', 'semester', [
    {code:'P1', name:'P1', kind:'marking_period', sort_order:1, start_date:null, end_date:null, parent_id:null, id:'p1'},
    {code:'P2', name:'P2', kind:'marking_period', sort_order:2, start_date:null, end_date:null, parent_id:null, id:'p2'},
  ]);
  const gs = glyphsForCalendar(c);
  const p1 = gs.find(g=>g.id==='p1')!;
  assert.equal(p1.sweepDeg, 180);
});

test('acc 2: nine weeks no 6w', () => {
  const gs = glyphsForCalendar(makeCal('nine_weeks'));
  assert.equal(gs.some(g => g.id.startsWith('6w')), false);
});

test('acc 3: 6W1 selected only first 120', () => {
  const gs = glyphsForCalendar(makeCal('six_weeks'));
  const w1 = gs.find(g=>g.id==='6w1')!;
  assert.equal(w1.sweepDeg, 120);
});

test('acc 4: labels from calendar or upper', () => {
  const c = makeCal('six_weeks', 'semester', [
    {code:'6W1', name:'First six weeks', kind:'marking_period', sort_order:1, start_date:'2026-08-12', end_date:'2026-09-19', parent_id:null, id:'1'},
  ]);
  const gs = glyphsForCalendar(c);
  const w1 = gs.find(g=>g.id==='6w1')!;
  assert.equal(w1.label, 'First six weeks');
  assert.match(w1.dateRange, /08-12–09-19/);
});

test('storeCode uses calendar code', () => {
  const c = makeCal('nine_weeks', 'semester', [{code:'Q1', name:'Q1', kind:'marking_period', sort_order:0, start_date:null,end_date:null,parent_id:null,id:'q'}]);
  const gs = glyphsForCalendar(c);
  assert.equal(gs.find(g=>g.id==='q1')!.storeCode, 'Q1');
});

test('progress only when show_interims', () => {
  const c1 = makeCal('nine_weeks', 'semester', [{code:'PR', name:'Mid', kind:'progress', sort_order:99, start_date:null, end_date:null, parent_id:null, id:'pr'}]);
  assert.equal(glyphsForCalendar(c1).some(g=>g.id==='progress'), false);
  const c2 = {...c1, show_interims_in_filter: true};
  const gs2 = glyphsForCalendar(c2);
  assert.equal(gs2.some(g=>g.id==='progress'), true);
  assert.equal(gs2.find(g=>g.id==='progress')!.kind, 'progress');
});

// last growth patch per hard rule; tests cover every model + acc 1-4
