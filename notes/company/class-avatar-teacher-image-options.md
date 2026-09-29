# Class avatar — Use the Teacher's Avatar Image

Recommendation only. Product Manager chooses. This note does not lock a pick, stamp intent, or change the app. `docs/ui-design.md` is not edited on this card.

Preview (phone sheet and web card, side by side): `notes/company/class-avatar-teacher-image-options.html`

## Job

A superintendent or a school administrator sets the class circle from a teacher's existing face. The sheet must be able to include the row **Use the Teacher's Avatar Image**. That English label is exact. Do not rename it. Do not shorten it in the recommended picture. Do not render it in all caps. The sheet title stays **Class avatar** (PhotoSheet already uppercases that title).

The class circle is the photo on `classes.avatar_asset_id`, not the feed glyph. Initials until a photo is set. Circles that already pass `photoUrl` from that field stay where they are: Desk, hamburger, Profile Classes, and mixed student class chips. This pack does not design new placements.

Hats in the pictures: superintendent and administrator. They share the office class card. If one sees the sheet, the other sees it. Do not split the seats. A teacher opening Settings is only Choice 5B, not a new screen.

Entry is the existing **Class avatar** ListRow. It already opens PhotoSheet titled Class avatar. No new screen, tray tab, or header icon. This pack does not add a tab.

The sheet is the job. It moves with the Class avatar row. Today that office row sits on the Teacher pane of `/admin/class/{id}` (Feed · Teacher · Parents · Students). A separate card is moving Class avatar and Feed icon off that pane onto a Manage tab (parent t_cd1f4295). This pack does not add that tab and does not lock Teacher as the host. If the row moves, these sheet contents move with it.

## Locked

Not choices:

- Office seat is in every option: superintendent and administrator open this sheet from the Class avatar row. The host pane is not locked. Do not add a Manage tab on this card. Do not treat today's Teacher pane as the permanent home.
- Rows that stay: **Take photo**, **Choose from library**, **Remove photo** (only when a class photo is set), **Cancel**.
- Order in every picture: Take photo, Choose from library, then the teacher-image block, then Remove photo, then Cancel. That is today's PhotoSheet grammar (sources, then an optional extra source, then remove, then the ghost). Placement among those four is not a separate fight.
- PhotoSheet is shared with person photos, school logo, create-account, and homework-as-profile. The new block must not appear on those sheets. That is a constraint, not an option. Only the class-avatar sheet grows the block.
- **No photo yet** is not a link. This sheet does not edit the teacher's face.
- Office ListRow title stays **Class avatar**. Quiet today: once a photo is set, that row has no status. Settings still says **Shown next to the class name** when a photo is set, else **None yet**. Whether already-using adds a status is Choice 3.
- Matcher never inserts a student. Nothing is a grade until the teacher Approves. Feed icon stays a glyph.

## Before

Office class card, where the Class avatar row sits today (Teacher pane). That host is not locked. Superintendent and administrator see the same sheet.

```
{class name}
Feed · Teacher · Parents · Students

(circle)  Class avatar          None yet     ← or quiet, no status, once a photo is set
(glyph)   Feed icon
TEACHERS
(face)    {display_name}        @handle
          No teacher yet.                     ← only when the list is empty
```

Sheet today. Phone: bottom sheet, full width, top corners rounded. Web: centered card, max width 400.

```
CLASS AVATAR
Take photo
Choose from library
Remove photo              ← only if a class photo is set
Cancel
```

Person, logo, create-account, and homework sheets stay that list (homework may also show **Use this homework as profile**). They do not gain **Use the Teacher's Avatar Image**.

## Choice 1 — Which teacher

A class can have zero, one, or many teachers. These three pictures are the sheet when the class has two teachers who both have a photo. Zero and a missing photo are Choice 2. Do not pick.

### 1A — Header, then one face per teacher

**Use the Teacher's Avatar Image** is a non-tappable line. It is not shortened and not repeated on each row. Under it, one tappable row per teacher: that teacher's face and `display_name`. Tap uses that face for the class circle.

One teacher: the same header, then one face and name. Many: the header, then each teacher. The sentence does not have to guess.

Job of the screen: name the face before the class circle changes.

Non-goals: a second sheet, a new teacher picker route, editing the teacher photo.

### 1B — One row, the sentence only

One tappable row. Its label is exactly **Use the Teacher's Avatar Image**. No face. No name. With exactly one teacher who has a photo, the tap can only mean that face. With two teachers the row cannot say which face. This picture is the one that is wrong for many teachers. It is here so it can be rejected. Do not draw a hidden picker behind it. That is 1C.

Non-goals: pretending the single row names a teacher.

### 1C — One sentence row; many teachers are a second step in the same sheet

One teacher with a photo: one row. Label is the full sentence. That teacher's face sits at the left of the sentence. The label is not shortened to the name.

Many teachers: the same row, full sentence, no single face. Meta under the sentence: the count, for example **2 teachers**. Tap does not leave Class avatar and does not open a new screen. The sheet body becomes the header **Use the Teacher's Avatar Image**, then one face and name per teacher, then a row **Back**, then **Cancel**. **Back** returns to Take photo, Choose from library, the sentence row, Remove photo, and Cancel. **Back** exists only on this second step. 1A and 1B do not have it.

Non-goals: a new route, a new tray, a FormSheet stacked on the PhotoSheet.

## Choice 2 — Zero teachers and no photo

Words, if the row is shown and cannot be used:

- Zero teachers: **No teacher yet.** Same sentence as the Teachers list on this pane.
- A teacher with no photo: **No photo yet.**

Those words are mute. They are not links. They do not open Take photo for the teacher's face.

### 2A — Absent

Zero teachers: the block is not in the sheet. Take photo, Choose from library, Remove photo if a class photo is set, Cancel. The pane under the sheet already says **No teacher yet.**

A teacher with no photo: that person is omitted. If every teacher lacks a photo, the block is absent (1A and 1C) or the single row is absent (1B). Do not show a row that cannot set a face.

### 2B — Present, not tappable

Zero teachers: **Use the Teacher's Avatar Image** still shows. It does not take a tap. Under it: **No teacher yet.**

A teacher with no photo: initials, name, and **No photo yet.** Not tappable. Other teachers who have a photo stay tappable above or below that row. Do not hide the person who has no photo.

A class with one teacher and no photo, on 1B: the sentence row shows, not tappable, with **No photo yet.** under the sentence.

## Choice 3 — Already using that image

Reopening the sheet when the class circle already came from that teacher. The check is the words **Using this image** on that row, not a new glyph.

Tapping the row that already says **Using this image** does nothing. The sheet stays open. No second confirm. Take photo, Choose from library, Remove photo, and Cancel stay.

A class photo from Take photo or Choose from library is not a teacher row. No row says **Using this image** in that case.

### 3A — Mark only in the sheet. Office stays quiet.

Office Class avatar ListRow: no status when a photo is set. **None yet** when unset. **Saving…** while the write is in flight. Do not add **Shown next to the class name** on the office row.

Settings ListRow, if Choice 5B: **Shown next to the class name** when a photo is set, else **None yet**. It does not name the teacher.

The sheet is where the source is named.

### 3B — Name the source on the ListRow too

Office status, only while the class circle is that teacher's image: **Using {display_name}'s image**. That ends the quiet law on this row (no status once a photo is set, Chuck 2026-09-25). It is not the Settings sentence.

Settings, if the row is there: **Using {display_name}'s image** instead of only **Shown next to the class name**.

A later Take photo or library photo clears the teacher name. Office returns to quiet (no status). Settings returns to **Shown next to the class name**.

The sheet still says **Using this image** on the matching teacher while that source holds.

## Choice 4 — Snapshot or follow

Two pictures. Do not pick. This seat does not recommend A or B. The write is not designed here. See Open issue.

Both pictures start the same: the superintendent or administrator taps Maya Chen's face. The class circle becomes that face. Then Maya Chen changes her own photo.

### 4A — Snapshot

The class keeps the face from the moment of the tap. Maya Chen's later photo does not move the class circle.

Reopen the sheet. Maya Chen's row still says **Using this image**. Her row shows her current face. The Class avatar circle shows the earlier face. They are allowed to differ. Words under the checked row, only when they differ: **Class kept the earlier photo.**

Remove photo on the class sheet clears the class circle only. It does not clear Maya Chen's photo.

### 4B — Follow

The class circle stays Maya Chen's current face and changes when she changes hers. Reopen: her row says **Using this image**, and the Class avatar circle matches the face on that row.

If she later has no photo, the class circle returns to the class initials. The source is gone. Her row says **No photo yet** and is not checked. That is the follow picture, not a third stance.

Remove photo on the class sheet still clears the class circle only. It does not clear her photo. Follow ends, because the class circle is no longer her face.

## Choice 5 — Office only, or also Settings

CEO required the office path. Both pictures keep it. Do not drop it.

### 5A — Office Class avatar row only

The office Class avatar row has the block, on whatever pane hosts that row. This pack does not pick the pane and does not add a tab. Class Settings (`/class/{id}/settings`) keeps today's sheet: Take photo, Choose from library, Remove photo, Cancel. No **Use the Teacher's Avatar Image**.

A teacher opening Settings does not see the block. An office user who opens Settings also does not. The block is on the office Class avatar row only. Same sheet for superintendent and administrator.

### 5B — Same block on class Settings

The office Class avatar row still has it, wherever that row sits. The same rows also mount on class Settings, because that screen already mounts Class avatar. Not a new screen. Not a new tab.

A teacher of that class, opening Settings, sees the same block. An office user who opens Settings sees it too. Dual-hat (administrator who also teaches the class) sees it on the office card and on Settings. Trays do not merge.

Settings ListRow status follows Choice 3. Office quiet is unchanged unless 3B.

## Start, change, remove, reopen

Same path on every choice. Hats: superintendent or administrator, opening the office Class avatar sheet. The sheet moves with the row. Picture labels below use 1A so the face is named. 1B and 1C use the same four moments.

**Start.** No class photo. Remove photo is absent. Tap a teacher who has a photo. Sheet closes. Class avatar circle becomes that face. Office row: quiet if 3A, or **Using {display_name}'s image** if 3B. Settings, if 5B: **Shown next to the class name** (3A) or the named status (3B).

**Change.** Class already has a photo. Open the sheet. Remove photo is present. Take photo or Choose from library replaces the class circle with the new capture. Next open: no teacher row says **Using this image**. The teacher rows remain, so they can switch back. A new capture ends follow (4B) and is not a snapshot of a teacher (4A).

Switching teacher: tap the other teacher who has a photo. The class circle becomes that face. The previous row loses **Using this image**. The new row gains it.

**Remove.** Remove photo clears the class circle to initials. It does not remove any teacher's photo. Next open: no Remove photo, no **Using this image**. Office and Settings status return to **None yet**.

**Already that image.** Open again. That teacher says **Using this image**. Take photo, Choose from library, Remove photo, and Cancel are still there. Tapping the checked row does not write again. Sheet stays open.

## ASCII — office Class avatar sheet

Hats on both drawings: superintendent and administrator, same sheet. The sheet is what this card locks as contents, not as a host pane. Today the row is on the Teacher pane. If that row moves, this sheet moves with it. Do not add a tab here. Class has two teachers. Maya Chen has a photo. Jordan Reed has none (Choice 2B). A class photo is already set, so Remove photo is present. This drawing is 1A. It is not a lock of which picture to ship.

Phone, bottom sheet. The CEO label wraps. Do not ellipsize it.

```
scrim
┌──────────────────────────────────────────
│ CLASS AVATAR
│ Take photo
│ Choose from library
│ Use the Teacher's Avatar Image
│   (MC)  Maya Chen
│   (JR)  Jordan Reed
│         No photo yet
│ Remove photo
│ Cancel
└──────────────────────────────────────────
home indicator
```

Web, centered card, max width 400. Same rows. Card, not a bottom sheet.

```
                 scrim
        ┌──────────────────────────────┐
        │ CLASS AVATAR                 │
        │ Take photo                   │
        │ Choose from library          │
        │ Use the Teacher's Avatar Image
        │   (MC)  Maya Chen            │
        │   (JR)  Jordan Reed          │
        │         No photo yet         │
        │ Remove photo                 │
        │ Cancel                       │
        └──────────────────────────────┘
```

1B, many teachers, phone. The row cannot say which face.

```
┌──────────────────────────────────────────
│ CLASS AVATAR
│ Take photo
│ Choose from library
│ Use the Teacher's Avatar Image
│ Remove photo
│ Cancel
└──────────────────────────────────────────
```

1C second step, phone. Not a new screen. **Back** only here.

```
┌──────────────────────────────────────────
│ CLASS AVATAR
│ Use the Teacher's Avatar Image
│   (MC)  Maya Chen
│   (JR)  Jordan Reed          No photo yet
│ Back
│ Cancel
└──────────────────────────────────────────
```

Already using Maya Chen (3A or 3B). Reopen. Tap on her row does nothing.

```
┌──────────────────────────────────────────
│ CLASS AVATAR
│ Take photo
│ Choose from library
│ Use the Teacher's Avatar Image
│   (MC)  Maya Chen
│         Using this image
│   (JR)  Jordan Reed
│         No photo yet
│ Remove photo
│ Cancel
└──────────────────────────────────────────
```

Zero teachers, 2A (block absent) and 2B (sentence present, not tappable). Phone.

```
2A                              2B
┌────────────────────────┐      ┌────────────────────────┐
│ CLASS AVATAR           │      │ CLASS AVATAR           │
│ Take photo             │      │ Take photo             │
│ Choose from library    │      │ Choose from library    │
│ Cancel                 │      │ Use the Teacher's Avatar Image
└────────────────────────┘      │ No teacher yet.        │
                                │ Cancel                 │
                                └────────────────────────┘
```

Remove photo is absent in that pair because no class photo is set. If a class photo is set and there are still zero teachers, Remove photo sits above Cancel in both.

## Non-goals

- No new screen, tray tab, header icon, or class-circle placement. Do not add the Manage tab on this card.
- Do not lock the Teacher pane as the host of this sheet. The sheet moves with the Class avatar row.
- No **Use the Teacher's Avatar Image** on person, school logo, create-account, or homework PhotoSheets.
- No editing the teacher's photo from this sheet.
- No new glyph. **Using this image** is words, not an IconName.
- No SQL and no RPC design.
- No change to the feed glyph picker.
- No student insert. Nothing becomes a grade.
- Do not rename or shorten **Use the Teacher's Avatar Image**.
- Do not patch `docs/ui-design.md` until Product Manager records a choice.

## Open issue

Do not solve this.

`set_class_avatar` rejects an asset unless `assets.teacher_id` is the signed-in user (`supabase/migrations/20260911000003_class_avatar.sql`, check `teacher_id = auth.uid()`, exception `Unknown photo`). A superintendent or administrator is not that teacher. An office user cannot point the class at the teacher's existing photo with today's RPC. The pictures still show the row.

Follow (4B) is a different write from copying a face once. If the class circle must change when the teacher later changes their photo, today's RPC does not do that. Not designed here.

Product Manager and the architect need both facts before a build. This pack does not propose a function, a column, or a copy.

## Recommendation only

Not a lock. Product Manager chooses. Snapshot versus follow is not recommended either way.

- Choice 1: **1A**. The sentence stays whole. Each teacher is a face and a name under it. One step. 1B cannot name a teacher when there are many. 1C adds a step the one-teacher case does not need.
- Choice 2: **2B**. A missing row looks like the CEO line was dropped. **No teacher yet.** and **No photo yet.** show why the tap will not take.
- Choice 3: **3A**. The sheet names the source. The office ListRow stays quiet.
- Choice 4: no recommendation. Draw both. Do not pick.
- Choice 5: **5B**. Office Settings already has Class avatar. Leaving the CEO row off that door makes office Settings a lesser door. The teacher on Settings is the same sheet, not a new screen.
- Host pane is not a choice on this card. The sheet moves with the Class avatar row. Do not add the Manage tab here.

Files for the choice: this note, and `notes/company/class-avatar-teacher-image-options.html`.
