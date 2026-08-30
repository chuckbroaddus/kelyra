# Kelyra Author — package spec (draft)

Drawn from live FoM Ch1 v4 on 2026-08-27. Not a new player. Author emits what Kelyra already runs.

Owner: Kelyra Author (product). Class-app hooks go through Chief of Staff. Author owns `index.html` (Chuck 2026-08-27). STYLE-BRIEF remains the quality bar; Lesson QA fails packs to it until Author staffs QA.

## Chuck 2026-08-27

- Teachers and staff may call `publish_lesson_pack`.
- Author owns `index.html` (emit), not only the manifest.
- FoM 1.1 round-trip is the proof pattern, not the only pack. Many more packs with new content follow.
- Author is the content-creation product. Lesson is the first kind. Owner researches and proposes further kinds and assessment metrics, proposes staff, and designs the class-app interface with Chief of Staff.


STYLE-BRIEF already names this: “teacher PPT/PDF + theme + pick backgrounds + suggested dialog.” Do not build the studio until a package round-trips.

## Two products

| | Kelyra (class app) | Author (studio) |
|---|---|---|
| Job | Assign, capture, grade, analytics, IEP | Create and publish content |
| User hour | Class / evening grading | Prep |
| Bill | Seats | Generation credits |
| Student PII | Yes | Never inside a package |

Content travels. Student data never does.

## What already ships (the contract)

Live gold standard: `notes/teacher-decks/fom-ch01-v4/` (gitignored; do not commit BJU stills).

Folder on disk / in Storage:

```
{storage_deck_id}/{version}/
  index.html
  audio/{beatId}.mp3
  audio/praise1–5.mp3  audio/oops1–3.mp3
  audio/captions/{beatId}.mp3
  audio/captions/{beatId}.txt
  img/scenes/{beatId}.webp
```

Catalog row `lesson_packs` (students have no SELECT, no URL field):

- `deck_id` assignable id, e.g. `fom-ch01-s11`
- `version` e.g. `v4`
- `title` picker label
- `published`
- `storage_deck_id` folder, e.g. `fom-ch01` (section packs share one folder)
- `beat_start` / `beat_end` inclusive beat ids

Private bucket `lessons/{storage_deck_id}/{version}/`. Open path: teacher assigns `assignments.kind = lesson` → student Open → `student_open_lesson` mints a ~1h JWT → WebView loads `lesson-host/<token>/index.html`. Relative `audio/` and `img/` stay same-origin. Identity and resume go over `postMessage` (`kelyra.identity`, `kelyra.lesson`), not the URL. `?beat=` is QA only.

Submit for a Grade posts `type: "kelyra.lesson"`, `state: "complete"`, `metrics.extras.complete_kind: "this_visit"`, plus `marks` and extras `item_ids`, `item_stems`, `later_corrected`, `hinted`, `skipped`, `wrong`.

`student_report_lesson` drafts up to 3 `skill_gaps` from that payload. An item is worth a gap if it is wrong, has no boolean `ok`, was later corrected, `tries >= 3`, or `hints >= 2`. Clean first-try work drafts none. Gap *labels* are the item stems (`item_stems[id]`, cap 48 chars), not skill ids. Live FoM declares **no skill tags**. Author v1 must emit stable item ids and stems. Optional `skill` on a manifest item is future, not required to assign.

Style lock: `notes/teacher-decks/STYLE-BRIEF.md`. QA fails to it. Author output that looks generated fails the brief.

## Kinds that exist vs vapor

Already in the class app:

- **lesson** — hosted interactive pack (FoM). This is Author’s first emit.
- **generated practice** — also `kind = lesson`, deck `prac-*`, HTML from Edge `build-practice-lesson` (unpublished pack). Same player, thinner spec (`PracticePageSpec`).
- **Practice chip / planned column** — `kind = planned`. Not the FoM player.
- **homework photo** — `kind = capture`. Inbox, not HTML.
- **quiz / test / midterm / final / project** — `assignments.category` only. Default lesson category is `homework`. `include_in_average` defaults false on lessons.

Not a separate player yet: quiz, test, worksheet-as-HTML. Those are grade-book labels. A “quiz” in Author v1 is a lesson pack that is almost all Check beats, assigned with `category = quiz`.

Do not invent a second runtime. One player (`index.html` + bridge). Different packs, different beat mixes.

## FoM 1.1 as the fixture (`fom-ch01-s11` / v4)

Catalog: deck `fom-ch01-s11`, storage `fom-ch01/v4`, beats `hook` … `s11c`.

| Beat | Role | Checks |
|---|---|---|
| hook | Welcome | Name only |
| s11t | Teach | Slider park 3.7 (`slider37`, not `grade()`) |
| s11c | Check | houses + a1–a7, one item at a time |

Item types in `ITEMS`: `text`, `choice`, `match`, `houses`. Slider `slider37` lives on s11t **outside** `ITEMS` / `grade()` and is excluded from score and gaps. 1.1 check items: houses + a1–a7 (a3–a4 choice, a5–a7 text, two of those `kind: round`).

Accept-sets are aliases. Display is paper math (2³, ×). Input is a normal keyboard (`2^3`, `2*2*2`, `408,300` / `408300`). Hint shows the typewriter form.

Audio (Eve TTS): `hook.mp3`, `s11t.mp3`, `s11c.mp3`, plus shared praise/oops. Peek-the-world uses `audio/captions/{beatId}`. HUD mute persists per pack. No `speechSynthesis` as primary voice. No wallpaper music.

Hero art: full-bleed cinematic still + Ken Burns. Question sits on a frosted card. Tap the world peeks the card. Phone swipes; computer uses buttons. Free skip. Restore drafts. Last check item is Submit → summary → Submit for a Grade.

Progress key: `kelyra-fom-ch01-v4` (device localStorage). Hosted player gets identity via postMessage; roster name is locked.

If Author cannot export a pack that Open/Submit/skill-gap on this slice, the spec is wrong.


## Student identity and metrics (required)

This is not a future Author feature. Live FoM v4 already does it. Any Author pack that Open/Submit in Kelyra **must** speak the same bridge. No student PII lives in the package files.

**Load.** The class app posts `kelyra.identity` into the WebView (student id + display name, class, assignment, pack slice). The page waits for that message before painting the assigned slice. If `student.id` is set and this is not preview, the name field is filled and **locked**. Preview may type a first name. Do not put name or id in the URL.

**During work.** Per check item, persist in `marks[id]`: `user`, `ok`, `tries`, `hints`, `first_ok`, `later_corrected`. Pack totals: hint count, `audio_used` (Hear this / captions / praise / oops played at least once), `kinetic_used` (slider, houses drag, or other manipulative used).

**Submit.** One `kelyra.lesson` post with `state: "complete"` and `metrics.extras.complete_kind: "this_visit"`. The app writes `submissions.answers` via `student_report_lesson`. Preview does not post.

Required metrics on that post (names as live FoM):

| Field | What it is |
|---|---|
| `studentId` / extras `who` | From identity, not typed in class |
| `assignmentId` | From identity |
| `started_at`, `completed_at`, `duration_ms` | Session clock |
| `correct`, `incorrect` | Last-ok counts, not retry inflation |
| `hints` | Total hint taps |
| `audio_used` | Boolean (count stays in the page) |
| `kinetic_used` | Boolean |
| `marks` | Per-item tries / hints / ok / user |
| extras `item_ids`, `item_stems` | Stable ids + stem text (gap labels) |
| extras `skipped`, `wrong`, `later_corrected`, `retried`, `hinted` | Struggle lists |

Author v1 does not need richer analytics than this. Counts of audio plays or per-beat kinetic traces can wait.

## Manifest Author adds (Kelyra does not have this file yet)

`manifest.json` next to `index.html`. The class app can ignore it at first. Author and publish use it.

```json
{
  "spec": "kelyra.pack/1",
  "kind": "lesson",
  "deck_id": "fom-ch01-s11",
  "storage_deck_id": "fom-ch01",
  "version": "v4",
  "title": "FoM · 1.1 Ordering and Rounding",
  "beat_start": "hook",
  "beat_end": "s11c",
  "style_brief": "kelyra-lesson/2026-08",
  "voice": "eve",
  "beats": [
    { "id": "hook", "title": "Welcome", "role": "hook" },
    { "id": "s11t", "title": "1.1 Teach", "role": "teach" },
    { "id": "s11c", "title": "1.1 Check", "role": "check" }
  ],
  "items": [
    { "id": "houses", "beat": "s11c", "type": "houses",
      "stem": "Place 29.108 in the houses" },
    { "id": "a1", "beat": "s11c", "type": "text",
      "stem": "Word form of 506.209",
      "accept": ["five hundred six and two hundred nine thousandths"] },
    { "id": "a6", "beat": "s11c", "type": "text", "kind": "round",
      "stem": "Round 408,293.561 to the nearest hundred",
      "accept": ["408300", "408,300"] }
  ],
  "bridge": {
    "event": "kelyra.lesson",
    "complete_kind": "this_visit",
    "reports": ["item_ids", "item_stems", "later_corrected", "hinted", "skipped", "wrong"]
  }
}
```

Do not put `skill` / `skill_id` on v1 items. Live FoM has none. Gap labels are `stem` text. Nicer names stay the Edge `submission_review` job after Submit. Author must not require a live model to assign.

## Smallest publish hook

No new domain. No public bucket. No URL on the catalog row.

Today this already works without a studio, but **teachers cannot INSERT `lesson_packs`** (seed SQL or service role only, same as `build-practice-lesson`). Upload script: `scripts/upload-lesson.mjs` (quota gate, `--i-know-the-quota`).

1. Upload the folder to `lessons/{storage_deck_id}/{version}/`.
2. Service-role upsert `lesson_packs` (`published` false until OK).
3. Teacher in `class_teachers` calls existing `assignLesson`.
4. First new code: an authenticated `publish_lesson_pack` so Author is not stuck on service role. Then optional “Send to class” reuses `assignLesson`.

Round-trip test: extract a manifest from live 1.1, re-upload as `storage_deck_id=fom-ch01-author-test` / `deck_id=fom-ch01-s11-test`, assign to the trial class, Open, Submit, confirm a skill-gap draft. Do not rewrite FoM to do this.

## What Author is allowed to generate

Novice: ingest PPT/PDF/photos → suggested beats + stills + Eve scripts + accept-sets, all locked to STYLE-BRIEF. Teacher edits taste (copy, which still, which item stays).

Advanced: beat-level edit (what Lesson does by hand today).

Always:

- Paper math on stage, ASCII aliases on input
- One action per beat
- Original art only (no Disney IP, no BJU page scans as the hero if we cannot license them)
- Credits meter on generate (stills, TTS, rewrite). Assigning FoM you already built is free.

## Out of scope until the round-trip works

- Marketplace / trade / sell
- School-wide content catalogs
- A second HTML player
- Moving FoM into a new app
- Quiz/test as a new `assignments.kind`
- Standing up Author as a full product UI

## First slice (build order)

1. Freeze this spec. Fixture is `notes/authoring/fom-ch01-s11.manifest.json` (extracted from live v4, not a rewrite).
2. Authenticated `publish_lesson_pack` (upload folder + upsert catalog). Until then, `upload-lesson.mjs` + SQL. Teachers assign by hand via `assignLesson`.
3. Author ingest of one existing artifact (the BJU Ch1 PPT already in `teacher-decks/`) targeting 1.2 as a *new* pack, judged against STYLE-BRIEF and Lesson QA — only after 1.1 round-trips.

