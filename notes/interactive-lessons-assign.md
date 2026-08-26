# Interactive lessons → assign

**Status:** HOLD until Monday. Plan only. No Grok Build. Do not git-commit `notes/teacher-decks/` or BJU-derived stills. Do not buy a domain for this.

**Owners:** Ship (hosting), Lesson (folder contract), UX (WebView).

---

## Hosting (Kelyra Ship) — 2026-08-23

### Recommendation

**Private Supabase Storage bucket `lessons` + Edge Function `lesson-host` as a same-origin static gateway.** The Expo app does not host the HTML. There is no public bucket and no unlisted dump of stills.

### Why

v4 is a folder (`index.html` + relative `audio/*.mp3` + `img/scenes/*.png`), served today as `python3 -m http.server` on **:8772**. A per-object Storage signed URL as the WebView document would load `index.html` and then 403 every relative asset (the query token does not follow `audio/hook.mp3`). A public bucket would leak BJU-derived stills to anyone with the path. Expo/EAS hosting would bake curriculum into the binary and skip per-student expiry. An Edge gateway in front of a **private** bucket keeps relative paths working, mints a short-lived per-student token, and stays on the stack we already pay for (no new domain unless Chuck later wants a pretty origin).

### Local today

| | |
|---|---|
| Playable deck | `notes/teacher-decks/fom-ch01-v4/` (gitignored) |
| Entry | `index.html` |
| Assets | same-folder `audio/`, `img/` (relative URLs) |
| Dev server | `PORT_LESSON=8772` on Chuck’s Mac (`Kelyra_Servers.command`); READMEs also mention `python3 -m http.server 8765–8767` |
| Jump | `?beat=` is **QA only** (not student resume) |
| Progress | `localStorage` key `kelyra-fom-ch01-v4` (device-local; not a Kelyra session) |
| Git | `.gitignore` has `notes/teacher-decks/` — do not commit decks/stills without Chuck |

Existing private buckets: `photos`, `audio` (teacher-uid path prefix, signed TTL, never public). Lesson files get a **new** `lessons` bucket, not mixed into homework photos.

### What we are not doing (v1)

- **Public Storage / unlisted URLs** for stills or audio.
- **WebView document = one `createSignedUrl` on `index.html`** (relative assets break).
- **Iframe** the lesson inside a Kelyra HTML wrapper (UX).
- **Expo bundle / EAS static hosting** of the deck.
- **New paid CDN/domain** for the school pilot.
- **Lesson cookies** or copying Kelyra auth cookies into the WebView.
- **System Safari/Chrome** as the student path (UX: WebView only; browser is a bug fallback).

### Prod object layout

```
lessons/                          # private bucket
  {deck_id}/{version}/
    index.html
    audio/...
    img/...
```

Example: `lessons/fom-ch01/v4/index.html`. Teacher or an admin script uploads the folder; students never list the bucket.

### Launch URL (per assignment + student)

1. Teacher assigns a lesson pack (native UI — not WebView). Row stores `deck_id` + `version` (or a `lesson_pack_id`), not a raw URL.
2. Student taps Open. Authed RPC/Edge `student_open_lesson(assignment_id)` checks the submission cell belongs to that student, then mints a short-lived JWT (student_id, assignment_id, storage prefix, exp ~1h).
3. App loads that URL as the WebView **top-level** document (full URL, token in path or query). Do not persist the token in WorkRow, chrome, or share.
4. `lesson-host` verifies JWT, maps the remaining path onto `lessons/{deck_id}/{version}/…`, streams the object. Relative `audio/` and `img/` stay same-origin under the same token prefix.
5. If the token expires mid-session: app re-signs once and reloads; then a calm retry (UX).
6. Do **not** put student identity or resume beat in the URL. Resume/identity is `postMessage` between the page and the app (Lesson). `?beat=` stays QA-only. No cookied session on the lesson origin for v1.

Shape (illustrative, no custom domain):

`https://<project>.supabase.co/functions/v1/lesson-host/<token>/index.html`

Dev allowlist stays `http://localhost:8772` and LAN `:8772`.

### CORS / embed / WebView (locked with UX 2026-08-23)

- **In-app WebView**, not system browser. Feels like assigned work. Phone-first. No extra iOS back chevron if edge-swipe already pops (Q17).
- **Allowlist only (navigations):** prod `lesson-host` origin + local/LAN `:8772`. Block other navigations. Subresources: relative `audio/` `img/` plus Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) — that is a stylesheet/font fetch, not a page navigation. Do not allow the WebView to *navigate* to Google.
- **Top-level load**, not iframe. Skip CORS on the HTML document. CORS only matters if the page later fetches another origin (that origin must allow the **lesson** origin, not the Expo origin).
- Do not set `X-Frame-Options: DENY` as a v1 requirement if we stay top-level. If anyone iframes later: tight CSP `frame-ancestors`.
- **HTTPS in prod** (iOS ATS). Dev HTTP is localhost/LAN only. No mixed-content assets on prod.
- **Audio:** in-page tap-to-play. No autoplay dependency. WebView: inline media; `playsInline`; do not require a user action forever after the first gesture if we already do that elsewhere.
- **Cookies:** none required on the lesson host. Do not piggyback Kelyra auth cookies.
- Teacher assign/review stays **native**.

### Student-visible vs secret

The app may show deck title + assignment name. It must not show the signed token, storage path, or a copy-paste lesson URL.

### Upload / update path (when we leave HOLD)

Ship (or a one-off script) uploads a versioned folder to `lessons/`. New version = new prefix; in-flight tokens keep pointing at the old prefix until they expire. Do not auto-push GitHub. Curriculum files stay gitignored until Chuck says otherwise.

### Lesson folder contract (locked 2026-08-23)

See also Lesson’s §1 if present in this file.

- Entry: `index.html`
- Assets: relative `audio/` and `img/`, same origin as the HTML. Folder-scoped access, not per-file signed query tokens (`Audio()` cannot append signatures).
- No Kelyra `fetch` today. Only third party: `fonts.googleapis.com` (and font files on `fonts.gstatic.com`).
- Query: `?beat=` QA only. Identity/resume via `postMessage`, not the URL.
- Lesson origin ≠ Expo origin is expected and fine.

Gateway must keep the whole folder on one origin under one token prefix so relative `Audio()` and `<img>` work.

### Monday Grok Build (when HOLD lifts)

Not this file’s job to implement. Likely: `lessons` bucket + RLS (teacher write, no student list), `lesson-host` Edge Function, `student_open_lesson`, WebView screen with allowlist. Confirm with Chuck before any paid quota surprise (Storage size of scene PNGs is multi-MB each).

---

## Headline (UX)

Assign a FoM-style lesson webpage like other student work. Student opens it in-app WebView. Teacher reads metrics on the student record at Grade / Class / Student altitude. Not a second LMS. Teachers do not create classes.

**UX status:** HOLD. Spec only. No Grok Build until Monday credits and Chuck confirm. Do not git push.

---

## Teacher — assign a lesson (native)

### Where it lives

Class altitude (default): existing Assignments cabinet (`/class/{id}/assignments`). Entry is the same New assignment control as today, with a type of **Lesson** beside Practice / other existing types. No new tray tab. No sixth icon. No Lessons hamburger root.

Grade altitude: assign to the teacher’s existing classes in that grade (multi-select). Still no create-class.

Student altitude: assign to this student only (who-list pre-filled and locked).

Create/edit is a pushed screen (existing `/assignment/{id}` or equivalent). Back chevron, hamburger hidden, wordmark = title or “New assignment.” Q17: web shows the chevron; iPhone omits it when edge-swipe already pops.

### Create / edit sheet
Reuse the existing assignment create screen. Add type Lesson. Catalog picker for deck_id and version. No URL field. No create-class.

## Student — open the lesson (phone-first)

To-do uses the same WorkRow as other assigned work: title, pills Lesson / Due / Assigned or In progress or Done. No URL, no Open in Safari, no token. Tap opens the Lesson player (pushed).

### Lesson player
Hide floating tray. Header wordmark is the assignment title (marquee, no ellipsis). iPhone: no extra back chevron, edge-swipe pops (Q17). Web: back chevron. Hamburger hidden. No share, no Safari, no header refresh. Pull-to-refresh off so it does not steal drag.
Full-bleed WebView. No address bar. Allowlist navigations only (Ship). Off-list toast: That link is not part of this lesson.
Open calls student_open_lesson then top-level lesson-host token index.html (or :8772 in dev). Token expiry: re-sign once, then copy Could not keep the lesson open plus Try again. Never dump to Safari.
Done comes from Lesson postMessage or server; then pop to To-do as Done. No second native Done bar if the page has Done. Resume: new signed URL each Open. localStorage is cache only. beat query is QA only.

## Teacher review — metrics on the student record

Metrics are evidence, not a grade, until existing Approve. Show only what Lesson emits. Omit empty rows. No chart library. ListRow / WorkRow / pills.
Fields: completion time (started, duration, completed at); correct/incorrect counts; marks if the page scores; hint count; audio used; kinetic/drag used; other keys Lesson documents.

Student altitude: Work row for the lesson; tap Lesson attempt detail (title, due, status, metric rows). Optional Open lesson is teacher preview, not student token.
Class altitude: assignment row or gradebook column like other work. Cell Done / In progress. Tap = attempt detail. Lessons never enter Capture or Inbox.
Grade altitude: per-class n/m done as ListRow status. Tap class to Class altitude. No auto-email of scores.

## Web vs iPhone (Q17)
Lesson player: iPhone no back chevron (swipe pops); web has chevron. Tray hidden on player. Phone-first for the player. Teacher assign/review stays usual 640 lists.

## Copy
Pill: Lesson. Empty catalog: No lessons yet. Off-allowlist: That link is not part of this lesson. Expiry fail: Could not keep the lesson open. Never show raw URL, Open in browser, bucket names, or JWT.

## Held Build (do not send yet)
1. Teacher assign type Lesson on existing create (catalog, deck_id+version, no URL, no create-class).
2. Student WorkRow to Lesson player WebView (allowlist, hide tray, Q17, student_open_lesson).
3. Attempt detail plus Class cell plus Grade rollup from Lesson events.

## Out of scope v1
Teacher HTML upload; public URLs; parent WebView; system browser as a supported player; new tray tab; charts or AI tutor in player chrome; git push of notes/teacher-decks/.
