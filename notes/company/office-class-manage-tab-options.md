# Office class Manage tab — options

Status: options only. Product Manager chooses the tab order. This note does not lock a pick.

Preview: `notes/company/office-class-manage-tab-options.html`

## Job of the chrome

The office class card (`/admin/class/{id}`) is where a superintendent or administrator looks at one class. Live tabs are Feed · Teacher · Parents · Students. Opening the class lands on Teacher. Class avatar (quiet) and Feed icon sit at the top of that Teacher pane, above the teachers list.

The new tab does the job those two rows already do: set this class's photo, and set this class's feed mark. It is not school Manage. It is not the teacher desk. It is not a new screen.

Home already has this pattern. `schoolHomeTabs` is Feed · Classes · People · Manage · New. Manage uses icon `manage` and the label Manage. School Manage contents (school identity, school feed icon, and the other home rows) are not copied onto the class pane.

## Locked in every picture

- Label exactly Manage. Icon key `manage`: three bars, knobs at different stops. Same glyph as home Manage. Not Settings. Not the teacher desk gear (`settings`). Not a new glyph.
- Hats: superintendent and administrator on `/admin/class/{id}`. `also_administrator` uses this same card. Not a second screen.
- Pane contents: the existing Class avatar row (`quiet`) and Feed icon row (`hint={false}`) only. Moved off Teacher. Teacher pane keeps the teachers list and loses those two rows.
- Opening the class still lands on Teacher, not Manage.
- PersonTabs unchanged. The selected tab shows its name. The others are icon-only. One horizontal scroller. No overflow menu. No second row.
- Teacher desk Settings (`/class/{id}/settings`, gear, label Settings) keeps Class avatar and Feed icon. Parent and student class screens do not gain Manage.
- Not on this pane: school name, school feed icon, syllabus, delete class, Ride office, Activity, Responsibilities, My children.
- The class avatar sheet is not redrawn. In-flight card t_bec78653 ("Use the Teacher's Avatar Image") moves with the Class avatar row onto Manage.
- `docs/ui-design.md` is not edited on this card. §32.1 still says office class is Feed · Roster · Teacher. Live code is Feed · Teacher · Parents · Students. Trust the code. §34.5 still names the Teacher pane as the host of these two rows. That law patch waits until Product Manager chooses.

## Before

Today, Teacher selected on open. The two rows are on Teacher.

```
Period 2 English
[board][ person Teacher     ][parents][setup]

Class avatar                         None yet     >
Feed icon                            Classroom    >
TEACHERS
Ms. Chen                                      Remove
```

Quiet means: once a photo is set, the Class avatar status line is omitted. Empty still says None yet. Feed icon status is the catalog label (default Classroom). `hint={false}` means the picker sheet has no explainer line. The row itself stays.

## The only choice: tab order

Two pictures. No third order.

Home puts Manage after People, before New. This row has no Classes, no People, and no New. Neither order copies the home row. Both reuse the home label and the home `manage` glyph.

Phone width: five icons in the existing PersonTabs row. It scrolls (`showsHorizontalScrollIndicator={false}`). Do not design an overflow menu, a More chip, or a second row.

On a 390 phone the five short names usually fit. Selected pill hugs the title (Feed, Teacher, Parents, Students, Manage all fit the visibility-reserve ceiling). Four collapsed hits are 44. Gap is 4. If a last glyph clips, the row scrolls. It does not hide behind a menu.

### A — Manage last

Feed · Teacher · Parents · Students · Manage.

Stance: quiet settings sit at the end, the same habit as Details last on person pages (§32.1). Home puts Manage after the working tabs. This row has no New after Manage, so last is the nearest analog. Parents and Students stay a pair. The two rows leave Teacher and live one tab past Students.

Cost: Manage is the fifth icon. You may scroll to it. You do not get a menu.

Opens on Teacher (this is the landing, either order):

```
|<------------------------- 390 pt ------------------------->|
| 16 |[board][ person Teacher     ][parents][setup][sliders]|
        icon-only   name visible      icon    icon   icon
        mute        brandSoft+brand   mute    mute   mute
```

Manage selected (tap, not the open state). Web column is the same row inside maxWidth 640; the five hits sit with room, still one scroller, still no menu.

```
|<------------------------- 390 pt ------------------------->|
| 16 |[board][person][parents][setup][ sliders Manage      ]|
        icon    icon    icon    icon    name visible
```

Manage pane. Same two rows on phone and on the 640 column. Nothing else.

```
Period 2 English
(tab row above — Manage selected)

Class avatar                         None yet     >
Feed icon                            Classroom    >
```

### B — Manage after Teacher

Feed · Teacher · Manage · Parents · Students.

Stance: the two rows move one tab to the right of the pane they leave. Teacher and Manage stay adjacent, so the move is easy to find the first week. Parents and Students stay a pair at the end.

This is not how home works. Home puts Manage after People, not after the second tab. Do not read B as "match home."

Cost: a settings tab splits Teacher from the roster tabs. It does not match Details-last.

Opens on Teacher:

```
|<------------------------- 390 pt ------------------------->|
| 16 |[board][ person Teacher     ][sliders][parents][setup]|
        icon-only   name visible      icon     icon    icon
```

Manage selected:

```
|<------------------------- 390 pt ------------------------->|
| 16 |[board][person][ sliders Manage      ][parents][setup]|
        icon    icon    name visible          icon     icon
```

Manage pane is the same two rows as A. Order does not add a row.

## Teacher pane after the move

Either order. The teachers list stays. The two rows are gone. Shown so the loss is visible, not only described.

```
Period 2 English
(Teacher selected — still the landing)

TEACHERS
Ms. Chen                                      Remove
ALL TEACHERS
Jordan Hale                                   Add
```

No Class avatar. No Feed icon. No section header that repeats the tab name.

## Out — not options

- Teacher desk `/class/{id}/settings` keeps Class avatar then Feed icon. Label stays Settings. Icon stays `settings`. CEO did not ask to change that desk.
- Parent class screens and student class screens do not gain Manage.
- No new screen, no new tray, no header icon, no extra settings rows.
- No school identity, no School feed icon, no syllabus, no delete class.
- Do not redraw the class avatar sheet. It moves with the row.

## Recommendation only — not a lock

A, Manage last.

Home already puts Manage after the working tabs, before New. This row has no New, so last is that analog. Person pages already put settings-like content last. B is a real alternative if the first week should keep the rows next to Teacher. Product Manager chooses. This pack does not.

## Choice left for Product Manager

One choice: tab order A or B. Everything else above is locked.

## Later, not this card

After the stamp, a law patch should update `docs/ui-design.md` §32.1 (office class row is stale) and §34.5 (picker host is the Teacher pane today). Do not edit that doc here.

Engineering will hit tests that still describe the Teacher pane as the host, or freeze the four-tab row. Do not edit them on this card:

- `src/lib/classes/officeClassCard.test.ts`
- `src/lib/classes/classAvatar.security.test.ts`
- `src/lib/chrome/classTabs.test.ts` (CT-05 freezes Feed · Teacher · Parents · Students)

No Drive line in verify-kelyra for this card. Do not invent one.

Parent tracker t_cd1f4295 stays sticky and unassigned. This pack does not link, unblock, or assign it.
