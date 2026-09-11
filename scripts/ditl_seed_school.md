# DITL throwaway school seed — apply notes (devops-release)

**Card:** `t_7ac5b996`  
**SQL file:** `scripts/ditl_seed_school.sql`  
**Fixture bible:** `notes/company/ditl-seed-school.md`  
**Status:** SQL is **produce-only**. Do **not** apply from grok-bot / consultant loops. Live apply is **CEO-authorized `devops-release` only**.

---

## What this seeds

| Fixture | Concrete |
|---------|----------|
| **F-SCHOOL** | New `schools` row `ditl-Sandbox Academy` (logical slug `ditl-sandbox` — **docs only**; `schools` has **no** `slug` column) |
| **F-OFFICE** | `ditl-super` (superintendent), `ditl-admin` (administrator / F-DH-OP) |
| **F-TEACHER-A/B/C** | Avery Quinn / Blake Nguyen / Casey Ortiz |
| **F-DH-TP** | Teacher A `parent_id` → P-AVERY → **S3 only** (English, not Math) |
| **F-DH-OP** | Admin `parent_id` → P-ADMIN → **S1** |
| **F-PARENT-1/2** | Taylor Lee → S1+S2; Cameron Brooks → S1 |
| **F-STUDENTS** | S1–S5 (twins Lee; S5 preferred Sammy) |
| **F-STUDENT-LOGIN** | `ditl-student-s1`, `ditl-student-s2` |
| **F-RIDE** | Lines A/B, vehicles V1–V5, curb duty Teacher C on Line A, **zero** `pickup_restrictions` |
| **F-AVG** | Math syllabus published, categories sum **100**, `publish_to_family=true` |
| **F-FOCUS** | S4 `current_focus_skill_id` + assigned practice |
| **F-ASSIGN** | Graded Math HW on S1 + practice cells |
| **F-QUIZ** | `category=quiz` assignment + placeholder key asset |
| **F-DRAFTS** | Draft capture+gap on S4; Unassigned capture |
| **F-GRADES-HIST** | Graded cells for S1 in **Math and English** (S1 multi-enrolled) |
| **F-DIARY / F-FEED** | No DB rows — feature/UI paths only |
| **F-ARTIFACTS** | On disk: `notes/qa-fixtures/ditl/` (not inserted as storage blobs) |
| **F-AUTHOR** | Studio paths only — **no** class-app DB |

**Intentionally absent:** attendance / archive tables (product GAP). Do not invent them.

---

## Isolation warnings (read before apply)

1. **Never** run against a production classroom school as “the” school wipe/replace. This script **inserts a new** `schools` row named `ditl-Sandbox Academy` and binds all ditl-* profiles to that `school_id`.
2. **Prefer a dedicated throwaway Supabase project** when possible. Product RPCs such as `admin_create_login` / `school_claim_superintendent` often use `schools limit 1` or assume a **single** superintendent globally — coexisting with production can surprise operators.
3. **Never** retarget seed rows onto a production `school_id`.
4. **Synthetic PII only** (`ditl-*`, F-* fixed UUIDs, fake plates `DITL-*`, `*.ditl-sandbox.test` emails). No Broaddus / real family data.
5. **Passwords** in SQL are throwaway placeholders (`DITL-super-test`, `DITL-admin-test`, `DITL-teacher-test`, `DITL-parent-test`, `DITL-student-test`). Rotate or set out-of-band if the project is shared. Do not reuse on production.
6. **Idempotent guard:** aborts if `ditl-Sandbox Academy` already exists **or** any `profiles.username like 'ditl-%'`.
7. **Asset storage paths** (`ditl-sandbox/*.jpg`) are placeholders — storage objects are **not** uploaded by this SQL. Capture/quiz UI may 404 media until fixtures are copied or paths pointed at `notes/qa-fixtures/ditl/`.
8. **Do not unblock** parent program `t_7ebea568` from apply of this seed alone. Do not staff QE unless CEO asks.
9. **RLS:** apply as SQL editor / service role (bypasses RLS). Client JWT apply will fail on `auth.users` / `teachers` inserts.

---

## How to apply later (devops-release)

### Pre-flight

- [ ] CoS/CEO authorize throwaway school only  
- [ ] Confirm target project is throwaway **or** operators accept second `schools` row + second superintendent profile  
- [ ] Migrations through Ride + syllabus already applied on target  
- [ ] Backup / snapshot if shared project  
- [ ] Confirm no existing `ditl-%` usernames  

### Apply

1. Open Supabase SQL editor (or Hermes devops `execute_sql` / `apply_sql_by_filename.py` — **authorized release only**).
2. Run the full file:

```text
scripts/ditl_seed_school.sql
```

3. Expect `NOTICE` lines summarizing school id, student/vehicle counts, and `pickup_restrictions=0`.
4. Smoke: sign in as `ditl-teacher-a` / `ditl-parent-1` / `ditl-student-s1` with placeholder passwords; confirm Math roster and Line A list.

### Post-apply checks

- [ ] Dual-hat: Teacher A parent of S3 **not** in Math; Admin parent of S1  
- [ ] Twins S1/S2 on Math; S5 aliases include Sammy  
- [ ] `pickup_restrictions` empty for this school  
- [ ] F-AVG weights: homework 40 + quiz 40 + participation 20 = 100  
- [ ] Point QE artifacts at `notes/qa-fixtures/ditl/`  

### Teardown (throwaway school only)

Follow bible §11.2 reverse-create order. Destroy **only** the ditl school graph — never production. Prefer deleting the throwaway project.

---

## Fixed UUID map (stable F-* binding)

| Key | UUID |
|-----|------|
| F-SCHOOL | `d1715000-0000-4000-a000-000000000001` |
| ditl-super | `…000010` |
| ditl-admin | `…000011` |
| ditl-teacher-a | `…000012` |
| ditl-teacher-b | `…000013` |
| ditl-teacher-c | `…000014` |
| ditl-parent-1/2 | `…000015` / `…000016` |
| ditl-student-s1/s2 | `…000017` / `…000018` |
| S1–S5 | `…000101`–`…000105` |
| P1 / P2 / P-AVERY / P-ADMIN | `…000201`–`…000204` |
| C-MATH / C-ENG / C-SPARE | `…000301`–`…000303` |
| Line A / B | `…000401` / `…000402` |
| V1–V5 | `…000501`–`…000505` |

Full key list is in the SQL `ditl_ids` temp table.

---

## Filenames for devops apply

Exact paths to hand to devops-release:

1. `scripts/ditl_seed_school.sql` — seed body (this apply)  
2. `scripts/ditl_seed_school.md` — these notes  

Reference only (not applied as SQL): `notes/company/ditl-seed-school.md`.
