# Slice 01 — Capture → match → draft gap

First vertical slice. This pause is **only the foundation**: schema, teacher auth, one class, typed roster.

Not in this pause: camera, STT, matching, gap drafts, Approve.

## What you can do now

1. Create a teacher account.
2. Create a class (typed name).
3. Type student names onto that class.
4. A student row is only a name. No form.

## How to run

Use the full walkthrough: **[setup.md](setup.md)**.

That page covers creating the Supabase project, turning off email confirmation, running the SQL file, filling `.env`, starting `npm run web`, and what each screen should look like.

## What to look for

- RLS: a second account must not see the first teacher’s class.
- Students have no extra fields.
- Join code is generated (shown on the class screen; unused until a later slice).

## Built so far

1. Teacher auth, class, typed roster.
2. Capture photo (+ optional voice) → private Storage → `captures.status = unassigned`.
3. Inbox lists those items.

Not built: spoken-name match, gap drafts, Approve.

How to run capture: [setup.md](setup.md) section 10.
