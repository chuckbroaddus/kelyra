import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

test('Screen: FlushBody outer bottom pad always 0; sticky is floating plate', () => {
  const screen = read('src/components/ui/Screen.tsx');
  assert.match(screen, /flushBottomPad = 0/);
  assert.match(screen, /useScrollBottomPad/);
  assert.match(screen, /styles\.stickyHost/);
  assert.match(screen, /styles\.stickyPlate/);
  assert.match(screen, /position: 'absolute'/);
  assert.doesNotMatch(screen, /styles\.bar\b/);
  assert.match(screen, /backgroundColor: 'transparent'/);
});

test('Nested lists pad content for tray (not FlushBody outer pad)', () => {
  const feed = read('src/components/ui/FeedPane.tsx');
  const table = read('src/components/ui/StickyTable.tsx');
  const day = read('src/components/calendar/DayListPane.tsx');
  const month = read('src/components/calendar/MonthGrid.tsx');
  const messages = read('src/app/messages/index.tsx');
  const home = read('src/app/index.tsx');
  const admin = read('src/app/admin/class/[id].tsx');
  const student = read('src/app/student/class.tsx');
  const gb = read('src/app/class/[id]/gradebook.tsx');
  for (const src of [feed, table, day, month, messages, home, admin, student, gb]) {
    assert.match(src, /useScrollBottomPad/);
  }
  assert.match(feed, /paddingBottom: scrollBottomPad/);
  assert.match(table, /paddingBottom: scrollBottomPad/);
  assert.match(gb, /styles\.exportDock/);
  assert.match(gb, /backgroundColor: 'transparent'/);
});

test('Floating tray hosts stay transparent; only cards paint elevated', () => {
  const tray = read('src/components/ui/FloatingTabTray.tsx');
  const messagesTray = read('src/components/ui/MessagesTray.tsx');
  const ctx = read('src/components/ui/ContextMenuRow.tsx');
  assert.match(tray, /backgroundColor: 'transparent'/);
  assert.match(messagesTray, /backgroundColor: 'transparent'/);
  assert.match(ctx, /backgroundColor: 'transparent'/);
  assert.match(ctx, /styles\.chip/);
  assert.match(ctx, /backgroundColor: colors\.elevated/);
});
