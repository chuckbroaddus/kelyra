import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRosterSuggestions, isLowConfidenceRoster } from './rosterSuggest.ts';

test('confident clean list starts checked; existing names stay unchecked', () => {
  const rows = buildRosterSuggestions(
    { names: [{ name: 'Ava Brooks', confident: true }, { name: 'Diego Morales', confident: true }] },
    ['Diego Morales'],
  );
  assert.deepEqual(
    rows.map((r) => [r.name, r.selected, r.alreadyHere]),
    [
      ['Ava Brooks', true, false],
      ['Diego Morales', false, true],
    ],
  );
});

test('a single unsure row is unchecked but the rest stay checked', () => {
  const rows = buildRosterSuggestions(
    {
      names: [
        { name: 'Ava Brooks', confident: true },
        { name: 'Diego Morales', confident: true },
        { name: 'Harper Nguyen', confident: true },
        { name: 'Uma V', confident: false },
      ],
    },
    [],
  );
  assert.deepEqual(rows.map((r) => r.selected), [true, true, true, false]);
});

test('low-confidence read (server flag or many unsure rows) starts every row unchecked', () => {
  const flagged = buildRosterSuggestions(
    { low_confidence: true, names: [{ name: 'Ava Brooks', confident: true }] },
    [],
  );
  assert.deepEqual(flagged.map((r) => r.selected), [false]);
  const mostlyUnsure = { names: [{ name: 'A B', confident: false }, { name: 'C D', confident: false }, { name: 'E F', confident: true }] };
  assert.equal(isLowConfidenceRoster(mostlyUnsure), true);
  assert.deepEqual(buildRosterSuggestions(mostlyUnsure, []).map((r) => r.selected), [false, false, false]);
});

test('rejected / not_roster yields no suggestions; junk headers dropped', () => {
  assert.deepEqual(buildRosterSuggestions({ rejected: true, names: [{ name: 'Ava Brooks' }] }, []), []);
  assert.deepEqual(buildRosterSuggestions({ document_kind_guess: 'not_roster', names: [{ name: 'X Y' }] }, []), []);
  const rows = buildRosterSuggestions({ names: [{ name: 'Period 3' }, { name: 'Ava Brooks' }] }, []);
  assert.deepEqual(rows.map((r) => r.name), ['Ava Brooks']);
});
