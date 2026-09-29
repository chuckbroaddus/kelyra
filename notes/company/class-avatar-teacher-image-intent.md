# Class avatar — Use the Teacher's Avatar Image — intent

**Date:** 2026-09-29
**Author:** qa-supervisor
**Card:** `t_caa01270`
**Reviewed:** `notes/company/class-avatar-teacher-image-spec.md` (PM `t_13a9a8e6`)
**Choices reviewed:** 1A 2A 3A 4A 5A. Not 2B. Not 5B.
**Pack:** `notes/company/class-avatar-teacher-image-options.md`
**Preview:** `notes/company/class-avatar-teacher-image-options.html`

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Class avatar — Use the Teacher's Avatar Image
Quality goals: name each face; hide the block when it cannot set a face; office row stays quiet; snapshot; office row only
Surface: both
Drive: missing — do not invent
PM: APPROVED  date: 2026-09-29  profile-session: product-manager / t_13a9a8e6
QA Supervisor: APPROVED  date: 2026-09-29  profile-session: qa-supervisor / t_caa01270
Intent gaps remaining: none
DITL IMPACT: UPDATE_PLANS — DITL-O-05
```

Not a build stamp. The feature map has no class-avatar click. Do not invent a route or a control.

## Six answers

### 1. Hats

Covered. 5A does not put the block on class Settings. That is the lock. It is not a gap.

- Superintendent and administrator share the office class card and the same sheet. also_administrator is that office sheet. Seats are not split.
- Administrator who also teaches: on the office seat, the office Class avatar row shows the block. On the teacher seat, `/class/{id}/settings` does not. Trays do not merge. Default chrome seat stays office. A circle set from the office row is the same circle when Settings opens. Settings does not offer the block and does not say **Using this image**.
- Teacher of that class: Settings stays Take photo, Choose from library, Remove photo if a class photo is set, Cancel. They do not set the class circle from a co-teacher's face on that door. They see the office block only if they are also office, and only on the office Class avatar row.
- Teacher of another class, student, parent, and a signed-out person do not set a class avatar. Students and parents still see the circle where it already shows. This card adds no control on their chrome.

### 2. Entry

Covered. The existing Class avatar row opens the sheet. No new tray, header icon, or screen. The sheet moves with that row. Today's Teacher pane on `/admin/class/{id}` is not the host this stamp locks. Card `t_cd1f4295` may move the row. This stamp does not add the Manage tab, does not merge with that card, and does not remove Class avatar or Feed icon from Settings. The block does not follow the Settings row.

### 3. Lifecycle

Covered on the office Class avatar sheet. Class Settings never shows this block. Settings still updates its ListRow status.

- Start, no class photo: Remove photo is absent. Tap a teacher who has a photo. The sheet closes. The class circle becomes the face that teacher had at that tap and keeps it. Office row goes quiet. Settings says **Shown next to the class name**. While a write is in flight, both rows say **Saving…**.
- Change to another teacher who has a photo: the class circle becomes that face, a new snapshot. The previous row loses **Using this image**. The new row gains it. Neither teacher's own photo changes.
- Change by Take photo or Choose from library: that capture replaces the class circle. It is not a teacher snapshot. Next open, no row says **Using this image**. Teachers who have a photo remain. No teacher's photo changes.
- Remove photo clears the class circle to initials only. It does not clear any current or former teacher's photo. Next open: no Remove photo, no **Using this image**, no **Class kept the earlier photo.** Office and Settings status return to **None yet**.
- Reopen when the class circle still matches that teacher's current face: that row says **Using this image**. A tap on that row does not write again and does not close the sheet.
- Teacher later changes their photo: the class circle does not move. Their row shows the current face, says **Using this image**, and says **Class kept the earlier photo.** A tap on that row snapshots the current face, closes the sheet, and clears the differ line. No second confirm. No new row.
- Teacher later has no photo: the class circle keeps the earlier face. It does not fall back to initials. Their row is omitted. There is no row to refresh.
- Teacher leaves the class: the class circle keeps the snapshot. Their row is gone, so no row says **Using this image**. Remove photo still clears only the class circle.
- Failed write: the class circle stays as it was. No row gains **Using this image** from a write that did not land. The existing page error is enough. No new error sheet.

The option pack said a tap on **Using this image** does nothing. That holds only when the circles already match and that teacher still has a photo. When the faces differ and they still have a photo, that same row is the refresh. That override is in the spec. It is not a second choice.

### 4. Multiplicity

Covered. 1A names the face. 1B would not. 1B is not the choice.

- Many teachers who have a photo: one non-tappable header, then one face and `display_name` per teacher of that class, in that class's teacher-list order. Not every teacher at the school. Not the **All teachers** add list. No second step. No **Back** row.
- One teacher with a photo: the same header, then that one row. A co-teacher with no photo is not a row.
- Zero teachers, or every teacher of that class has no photo: the block is absent. Do not show **No teacher yet.** or **No photo yet.** in this sheet. Take photo, Choose from library, and Cancel remain. Remove photo only if a class photo is set. Do not leave a blank row.
- A teacher with no photo is omitted. This sheet does not open a camera or the library for their face.
- Two classes can each snapshot the same teacher. Changing one class circle does not change the other. A later change to that teacher's photo moves neither circle.

### 5. Reverse, cancel, already in flow

Covered.

- Cancel closes the sheet and writes nothing. Cancel of the camera writes nothing. The class circle and every teacher photo stay as they were.
- A row that already says **Using this image**, while the circles still match, does not write again and does not close the sheet. Take photo, Choose from library, Remove photo, and Cancel stay.
- When that teacher's current face differs and they still have a photo, a tap on that same row snapshots the current face. That is the refresh, not a new control.
- Remove photo clears the class circle only. It does not delete the teacher's photo, and it does not delete a former teacher's photo.

### 6. Non-goals

Covered. Do not build these and then call the feature done.

- Not a feed glyph. Feed icon stays the catalog picker.
- Not a new placement for the class circle. Desk, hamburger, Profile Classes, and mixed student class chips stay where they are.
- Not an editor for the teacher's face. **No photo yet.** is not in this sheet, and it is not a link.
- Not the Manage tab. Not a merge with `t_cd1f4295`. Not a lock of today's Teacher pane.
- Not on class Settings. Not on person, school logo, create-account, or homework sheets. Homework may still show **Use this homework as profile** where it already does.
- Not a new screen, tray tab, or header icon.
- Not a student or parent control. Not a grade. The matcher does not insert a student.
- Not a Drive line. Do not invent one.
- Not 2B. Not 5B. Not follow (4B).

## Build gap

Not an intent gap. Do not solve it here. Do not design the SQL.

`set_class_avatar` still rejects an asset unless `assets.teacher_id` is the signed-in user (`supabase/migrations/20260911000003_class_avatar.sql`, check `teacher_id = auth.uid()`, exception `Unknown photo`). Office is allowed to change the class avatar, and still cannot point the class at the teacher's existing photo with today's RPC. 4A needs a copy the office user can point at. Pointing the class at a mutable asset the teacher later overwrites would move the class circle, which violates the snapshot. Follow is a different write. It is not the behavior. The block is not on class Settings. Do not ship a teacher-only door in place of the office row.

## DITL IMPACT

```
DITL IMPACT
Change: Office Class avatar sheet can set the class circle from a named teacher's face, and the class keeps that face if the teacher later changes, loses, or leaves.
Verdict: UPDATE_PLANS
Plans touched: DITL-O-05
Cases touched: none
New DITL needed: no
Seed/artifacts: none
Notes: DITL-O-05 is the office class and teacher day. Its restaff beat does not say the class circle keeps a snapshot when a teacher is removed. No case opens Class avatar (DITL-O-05-UI-01 through UI-04). Do not rewrite those cases on this card. Do not add a Manage tab beat. Do not lock the Teacher pane. Teacher Settings plans stay as they are: 5A does not change that sheet. Do not write the eval docs. Do not staff ditl-scribe.
```

## What this stamp does not do

QA Supervisor: APPROVED. Intent gaps remaining: none. This is not a build stamp. The feature map has no class-avatar click. `office-class-manage.md` clicks Manage. That is `t_cd1f4295`. Do not borrow it. Do not file engineering from this card. CEO look is already APPROVED 2026-09-29 Option A. The remaining stop is Chuck naming the click. Parent tracker `t_557c8124` stays sticky and unassigned. Do not link it.
