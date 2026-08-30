# publish_lesson_pack — class-app interface (no code)

Owner: Kelyra Author (product). Class-app implementation goes through Chief of Staff / Grok Build. This is the v1 contract, not a prompt to ship.

**Signed 2026-08-27** by Kelyra Author, with amends below. Do not send Grok Build until Chuck says go.

Live walls this must not break (`20260824000001_lesson_assignments.sql`):

- `lesson_packs` has SELECT for taught teachers only. **No authenticated INSERT/UPDATE/DELETE.** Seed / service role only.
- Bucket `lessons` is private. **No `storage.objects` policies.** Students never list. `lesson-host` reads after a short-lived lesson JWT from `student_open_lesson`.
- Catalog row never stores a URL. Students have no SELECT on the catalog.
- `assignLesson` stays the assign path. Publish does not assign.
- `lesson_packs.published` SQL default is **true**. Omitting the column on INSERT would list the pack in the picker. This RPC must set `published = false` **explicitly**.
- `lesson_packs` has **no `school_id`**. Once a row is `published = true`, every taught teacher sees it in `listLessonPacks` (app filter `published = true`). A published flip is follow-up, not this hook.

`build-practice-lesson` and `scripts/upload-lesson.mjs` already write objects + catalog with **service role**. This hook is that path, authenticated, so Author is not stuck on a laptop key.

## Callers (Chuck 2026-08-27)

Teachers **and** staff may call it.

| Seat | Live Kelyra name | May call publish | Notes |
|---|---|---|---|
| Teacher | `role = teacher` or `also_teacher` | Yes | Need not teach a class to *publish*. Assign still requires `class_teachers`. |
| Staff / office | `superintendent` or `administrator` | Yes | Office is **not** in `class_teachers` today, so they cannot SELECT the catalog. Publish still allowed. |
| Parent / student / anon | — | No | 401 |

Authz is **teacher or office**, not `is_staff_profile` and not `class_teachers`-required. `is_staff` includes teacher and is the wrong gate. Office is not in `class_teachers` today; requiring that row locks them out.

Follow-up (not this hook): office catalog SELECT, and a later flip of `published` to true.

## Shape

Authenticated Edge function `publish_lesson_pack` (user JWT). Function uses service role **only** to write Storage + upsert `lesson_packs`. Caller JWT is the actor; service role is infrastructure, same as `lesson-host`.

Not a client `insert()` on `lesson_packs`. Not a public bucket. Not an Ask tool in v1. No service-role key in the Author client.

### Request

User JWT in `Authorization`. Multipart or a zip + JSON sidecar.

| Field | Rule |
|---|---|
| `deck_id` | Assignable id. Check `^[A-Za-z0-9][A-Za-z0-9._-]*$`. Example `fom-ch01-s11-test`. |
| `version` | Same charset. Example `v4`. |
| `storage_deck_id` | Folder prefix. Same charset. Host path is `lessons/{storage_deck_id}/{version}/`, **not** `deck_id`. |
| `title` | Picker label. |
| `beat_start` / `beat_end` | Inclusive beat ids. Must exist in the pack. |
| `kind` | **`lesson` only on this function.** Other kinds are a different RPC later. |
| files | **Required:** `index.html` and `manifest.json`. May include `audio/**`, `img/**`. Skip backup dirs (`png-original`, `ava-original`, `eve-staging`). |

`published` is **not** a caller field. This RPC **always writes `published = false` in the upsert payload**. Do not rely on a default: the live column default is `true`. `listLessonPacks` filters `published = true` in app code, so a defaulted insert would show up in every taught teacher's picker.

`manifest.json` is required. Minimum:

```
{
  "spec": "kelyra.pack/1",
  "kind": "lesson",
  "deck_id": "…",
  "version": "…",
  "storage_deck_id": "…",
  "beat_start": "…",
  "beat_end": "…",
  "items": [{ "id": "…", "stem": "…" }]
}
```

Manifest `deck_id` / `version` / `storage_deck_id` / `kind` / beat window must match the request fields. Class app may ignore the file; Author and publish use it.

Optional later: `created_by` on the row. v1 can omit it; actor is in Edge logs.

### Response (200)

```
{
  ok: true,
  deck_id,
  version,
  storage_deck_id,
  beat_start,
  beat_end,
  title,
  published: false,
  bytes
}
```

Caller then uses existing `assignLesson({ classIds, title, pack: { deckId, version } })`. Publish does not take `class_id`.

**`assignLesson` must keep accepting unpublished packs.** Live `loadPackSlice` does **not** require `published`. Do not add a `published = true` filter on assign. Do not regress taught-teacher SELECT of unpublished review packs. The picker (`listLessonPacks`) is the only `published = true` filter; leave it that way.

Errors: 401 unsigned / wrong seat, 400 bad slug / missing `index.html` or `manifest.json` / kind not `lesson`, 409 live FoM protected or shared-folder lock, 413 over size, 502 storage write failed.

## Writes

1. Validate slugs, `index.html` + `manifest.json` present, beat window present, `kind = lesson`, quota.
2. Shared-folder lock (v1 is 1:1): if another `lesson_packs` row already uses this `storage_deck_id` + `version` (different `deck_id`), **refuse the teacher**. Slicing a shared folder is office JWT **and** `replace_live: true` only.
3. Put objects at `lessons/{storage_deck_id}/{version}/…` with service role (`x-upsert: true` for that prefix only).
4. **Replace-prefix:** after the puts, delete any object still under that version prefix that was **not** in this request. Iterate must not leave orphan audio/img.
5. Upsert `lesson_packs` on unique `(deck_id, version)`: title, **`published: false` (column always present in the write)**, storage_deck_id, beat_start, beat_end. Never omit `published`.
6. Do not touch `assignments`, `submissions`, or student tables.
7. Do not add `storage.objects` policies.

Idempotent: same `(deck_id, version)` overwrite of **that** prefix is how Author iterates (then replace-prefix). Different `(deck_id, version)` is a new pack.

## Protect live FoM

Round-trip proof uses **new** ids, not an overwrite of the teacher-trial pack:

- `deck_id = fom-ch01-s11-test`
- `storage_deck_id = fom-ch01-author-test`
- `version = v4` (or `v1`)
- Assign to the trial class **while unpublished**, Open, Submit, confirm a skill-gap draft from stems.

Refuse to write `lessons/fom-ch01/v4/` or upsert `deck_id` in `{fom-ch01, fom-ch01-s11, fom-ch01-s12, …}` unless office JWT **and** an explicit `replace_live: true`. Teachers cannot replace live FoM.

## Size / quota (locked 2026-08-27)

Measured live `notes/teacher-decks/fom-ch01-v4/` excluding `png-original/`, `ava-original/`, `eve-staging/` (and `captions/ava-original/`):

- **9,843,850 bytes** (71 files, 9.39 MiB)
- Skipped backups were 44,707,116 bytes (not uploaded)

Per-call cap = that size + 25%:

- **12,304,812 bytes** (11.73 MiB)

413 if the request exceeds this. **This is a safety ceiling, not a size target.** New Author emit should come in well under it: WebP (or smaller) stills, compressed spoken audio, no backup originals (`png-original` / `ava-original` / `eve-staging` never ship). Optimize for web disbursement (storage + network) without looking cheap — STYLE-BRIEF quality still fails muddy or generated-looking art. Live FoM v4 is fat because of textbook stills; do not treat that folder as the budget. No service-role key in the Author client.

## What this is not

- Not assign, not “Send to class”.
- Not HTML generation (Author emits `index.html` **before** this call).
- Not a `published = true` flip (follow-up).
- Not office catalog SELECT (follow-up).
- Not a second player, not a URL on the catalog, not student PII in the zip.
- Not quiz/test kinds on this RPC (`kind` stays `lesson`).
- Not marketplace.
- Not Ask `publish_lesson`.


## Living contract

Metrics, item types, and pack scope are **living**. They expand via revisions of this file, package-spec, and author-kelyra-interface (`kelyra.pack/1` → `/2`). v1 must still speak the live FoM bridge. The class app ignores unknown extras. Author must not require new metrics Kelyra cannot ingest until that revision exists.

## Proof (after code exists)

1. Author (or CoS) packs live 1.1 as `fom-ch01-s11-test` / `fom-ch01-author-test`.
2. Teacher JWT calls `publish_lesson_pack` (row is unpublished).
3. Teacher `assignLesson` to the trial class **from that unpublished pack**.
4. Student Open → identity lock → work → Submit for a Grade.
5. `student_report_lesson` drafts gaps from stems iff struggle; none on clean first-try.
6. Live `fom-ch01/v4` objects and rows unchanged.

No Grok Build send until Chuck says go.
