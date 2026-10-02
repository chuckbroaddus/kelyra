import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  gradebookStudentAvatarSize,
  studentHead,
  studentHeadLandscape,
} from '../../constants/table.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

test('landscape gradebook avatar size (shared #377 contract) is half portrait', () => {
  assert.equal(studentHeadLandscape.avatar, studentHead.avatar / 2);
  assert.equal(studentHeadLandscape.avatar, 28);
  assert.equal(gradebookStudentAvatarSize, studentHeadLandscape.avatar);
});

test('ConductEntryPanel: term-only label, landscape avatar left of name, no collapsing help', () => {
  const src = fs.readFileSync(path.join(here, 'ConductEntryPanel.tsx'), 'utf8');
  assert.match(src, /gradebookStudentAvatarSize/);
  assert.match(src, /CONDUCT_STUDENT_AVATAR_SIZE\s*=\s*gradebookStudentAvatarSize/);
  assert.match(src, /size=\{CONDUCT_STUDENT_AVATAR_SIZE\}/);
  assert.match(src, /photoUrl/);
  assert.match(src, /styles\.identity/);
  // No "Conduct ·" / "Conduct{" prefix — term name only.
  assert.doesNotMatch(src, /Conduct\s*\{/);
  assert.doesNotMatch(src, /Conduct\$\{/);
  assert.doesNotMatch(src, /`Conduct/);
  // Help + collapse live on the gradebook screen, not the panel.
  assert.doesNotMatch(src, /CollapsingPageChrome/);
  assert.doesNotMatch(src, /getBundledHelpTopic/);
  assert.doesNotMatch(src, /help\.conduct_mark/);
});

test('GradebookStudentHead always uses shared Conduct/landscape avatar size', () => {
  const head = fs.readFileSync(path.join(root, 'components/ui/GradebookStudentHead.tsx'), 'utf8');
  assert.match(head, /gradebookStudentAvatarSize/);
  assert.match(head, /GRADEBOOK_STUDENT_AVATAR_SIZE\s*=\s*gradebookStudentAvatarSize/);
  assert.match(head, /avatarSize\s*=\s*GRADEBOOK_STUDENT_AVATAR_SIZE/);
  assert.doesNotMatch(head, /compact\s*\?\s*studentHeadLandscape/);
  assert.doesNotMatch(head, /studentHead\.avatar/);
});

test('gradebook Conduct: help above period filter (collapsing); term pinned; roster students', () => {
  const gradebook = fs.readFileSync(path.join(root, 'app/class/[id]/gradebook.tsx'), 'utf8');
  assert.match(gradebook, /getBundledHelpTopic\('help\.conduct_mark'\)/);
  assert.match(gradebook, /testID="conduct-help-line"/);
  assert.match(gradebook, /testID="conduct-pinned-term"/);
  // Help is inside the collapsing chrome block (before Screen children / term tabs).
  const helpIdx = gradebook.indexOf('conduct-help-line');
  const collapsingEnd = gradebook.indexOf('const collapsing');
  const screenReturn = gradebook.indexOf('<Screen');
  assert.ok(helpIdx > collapsingEnd && helpIdx < screenReturn, 'help lives in collapsing chrome');
  // Pinned term is a Screen child next to termTabs, not inside ScrollView body of panel title.
  const pinnedIdx = gradebook.indexOf('conduct-pinned-term');
  const scrollIdx = gradebook.indexOf('styles.conductScroll');
  assert.ok(pinnedIdx > 0 && scrollIdx > pinnedIdx, 'pinned term precedes conduct ScrollView');
  // Single period: panel periodLabel null; multi keeps col.label.
  assert.match(gradebook, /periodLabel=\{conductColumns\.length > 1 \? col\.label : null\}/);
  // Students still pass roster objects (photoUrl on RosterStudent).
  assert.match(gradebook, /students=\{book\.students\}/);
});
