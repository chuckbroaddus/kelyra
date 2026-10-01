/**
 * periodGlyphs.test.ts
 * Unit tests for every period_model + SRS §5.10 solid-wedge geometry.
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

function assertWedge(
  g: { id: string; startDeg: number; sweepDeg: number; filled: boolean } | undefined,
  start: number,
  sweep: number,
  id: string,
) {
  assert.ok(g, `missing glyph ${id}`);
  assert.equal(g!.startDeg, start, `${id}.startDeg`);
  assert.equal(g!.sweepDeg, sweep, `${id}.sweepDeg`);
  assert.equal(g!.filled, true, `${id}.filled`);
}

test('glyphsForCalendar returns All first always as solid disc', () => {
  const c = makeCal('nine_weeks');
  const gs = glyphsForCalendar(c);
  assert.equal(gs.length > 0, true);
  assert.equal(gs[0].id, 'all');
  assert.equal(gs[0].sweepDeg, 360);
  assert.equal(gs[0].filled, true);
});

test('nine_weeks Q/S solid 90/180 compass FR-03', () => {
  const c = makeCal('nine_weeks');
  const gs = glyphsForCalendar(c);
  assert.deepEqual(gs.map(g => g.id), ['all','q1','q2','s1','q3','q4','s2']);
  assertWedge(gs.find(g=>g.id==='q1'), 180, 90, 'q1');
  assertWedge(gs.find(g=>g.id==='q2'), 270, 90, 'q2');
  assertWedge(gs.find(g=>g.id==='q3'), 0, 90, 'q3');
  assertWedge(gs.find(g=>g.id==='q4'), 90, 90, 'q4');
  assertWedge(gs.find(g=>g.id==='s1'), 180, 180, 's1');
  assertWedge(gs.find(g=>g.id==='s2'), 0, 180, 's2');
});

test('six_weeks solid sixths clockwise from 12 o’clock + S1 right / S2 left', () => {
  const c = makeCal('six_weeks', 'semester');
  const gs = glyphsForCalendar(c);
  assert.deepEqual(gs.map(g=>g.id), ['all','6w1','6w2','6w3','s1','6w4','6w5','6w6','s2']);
  const expect: Record<string, { start: number; sweep: number }> = {
    '6w1': { start: 0, sweep: 60 },
    '6w2': { start: 60, sweep: 60 },
    '6w3': { start: 120, sweep: 60 },
    s1: { start: 0, sweep: 180 },
    '6w4': { start: 180, sweep: 60 },
    '6w5': { start: 240, sweep: 60 },
    '6w6': { start: 300, sweep: 60 },
    s2: { start: 180, sweep: 180 },
  };
  for (const [id, ang] of Object.entries(expect)) {
    assertWedge(gs.find((x) => x.id === id), ang.start, ang.sweep, id);
  }
});

test('six_weeks year scope uses same 60° sixths (6wy ids)', () => {
  const c = makeCal('six_weeks', 'year');
  const gs = glyphsForCalendar(c);
  assert.deepEqual(gs.map((g) => g.id), ['all','6wy1','6wy2','6wy3','s1','6wy4','6wy5','6wy6','s2']);
  assertWedge(gs.find(g=>g.id==='6wy1'), 0, 60, '6wy1');
  assertWedge(gs.find(g=>g.id==='6wy4'), 180, 60, '6wy4');
  assertWedge(gs.find(g=>g.id==='s1'), 0, 180, 's1');
  assertWedge(gs.find(g=>g.id==='s2'), 180, 180, 's2');
});

test('trimester solid 120° wedges', () => {
  const gs = glyphsForCalendar(makeCal('trimester'));
  assert.deepEqual(gs.map(g=>g.id), ['all','t1','t2','t3']);
  assertWedge(gs.find(g=>g.id==='t1'), 180, 120, 't1');
  assertWedge(gs.find(g=>g.id==='t2'), 300, 120, 't2');
  assertWedge(gs.find(g=>g.id==='t3'), 60, 120, 't3');
});

test('semester solid halves compass (S1 left, S2 right)', () => {
  const gs = glyphsForCalendar(makeCal('semester'));
  assert.deepEqual(gs.map(g=>g.id), ['all','s1','s2']);
  assertWedge(gs.find(g=>g.id==='s1'), 180, 180, 's1');
  assertWedge(gs.find(g=>g.id==='s2'), 0, 180, 's2');
});

test('year solid full disc with year chip', () => {
  const gs = glyphsForCalendar(makeCal('year'));
  assert.deepEqual(gs.map(g=>g.id), ['all','year']);
  assertWedge(gs.find(g=>g.id==='year'), 0, 360, 'year');
});

test('college is All only', () => {
  assert.deepEqual(glyphsForCalendar(makeCal('college')).map(g=>g.id), ['all']);
});

test('custom equal sweep computed and filled', () => {
  const c = makeCal('custom', 'semester', [
    {code:'P1', name:'P1', kind:'marking_period', sort_order:1, start_date:null, end_date:null, parent_id:null, id:'p1'},
    {code:'P2', name:'P2', kind:'marking_period', sort_order:2, start_date:null, end_date:null, parent_id:null, id:'p2'},
  ]);
  const gs = glyphsForCalendar(c);
  const p1 = gs.find(g=>g.id==='p1')!;
  assert.equal(p1.sweepDeg, 180);
  assert.equal(p1.filled, true);
});

test('acc 2: nine weeks no 6w', () => {
  assert.equal(glyphsForCalendar(makeCal('nine_weeks')).some(g => g.id.startsWith('6w')), false);
});

test('acc 3: 6W1 selected only first 60° sixth', () => {
  assertWedge(glyphsForCalendar(makeCal('six_weeks')).find(g=>g.id==='6w1'), 0, 60, '6w1');
});

test('acc 4: labels from calendar or upper', () => {
  const c = makeCal('six_weeks', 'semester', [
    {code:'6W1', name:'First six weeks', kind:'marking_period', sort_order:1, start_date:'2026-08-12', end_date:'2026-09-19', parent_id:null, id:'1'},
  ]);
  const w1 = glyphsForCalendar(c).find(g=>g.id==='6w1')!;
  assert.equal(w1.label, 'First six weeks');
  assert.match(w1.dateRange, /08-12–09-19/);
});

test('storeCode uses calendar code', () => {
  const c = makeCal('nine_weeks', 'semester', [{code:'Q1', name:'Q1', kind:'marking_period', sort_order:0, start_date:null,end_date:null,parent_id:null,id:'q'}]);
  assert.equal(glyphsForCalendar(c).find(g=>g.id==='q1')!.storeCode, 'Q1');
});

test('progress only when show_interims; not filled', () => {
  const c1 = makeCal('nine_weeks', 'semester', [{code:'PR', name:'Mid', kind:'progress', sort_order:99, start_date:null, end_date:null, parent_id:null, id:'pr'}]);
  assert.equal(glyphsForCalendar(c1).some(g=>g.id==='progress'), false);
  const c2 = {...c1, show_interims_in_filter: true};
  const prog = glyphsForCalendar(c2).find(g=>g.id==='progress')!;
  assert.equal(prog.kind, 'progress');
  assert.equal(prog.filled, false);
  assert.equal(prog.sweepDeg, 0);
});
