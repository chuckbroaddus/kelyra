# Teacher work IA (labels, grouping, entry points)

Status: review with Chuck. Do not send Grok Build. No new tables. No create-class. Keep assignments.kind, class_teachers wall.

Headline: One Assign path. Lesson is a kind of assignment, not a sibling product. Practice is a kind of work, not the place you assign from.

## What stayed wrong in L1
New assignment showed two selectors labeled Assignment and Lesson, so they looked like two products. On the student record, assign was only findable under the Practice tab. Function worked. Workflow did not.

## One word: Assign
Every altitude uses the same verb. Assign. Not New assignment vs New lesson. Not Practice as a factory.
After Assign, pick a type: Lesson, Practice, Capture (photo/voice/pages already in Capture tray still exist as the walk-around well; Capture-as-type here means "turn this into assigned work" only if that kind already exists in assignments.kind). If Capture-as-assignment is not a real kind yet, types on the sheet are Lesson and Practice only. Do not fake a third product.
Type control: PersonTabs or a single chip row under the title, same selected-name rule as office. Labels are Lesson / Practice, never Assignment / Lesson.

## Where Assign lives
Class altitude: Assignments cabinet is the filing cabinet of work already given. Primary Assign is a ghost or plus on that pane (and the same control on Class Home if we already show a work peek). It is not a tray tab.
Student altitude: Assign is a first-class action on the student record header or under the Work tab, never nested inside a tab named Practice. Practice is a filter or a type of row on Work, not an entry point. Opening a student to give them a lesson should be: student -> Assign -> type Lesson.
Grade altitude: Assign means this lesson or practice to the teacher existing classes in that grade (multi-select). Same sheet, who-list is classes not students. Still no create-class.

## Tabs on the student record
Keep existing PersonTabs physics. Rename/group so Work is the pile (all kinds: lesson rows, practice rows, captures attached). Practice is not a sibling of Work that owns assign. If a Practice tab must remain for the skills/approve flow, it is review-only (Approve, skills). It does not contain New.
Suggested student tabs (reuse existing screens, retitle): Work (list + Assign) · Notes/Focus if those already exist · Parents. Do not add tabs. Subtract the assign CTA from Practice if it sits there today.

## Lists and pills
WorkRow / assignment list: title + pill of the kind (Lesson, Practice) + due + status. The list title is Work or Assignments, never Lessons as a product name. Catalog picker stays inside the Lesson type of the Assign sheet (deck_id + version). No URL field.

## Capture vs Assign
Capture tray stays the walk-around well (stay put). Inbox stays the unnamed/review pile. Neither is renamed Assign. A finished capture can become practice work through the existing attach flow. A lesson never goes through Inbox.

## What we do not change
assignments.kind (or equivalent) in the database. class_teachers RLS. Teachers cannot create classes. WebView player, signed URLs, metrics on the record (L1). Superintendent chrome tokens. Grade / Class / Student zoom from the note.

## Copy to swap
Kill: Assignment vs Lesson as equal selectors; Assign living under Practice; New lesson as a separate product.
Use: Assign; then Lesson or Practice; Work as the student pile; Assignments as the class cabinet.

## Done when
Jacquee can assign a lesson from Class Assignments and from a student Work (or header Assign) without seeing the word Practice as the door, and without choosing between two products named Assignment and Lesson.
