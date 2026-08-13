# How to run Kelyra (Slice 01)

You are setting up **teacher sign-in + one class + typed student names**.  
There is no camera, matching, or AI yet.

Do these steps in order. Use a computer with a browser. A phone is optional.

---

## 0. What you need

- This repo on your machine: `/Users/chuck/projects/kelyra`
- **Node 20 or newer**
- A free [Supabase](https://supabase.com) account (email or GitHub)

Check Node in Terminal:

```bash
node -v
```

You want `v20…` or `v22…`. If that command fails, install Node from https://nodejs.org (LTS).

---

## 1. Open the project

```bash
cd /Users/chuck/projects/kelyra
npm install
```

`npm install` only needs to succeed once (or after we change `package.json`).

---

## 2. Create a Supabase project

1. Go to https://supabase.com/dashboard and sign in.
2. Click **New project**.
3. Fill in:
   - **Name:** `kelyra` (any name is fine)
   - **Database password:** invent a strong password and **save it** (you will not need it for the app, only if you use the DB URL later)
   - **Region:** pick the closest to you
4. Click **Create new project**.
5. Wait until the dashboard says the project is ready (often 1–2 minutes). Do not continue while it is still provisioning.

---

## 3. Turn off “confirm email” (needed for local review)

If this stays on, **Create account** will look like it worked but you will not be signed in.

1. Left sidebar: **Authentication**.
2. Open **Sign In / Providers** (or **Providers**).
3. Click **Email**.
4. Find **Confirm email** and **turn it OFF**.
5. Save if there is a Save button.

Leave the Email provider itself **enabled**.

---

## 4. Create the database tables

This runs our Slice 01 schema (teachers, classes, students, captures, etc.).

1. In the same Supabase project, left sidebar: **SQL Editor**.
2. Click **New query**.
3. On your computer, open this file in any editor:

   `/Users/chuck/projects/kelyra/supabase/migrations/20260812000000_slice01_foundation.sql`

4. Select **all** of it (the whole file) and copy.
5. Paste into the Supabase SQL editor.
6. Click **Run** (or press Cmd+Enter).
7. You should see **Success**. No red error.

If you see `already exists`, you probably ran it twice. That is OK for tables; if a **policy** name conflicts, say so and we can adjust. Do not run it a third time unless we tell you to.

You can confirm tables exist: left sidebar **Table Editor** — you should see `teachers`, `classes`, `students`, `enrollments`, `assets`, `captures`, `skills`, `skill_gaps`.

---

## 5. Copy the API keys into `.env`

1. In Supabase: gear **Project Settings** (bottom left).
2. Open **Data API** (sometimes still labeled **API**).
3. Copy two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long JWT starting with `eyJ…`

4. In Terminal:

```bash
cd /Users/chuck/projects/kelyra
cp .env.example .env
```

5. Open `/Users/chuck/projects/kelyra/.env` in an editor. It should look like this when you are done (use **your** URL and key, no quotes, no spaces around `=`):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

6. Save the file.
7. Do **not** commit `.env`. It is gitignored.

You do **not** need `XAI_API_KEY` for this slice.

---

## 6. Start the app (web — easiest to review)

```bash
cd /Users/chuck/projects/kelyra
npm run web
```

Wait until the terminal prints a local URL. Expo usually opens a browser on its own.

Typical address: **http://localhost:8081**

If the browser is blank, wait a few seconds; the first web bundle is slow. If it still fails, open that URL manually.

**If you already had Expo running before you created `.env`, stop it (Ctrl+C in that terminal) and run `npm run web` again.** Expo only reads `.env` at startup.

---

## 7. Click through — what you should see

### First screen

- Title **Kelyra**
- **Sign in** link  
  If you instead see “Supabase is not configured”, `.env` is missing, wrong, or Expo was not restarted.

### Sign in

1. Click **Sign in**.
2. Email: use a real-looking address you control, e.g. `you+kelyra@gmail.com`.
3. Password: at least 6 characters.
4. Click **Create account** the first time (not Sign in).
5. You should land on **Your classes** and see your email.

If Create account says to confirm email, go back to step 3 — confirm email is still on.

### Create a class

1. Type `Room 14 math` in the box.
2. Click **Create class**.
3. You should see the class screen with that name and a **Join code** (6 characters).

### Add students

1. Type `Maya Chen` → **Add student**.
2. Add `Jamal W.`.
3. Add `Mateo`.
4. All three names should appear under **Roster**.
5. Refresh the browser (Cmd+R). The class and names should still be there.

That is the whole Slice 01 foundation.

---

## 8. Optional: phone (App Store Expo Go)

This project is **Expo SDK 54**, which matches the App Store Expo Go. Do **not** use a sign.expo.dev install.

1. Install **Expo Go** from the App Store / Play Store (SDK 54). Do **not** use the sign.expo.dev build.
2. Same computer, same Wi‑Fi as the phone:

```bash
cd /Users/chuck/projects/kelyra
npm start
```

3. Scan the QR code with Expo Go (Android) or the Camera app (iPhone).
4. Sign in with the **same** teacher account.

---

## 9. If something breaks

| What you see | What to do |
|---|---|
| “Supabase is not configured” | `.env` missing or Expo not restarted. URL must start with `https://`. |
| Create account works but you are not signed in | Turn off Confirm email (step 3). |
| `Invalid API key` | You pasted the **service_role** key or truncated the anon key. Use **anon public** only. |
| `relation "teachers" does not exist` | Migration did not run. Repeat step 4. |
| `new row violates row-level security` | You are not signed in, or the teacher row was not created. Sign out, sign in again. |
| Blank web page | Wait for Metro; try http://localhost:8081 ; check the terminal for red errors. |
| Port already in use | Ctrl+C other Expo windows, or use the URL Expo printed. |
| Expo Go wants a newer version | Use the **App Store** Expo Go (SDK 54). Delete any sign.expo.dev copy. Restart `npm start`. |

To stop the app: focus the terminal and press **Ctrl+C**.

---

## What this slice is not

You will **not** see a working camera, voice match, homework analysis, grade book, or practice yet. Those are later pauses.

## 10. Capture a paper into Unassigned (now available)

Still signed in, with at least one class and a few students.

### On the web (easiest)

1. Home → **Capture homework** (or http://localhost:8081/capture).
2. Click **Choose photo** and pick a picture of a worksheet (any image is fine).
3. Optionally **Record name** — say “This is Mateo” — then **Stop recording**. You can skip this.
4. Click **Save to Unassigned**.
5. You should land on **Unassigned** and see the photo (and “voice note attached” if you recorded).
6. Refresh. The item should still be there.

The photo is **not** assigned to Maya/Jamal/Mateo yet. That is correct.

### On a phone

1. `npm start` and open Expo Go.
2. **Capture homework** → **Take photo** (allow camera).
3. Optional: record a name (allow microphone).
4. **Save to Unassigned** → check **Unassigned inbox**.

If save fails with a storage/RLS error, confirm the migration created the `photos` and `audio` buckets (Storage in the Supabase dashboard).

## 11. File a capture on a student (name match)

You do **not** need an xAI key for this check.

1. Capture a photo.
2. In **Name you said**, type `Mateo` (or record and type it — STT is off until we deploy the function).
3. **Save to Unassigned**.
4. Inbox should say **Filed on Mateo**.
5. Try again with a junk name like `nobody`. It should stay **Unassigned**. Tap **Mateo** on the chip row to attach it by hand.
6. Two students named Maya would stay Unassigned if you only say “Maya”. That is correct.

## 12. Review gaps and Approve

1. Capture a photo and file it on Mateo (type the name, or pick him in the inbox).
2. You should land on **Mateo’s** page with the photo.
3. AI gaps only appear if `analyze-homework` is deployed with `XAI_API_KEY`. For this review you can **type a gap** (`two-digit regrouping`) → **Add gap**.
4. **Approve**. The page should say Approved.
5. Open Mateo again from the class roster. It should still say Approved.
6. Optional: capture another photo, file it, **Note only** — photo stays, no approved gap.

## 13. Assign practice and student to-do

Run this SQL in the Supabase SQL Editor (same as the first migration):

`supabase/migrations/20260813000000_practice.sql`

Then:

1. As the teacher, open Mateo → **Assign practice**. You should see `Practice: … : assigned`.
2. Note the class **Join code** on the class screen.
3. On the same computer, open **Student join** (or http://localhost:8081/join). You can stay signed in.
4. Enter the join code → **Find class** → tap **Mateo**.
5. Answer the three items → **Submit**. It should say Submitted.
6. Back on Mateo’s teacher page, practice should show `submitted`.

Items are placeholder prompts unless `generate-practice` is deployed with an xAI key.

## 14. Grade book

No new SQL. Open the class → **Grade book**.

You should see a grid:

- Rows = students
- Columns = approved work and assigned practice
- Mateo’s practice cell = **Submitted** (if you completed the last step)
- His approved capture = **Done**
- Other students = **—** or **Assigned** if you assigned them practice

New Approves also add a work column automatically.

**Export CSV** downloads the grid (web) or opens a share sheet (phone). No new SQL.

## 15. Parent progress link

Run this SQL in the Supabase SQL Editor:

`supabase/migrations/20260813000001_parent_access.sql`

Then:

1. Teacher: open Mateo → **Create parent link**.
2. Copy the URL that appears (or tap it).
3. Open that URL in the same browser or a private window.
4. You should see Mateo’s name, class, focus skill, practice **Done** or **Assigned**, and a one-line teacher note if you Approved after this change.
5. You should **not** see scores, the homework photo, or other students.

Existing Approves may have a focus skill but no sentence. New Approves write “Still working on …”.

On Mateo’s page, **Mark focus done** clears the current focus skill. The parent page will then show “None yet” until you Approve another gap.

## 16. Note without a photo

No new SQL.

1. Capture → skip the photo.
2. Type `Jamal guessed on the quiz` (must include the student name).
3. Save. You should land on Jamal with that note. No gap/Approve required.
4. Open Mateo: **Earlier notes** lists older captures under the latest one.

## 17. Class overview

No new SQL. Open the class home.

You should see **This week**: unassigned count, draft count, common approved gaps, and who has a current focus. Tap a name to open that student.
