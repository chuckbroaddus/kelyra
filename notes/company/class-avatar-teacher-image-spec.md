# Class avatar — Use the Teacher's Avatar Image

**Date:** 2026-09-29
**Author:** product-manager
**Card:** `t_13a9a8e6`
**Supersedes:** completed stamp on `t_f66aeff6` (1A 2B 3A 4A 5B). That set is not the choice. That card stays done. Do not reopen it. This file is the amended spec.
**Pack:** `notes/company/class-avatar-teacher-image-options.md`
**Preview:** `notes/company/class-avatar-teacher-image-options.html`
**Process:** `notes/company/INTENT_QUALITY_GATE.md`
**QA intent:** `notes/company/class-avatar-teacher-image-intent.md` (QA Supervisor owns it. This note does not replace it.)
**Status:** PM DESIGN STAMP APPROVED (`t_13a9a8e6`). CEO look APPROVED 2026-09-29 Option A. QA Supervisor pending. Not a build stamp. Drive is missing. No `src/`. No SQL. `docs/ui-design.md` is not edited here.

## DESIGN STAMP

```
DESIGN STAMP
Feature/bug: Class avatar — Use the Teacher's Avatar Image
Quality goals: name each face; hide the block when it cannot set a face; office row stays quiet; snapshot; office row only
Surface: both
Drive: missing — do not invent
PM: APPROVED  date: 2026-09-29  profile-session: product-manager / t_13a9a8e6
QA Supervisor: pending
Intent gaps remaining: none
Choices: 1A 2A 3A 4A 5A
CEO look: APPROVED 2026-09-29 Option A
```

This stamp is not a build stamp. The feature map has no class-avatar click. Do not invent a route or a control.

## Locks

Exactly one letter each. CEO look lock 2026-09-29 is Option A on every choice: 1A, 2A, 3A, 4A, 5A. This overrides the completed stamp on `t_f66aeff6`. Do not reopen that card.

| # | Lock | Rejected |
|---|---|---|
| 1 | **1A** — non-tappable header, then one face and name per teacher of that class who has a photo | 1B cannot name a face when there are many. 1C adds a step the one-teacher case does not need. |
| 2 | **2A** — no teacher-image block when there are zero teachers, or when every teacher has no photo. A teacher with no photo is omitted. | Do not show **No teacher yet.** or **No photo yet.** inside this sheet. |
| 3 | **3A** — **Using this image** only in the sheet. Office ListRow stays quiet. | 3B ends the quiet law (Chuck 2026-09-25). |
| 4 | **4A** — the class keeps the face from the tap | 4B would move or blank the class circle when the teacher later changes or removes their photo. |
| 5 | **5A** — superintendent and administrator get the block on the office Class avatar row only. The block is not on class Settings. | Class Settings keeps Take photo, Choose from library, Remove photo, Cancel. A teacher opening Settings does not see the block. An office user who opens Settings does not see it there either. |

## Settled

Do not reopen these.

- The label is exactly **Use the Teacher's Avatar Image**. Do not rename it, shorten it, ellipsize it, or render it in all caps. The sheet title stays **Class avatar**. PhotoSheet may uppercase that title. That is not a rename of the CEO label.
- Order: **Take photo**, **Choose from library**, then the teacher-image block, then **Remove photo** only if a class photo is set, then **Cancel**. When the block is absent, that step is omitted. Do not leave a blank row.
- The block is on the office class-avatar PhotoSheet only. Not on class Settings. Not on person, school logo, create-account, or homework sheets. Homework may still show **Use this homework as profile**. That row does not gain this block.
- The office sheet moves with the office Class avatar row. Today's Teacher pane on `/admin/class/{id}` is not the permanent host. Card `t_cd1f4295` may move Class avatar and Feed icon onto an office-class Manage tab. This spec does not add that tab, does not merge with that card, and does not lock the Teacher pane. It does not remove Class avatar or Feed icon from `/class/{id}/settings`. The block does not follow the Settings row.
- Feed icon stays a glyph. No new screen, tray tab, or header icon.
- No Drive line. Do not invent a route or a control.
- **No photo yet.** and **No teacher yet.** are not in this sheet. A teacher with no photo is omitted. This sheet does not edit a teacher's face.
- Office ListRow title stays **Class avatar**.

## Why these locks

**1A.** A class can have many teachers. The person setting the circle must see the face and the name before the circle changes. The CEO sentence stays one header. It is not repeated on each row, and it does not have to guess a name. One teacher who has a photo is the same header plus one row. A teacher with no photo is not a row. There is no second step and no **Back** row.

**2A.** A row that cannot set a face does not belong in this sheet. Zero teachers: the block is absent. Every teacher has no photo: the block is absent. A teacher with no photo is omitted. Teachers who have a photo stay, under the header, one face and name each. Do not show **No teacher yet.** or **No photo yet.** inside this sheet. The Teachers list on the pane may still say **No teacher yet.** That line is not this sheet.

**3A.** Once a class photo is set, the office Class avatar row has no status (Chuck 2026-09-25, `ClassAvatarRow` `quiet`). The office sheet is where the source is named. Settings ListRow keeps **Shown next to the class name** when a photo is set, else **None yet**. Neither row names the teacher. The Settings sheet does not name the source.

**4A.** **Use the Teacher's Avatar Image** is the same kind of act as **Use this homework as profile**: use that image. It is not a live subscription to the person. Students, parents, and staff already see the class circle on Desk, the hamburger, Profile Classes, and mixed student class chips. That circle must not jump because a teacher updated a personal photo. It must not fall back to initials because that teacher later removed their photo or left the class. Follow (4B) does both. Snapshot does neither.

**5A.** The block is on the office Class avatar row only. Superintendent and administrator get it there, and they share that sheet. Class Settings keeps Take photo, Choose from library, Remove photo, Cancel. A teacher opening Settings does not see the block. An office user who opens Settings does not see it there either. Trays do not merge. The sheet moves with the office Class avatar row. Do not add the Manage tab. Do not lock the Teacher pane.

## Stories

**Superintendent.** As a superintendent, I open the office class card and tap **Class avatar**. I see **Use the Teacher's Avatar Image**, then one face and name for each teacher of that class who has a photo. I tap one. The class circle becomes that face and keeps it. I do not edit that teacher's photo. I do not get a new tray or a new screen. If I open class Settings, I do not see this block.

**Administrator.** As a school administrator, I use the same office card and the same sheet. I do not get a different block, a different label, or a different order. If I open class Settings, I do not see this block there either.

**Administrator who also teaches.** On the office seat I use the office class card and see the block. On the teacher seat I open `/class/{id}/settings` and do not see the block. Settings keeps Take photo, Choose from library, Remove photo, Cancel. The trays do not merge. A class circle set from the office row is the same circle when Settings opens. Settings does not offer the teacher-image block. Default chrome seat stays office.

**Teacher of that class.** On Settings I do not see the block. I see Take photo, Choose from library, Remove photo if a class photo is set, and Cancel. I do not set the class circle from a co-teacher's face on this door. I do not see the office class card unless I am also office. If I am also office, I see the block only on the office Class avatar row.

**Not this seat.** A student does not set a class avatar. A parent does not set a class avatar. A teacher who does not teach that class does not open its Settings. A signed-out person writes nothing.

## Sheet

Phone: bottom sheet, full width, top corners rounded. Web: centered card, max width 400. Same rows. The CEO label wraps. Do not ellipsize it. This drawing is the office Class avatar sheet. Class Settings does not mount this block.

Teachers in the block are the teachers of that class who have a photo, in the same order as that class's teacher list. Not every teacher at the school. Not the **All teachers** add list. A teacher with no photo is omitted.

```
CLASS AVATAR
Take photo
Choose from library
Use the Teacher's Avatar Image          ← header, not tappable; absent when no teacher of this class has a photo
  (face)  {display_name}                ← one row per teacher of this class who has a photo
          Using this image              ← only the source row, while the class holds their snapshot and they still have a photo
          Class kept the earlier photo. ← only on that source row, when their current face differs
Remove photo                            ← only if a class photo is set
Cancel
```

Zero teachers: the block is absent. Take photo, Choose from library, Remove photo if a class photo is set, Cancel. Do not show **No teacher yet.** in this sheet.

Every teacher has no photo: the block is absent. Same remaining rows. Do not show **No photo yet.**

One teacher with a photo: the header, then that one row. A co-teacher with no photo is not a row.

**Using this image** is words, not a new glyph. It means the class circle is the snapshot from that teacher's tap. It does not mean the two circles still match. It appears only on a listed teacher who still has a photo.

A class photo from Take photo or Choose from library is not a teacher snapshot. No row says **Using this image** in that case. Teachers who have a photo remain, so someone can switch to a teacher face later.

## Hats

| Hat | Office class card | Class Settings | This block |
|---|---|---|---|
| Superintendent | Yes. Same sheet as administrator. | May open `/class/{id}/settings`. No block there. | Office Class avatar row only. |
| Administrator | Yes. Same sheet. | May open Settings. No block there. | Office Class avatar row only. |
| Administrator who also teaches, office seat | Yes. Default seat stays office. | Not this seat. | Office sheet. Tray does not become the teacher tray. |
| Administrator who also teaches, teacher seat | Not this seat. | Yes. Existing Settings. No block. | Take photo, Choose from library, Remove photo, Cancel. |
| Teacher of that class | No, unless also office. | Yes. No block. | Same Settings sheet. No teacher-image block. |
| Teacher of another class | No. | No. | Out. |
| Student | No. | No. | Sees the circle where it already shows. Does not set it. |
| Parent | No. | No. | Same. Does not set it. |
| Signed-out | No. | No. | No write. |

also_administrator on the office class card is the administrator row. Do not split the seats.

## Lifecycle

Sheet moments below are the office Class avatar sheet. Class Settings never shows this block. Settings still updates its ListRow status.

**Start.** No class photo. Remove photo is absent. On the office sheet, tap a teacher who has a photo. The sheet closes. The class circle becomes the face that teacher had at that tap and keeps that face. Office row: quiet (no status). Settings: **Shown next to the class name**. While the write is in flight, both rows say **Saving…**, which they already do.

**Change — other teacher.** Open the sheet. Remove photo is present. Tap a different teacher who has a photo. The class circle becomes that face (a new snapshot). The previous row loses **Using this image**. The new row gains it. The previous teacher's photo is unchanged.

**Change — Take photo or library.** That capture replaces the class circle. It is not a teacher snapshot. Next open: no row says **Using this image**. Teachers who have a photo remain. A teacher with no photo stays omitted. A new capture ends the snapshot source. It does not change any teacher's photo.

**Refresh the same teacher.** Only while that teacher still has a photo. If their current face differs from the class snapshot, their row still says **Using this image** and also **Class kept the earlier photo.** A tap on that row snapshots the current face, closes the sheet, and clears the differ line. No second confirm. No new row. If the circles already match, a tap on that row does nothing and the sheet stays open. If they have no photo, they are omitted. There is no row to refresh.

**Remove.** Remove photo clears the class circle to initials. It does not remove any teacher's photo. It does not remove a former teacher's photo. Next open: no Remove photo, no **Using this image**, no **Class kept the earlier photo.** Office and Settings status return to **None yet**.

**Cancel.** Cancel closes the sheet and writes nothing. Cancel of the camera writes nothing.

**Already that image.** Reopen when the class circle still matches that teacher's current face. That row says **Using this image**. Take photo, Choose from library, Remove photo, and Cancel are still there. Tapping the checked row does not write again.

**Teacher later changes their photo.** The class circle does not move. Reopen: their row shows their current face, says **Using this image**, and says **Class kept the earlier photo.** The two circles are allowed to differ. A tap adopts the current face, as in Refresh.

**Teacher later has no photo.** The class circle keeps the earlier face. It does not fall back to initials. Their row is omitted. Do not show **No photo yet.**, **Using this image**, or **Class kept the earlier photo.** for that person. This sheet does not open a camera for their face. Other teachers who still have a photo stay. If none remain, the block is absent. Remove photo, if a class photo is set, still clears only the class circle.

**Teacher leaves the class.** The class circle keeps the snapshot. Their row is gone, so no row says **Using this image**. Office stays quiet. Settings still says **Shown next to the class name**. Remove photo still clears only the class circle.

**Two classes.** Using a teacher's image on one class does not change another class. Each class keeps its own snapshot. A later change to that teacher's photo moves neither circle.

**Failed write.** The class circle stays as it was. No row gains **Using this image** from a write that did not land. The existing page error is enough. Do not add an error sheet.

## Acceptance

Ids are what a person can see or do. Phone and web share the rows. Chrome differs only as AC-CATI-2.

**AC-CATI-1.** On the office Class avatar sheet, when at least one teacher of that class has a photo, the sheet shows the label **Use the Teacher's Avatar Image** as a non-tappable header. It is not shortened, not ellipsized, and not rendered in all caps. It is not repeated on each teacher row. It wraps on a narrow phone. When the block is absent, this label is absent.

**AC-CATI-2.** Phone is a bottom sheet. Web is a centered card, max width 400. Both show the same rows in the same order. The sheet title is **Class avatar**.

**AC-CATI-3.** On the office sheet, order is Take photo, Choose from library, the teacher-image block when it is present, Remove photo only if a class photo is set, Cancel. When the block is absent, that step is omitted. Do not leave a blank row. Remove photo is absent when no class photo is set, including when there are zero teachers.

**AC-CATI-4.** When the block is present, it lists only teachers of that class who have a photo, in that class's teacher-list order. It does not list every teacher at the school and does not list the **All teachers** add rows. Each listed teacher is a face and `display_name`. One teacher with a photo is the header plus that one row. There is no second step and no **Back** row.

**AC-CATI-5.** Zero teachers, or every teacher of that class has no photo: the teacher-image block is absent. There is no header. Do not show **No teacher yet.** or **No photo yet.** in this sheet. Take photo, Choose from library, and Cancel remain. Remove photo only if a class photo is set.

**AC-CATI-6.** A teacher with no photo is omitted. They are not a row. **No photo yet.** is not in this sheet. This sheet does not open Take photo, the library, or any editor for that teacher's face. Teachers of the same class who have a photo stay, and those rows are tappable.

**AC-CATI-7.** Person, school logo, create-account, and homework PhotoSheets do not show **Use the Teacher's Avatar Image**. Homework may still show **Use this homework as profile** when it already does.

**AC-CATI-8.** Office Class avatar ListRow title stays **Class avatar**. Status is **None yet** when unset, **Saving…** while a write is in flight, and no status once a photo is set. It does not say **Shown next to the class name**. It does not name a teacher. **Using this image** is not on this row.

**AC-CATI-9.** Settings Class avatar ListRow says **Shown next to the class name** when a photo is set, else **None yet**, and **Saving…** while a write is in flight. It does not name a teacher. The Settings sheet does not include **Use the Teacher's Avatar Image**.

**AC-CATI-10.** Start, no class photo: tap a teacher who has a photo. The sheet closes. The class circle becomes the face that teacher had at the tap. Office row goes quiet. Settings says **Shown next to the class name**.

**AC-CATI-11.** Reopen when that class circle still matches that teacher's current face. That row says **Using this image**. It does not say **Class kept the earlier photo.** A tap on that row does not write again and does not close the sheet. Take photo, Choose from library, Remove photo, and Cancel stay.

**AC-CATI-12.** Change teacher: tap a different teacher who has a photo. The class circle becomes that face. The previous row loses **Using this image**. The new row gains it. Neither teacher's own photo changes.

**AC-CATI-13.** Take photo or Choose from library replaces the class circle with that capture. Next open, no teacher row says **Using this image** or **Class kept the earlier photo.** Teachers who have a photo remain. A teacher with no photo stays omitted. No teacher's own photo changes.

**AC-CATI-14.** Remove photo clears the class circle to initials only. It does not clear any current or former teacher's photo. Next open: Remove photo is absent, and no row says **Using this image** or **Class kept the earlier photo.** Office and Settings status are **None yet**.

**AC-CATI-15.** Cancel closes the sheet and writes nothing. Cancel of the camera writes nothing. The class circle and every teacher photo stay as they were.

**AC-CATI-16.** After a snapshot, that teacher changes their own photo. The class circle does not move. Reopen: their row shows the current face, says **Using this image**, and says **Class kept the earlier photo.** The circles may differ. A tap on that row snapshots the current face, closes the sheet, and clears **Class kept the earlier photo.** No second confirm. No new control.

**AC-CATI-17.** After a snapshot, that teacher has no photo. The class circle keeps the earlier face and does not fall back to initials. Their row is omitted. The sheet does not show **No photo yet.**, and it does not show **Using this image** or **Class kept the earlier photo.** for that person. Other teachers who have a photo remain. If none remain, the block is absent. Remove photo, if a class photo is set, still clears only the class circle.

**AC-CATI-18.** After a snapshot, that teacher is removed from the class. The class circle keeps the snapshot. No row says **Using this image**. Office stays quiet. Settings still says **Shown next to the class name**. Remove photo still clears only the class circle.

**AC-CATI-19.** Two classes can each snapshot the same teacher. Changing one class circle does not change the other. A later change to that teacher's photo moves neither circle.

**AC-CATI-20.** A failed write leaves the class circle unchanged and does not add **Using this image**. The existing page error shows. There is no new error sheet.

**AC-CATI-21.** Superintendent and administrator see the same office sheet, the same label, and the same order, on the office Class avatar row only. also_administrator is that office sheet. Seats are not split. Opening `/class/{id}/settings` does not show the block for either hat.

**AC-CATI-22.** A teacher of that class, on `/class/{id}/settings`, does not see **Use the Teacher's Avatar Image**. The sheet is Take photo, Choose from library, Remove photo if a class photo is set, Cancel. They do not set the class circle from a co-teacher's face on this door. Feed icon on that screen stays the glyph picker. Syllabus is unchanged.

**AC-CATI-23.** An administrator who also teaches sees the block on the office class card, on the office seat. On the teacher seat, class Settings does not show the block. An office user who opens Settings does not see the block there either. A class circle set from the office row is the same circle when Settings opens, and Settings does not show **Using this image**. Trays do not merge. Default chrome seat stays office.

**AC-CATI-24.** A student, a parent, a teacher who does not teach that class, and a signed-out person do not get this sheet as a setter. This card adds no control on their chrome.

**AC-CATI-25.** No new screen, tray tab, header icon, or class-circle placement. Feed icon stays a glyph. This card does not add a Manage tab and does not remove Class avatar or Feed icon from `/class/{id}/settings`. If the office Class avatar row moves, this sheet moves with it.

## Pack override

The option pack said a tap on a row that says **Using this image** does nothing. That holds only when the class circle already matches that teacher's current face, and that teacher still has a photo (AC-CATI-11).

When the faces differ and the teacher still has a photo, that same row is the refresh (AC-CATI-16). A one-teacher class would otherwise have no way to adopt the new face except Take photo, which drops the source mark. No new row. No second sheet. No **Back** row.

When that teacher has no photo, there is no row. Do not show **No photo yet.** The class circle keeps the earlier face (AC-CATI-17).

## Open issue

Do not solve this here. Do not write SQL. Do not design the SQL.

`set_class_avatar` still rejects an asset unless `assets.teacher_id` is the signed-in user (`supabase/migrations/20260911000003_class_avatar.sql`, check `teacher_id = auth.uid()`, exception `Unknown photo`). An office user is not that teacher. Office cannot point the class at the teacher's existing photo with today's RPC. 4A needs a copy the office user can point at.

Product behavior is 4A, not a function:

- At the tap, the class circle becomes the face that teacher had at that moment.
- A later change to that teacher's photo, including removal, does not move the class circle and does not blank it (AC-CATI-16, AC-CATI-17, AC-CATI-18).
- Pointing the class at a mutable asset the teacher later overwrites would violate AC-CATI-16. The class must keep the face from the tap.
- Follow (4B) is a different write. It is not the behavior. Do not build a live link.
- The block is not on class Settings. Do not ship a teacher-only door in place of the office row.

CEO look is already APPROVED 2026-09-29 Option A. Architect still waits for the QA Supervisor stamp and a real Drive line. This note does not propose a function, a column, or a copy.

## Non-goals

- Not on class Settings. The block is the office Class avatar row only.
- Not **No teacher yet.** or **No photo yet.** inside this sheet.
- Not a feed glyph. Feed icon stays the catalog picker.
- Not a new placement for the class circle.
- Not an editor for the teacher's face.
- Not the Manage tab. Not a merge with `t_cd1f4295`.
- Not a new screen, tray tab, or header icon.
- Not a Drive line. Do not invent one.
- Not a student or parent control.
- Not a grade. The matcher does not insert a student.
- QA Supervisor names DITL IMPACT. This note does not write the eval docs and does not staff ditl-scribe.

## Record for the designer

Do not edit `docs/ui-design.md` on this card. Do not staff the designer from this card. When a designer card runs, record this choice in `docs/ui-design.md` §13.8a and §34.5. Do not redesign it. Choices are **1A 2A 3A 4A 5A**. Not 2B. Not 5B.

Passages:

- §13.8a `/class/[id]/settings`. `ClassAvatarRow` stays Take photo, Choose from library, Remove photo, Cancel. Do not add **Use the Teacher's Avatar Image** on class Settings. A teacher opening Settings does not see the block. An office user who opens Settings does not see it there either.
- §34.5, the office class card Class avatar line. The block is on that office row only. The office sheet moves with that row. Do not lock the Teacher pane. Do not add the Manage tab in that edit.
- §21 person PhotoSheet. Do not add this block. **Use this homework as profile** stays only where it already is.
- The §34.5 class-avatar bullet. Do not claim `set_class_avatar` already accepts another teacher's asset. 4A needs a copy the office user can point at. Do not design the SQL.

Write:

- Locks 1A, 2A, 3A, 4A, 5A. Not 2B. Not 5B. Label exactly **Use the Teacher's Avatar Image**, non-tappable header, then one face and `display_name` per teacher of that class who has a photo, class-list order, not the school-wide list.
- 2A: zero teachers, or every teacher has no photo, the block is absent. A teacher with no photo is omitted. Do not show **No teacher yet.** or **No photo yet.** inside this sheet.
- Order: Take photo, Choose from library, the teacher block when present, Remove photo if a class photo is set, Cancel.
- 3A: office ListRow stays quiet once a photo is set. Settings stays **Shown next to the class name** or **None yet**. The source is named only in the office sheet.
- 4A: the class keeps the face from the tap. Later teacher photo changes do not move the class circle. When the teacher's current face differs and they still have a photo, the source row also says **Class kept the earlier photo.** A tap on that row snapshots the current face. A matching tap does nothing. A later missing photo omits that row and does not blank the class circle. A teacher who leaves the class does not clear the class circle. Remove photo clears the class circle only, not the teacher's photo.
- 5A: office Class avatar row only. Not on class Settings. A teacher opening Settings does not see the block. An office user who opens Settings does not see it there either. Trays do not merge.
- Not on person, logo, create-account, or homework sheets.
- Do not invent a Drive line.



