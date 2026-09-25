import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('Journal create/edit entry date uses DateInput drum picker, not TextField', () => {
  const screen = read('src/app/diary.tsx');
  assert.match(screen, /import \{ DateInput \} from ['"]@\/components\/ui\/DateInput['"]/);

  // Composer entry-date control is shared DateInput (default generic mode).
  const dateField = screen.match(
    /<DateInput[\s\S]*?label=["']Date["'][\s\S]*?\/>/,
  );
  assert.ok(dateField, 'composer renders <DateInput label="Date" />');
  assert.match(dateField![0], /value=\{entryDate\}/);
  assert.match(dateField![0], /required/);
  assert.match(dateField![0], /clearable=\{false\}/);
  assert.doesNotMatch(dateField![0], /mode=["']birthday["']/);
  assert.doesNotMatch(dateField![0], /onChangeText=\{setEntryDate\}/);

  // Old plain ISO text box gone from the Journal composer.
  assert.doesNotMatch(screen, /label=["']Date \(YYYY-MM-DD\)["']/);
  assert.doesNotMatch(
    screen,
    /<TextField[\s\S]*?label=["']Date[\s\S]*?onChangeText=\{setEntryDate\}/,
  );

  // DATE-P1 / edit prefill + ISO save contract stay wired to entryDate state.
  assert.match(screen, /setEntryDate\(prefill\?\.entry_date \?\? selectedDay\)/);
  assert.match(screen, /setEntryDate\(row\.entry_date\)/);
  assert.match(screen, /entryDate,/);

  // Shared DateInput hosts the drum wheels (dateWheels); no new picker invented.
  const dateInput = read('src/components/ui/DateInput.tsx');
  assert.match(dateInput, /from ['"]@\/components\/ui\/dateWheels['"]/);
  assert.match(dateInput, /mode = ['"]generic['"]/);
  assert.match(dateInput, /<DateWheels/);
});
