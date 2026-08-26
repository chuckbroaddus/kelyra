# QA: office password reset (app acceptance)

**Owner:** Kelyra QA  
**Status:** HOLD until implementation. Do not send Grok Build.  
**Separate:** L1/L2 lesson assign, Q17 iOS `<`.

Product: **administrator** and **superintendent** can reset a school login. **Teachers cannot.** Self-service **`/password`** (forced change after first/temp password) stays.

Nearby today (not the feature): `admin_create_login` + `must_change_password` → `/password` (`src/app/password.tsx`). Matrix `accounts.create`: superintendent `all`, administrator `school`, teacher `none`. Reset should use the **same office wall** (`is_school_admin` / office hats), not `is_staff` / `class_teachers`.

---

## Actors

| Hat | Login (this school) | Expect reset control |
|-----|---------------------|----------------------|
| Teacher (not also_administrator) | **@jacquee** (Jacquee Broaddus) | **Fail closed.** No Reset in People/UI. RPC denied. |
| Administrator | office admin JWT | **Pass.** Can reset school logins. |
| Superintendent | office super JWT | **Pass.** Same. |
| Target | any school login (teacher, student, parent, other staff) | After reset: temp/bootstrap password + must change, or documented equivalent. |

Do not use service role as the actor.

---

## Where (office)

Expect the control on the **People / login card** (create-login neighborhood), not on the teacher class desk, not on Ask as a superuser bypass.

Copy may be “Reset password” / “New temporary password.” Office sees the new secret **once** (same pattern as create-login temp password). Do not email it from this slice unless product says so.

`/password` remains the **signed-in user’s** “choose a new password” after `must_change_password`. Office reset should set that flag (or equivalent) so the target is forced through `/password` on next sign-in.

---

## Fail closed: Jacquee-as-teacher

| # | Step | Expected |
|---|------|----------|
| T1 | Sign in @jacquee. People / hamburger / student card / Ask. | No Reset password for anyone (including herself as office reset). |
| T2 | As jacquee JWT, call the reset RPC / `from('…')` write if one exists. | Error / empty. No password change. |
| T3 | Ask: “reset Colton’s password” / “reset @goodapple”. | Tool denied or no-op. Must not ride `is_staff`. |
| T4 | Jacquee still uses `/password` when **her** `must_change_password` is true. | Self-service only. That is not office reset. |

Fail the slice if a teacher JWT resets any auth user.

---

## Pass: office

| # | Step | Expected |
|---|------|----------|
| O1 | Administrator (not Jacquee-teacher) opens a school login (e.g. a FoM student or @goodapple if they are in **this** school). Reset. | Succeeds. Shows temp password once. Target `must_change_password` true. |
| O2 | Target signs in with temp, lands on `/password`, sets a new password, proceeds. | Old password dead. |
| O3 | Superintendent same as O1–O2 on a different login. | Pass. |
| O4 | Office cannot reset a login **outside the school** (if multi-school ever exists; v1 single school: still no random auth.users UUID). | Fail closed. |
| O5 | Reset does **not** create a class, change hats, or provision a new user. | Reset only. |

---

## `/password` stays

| # | Step | Expected |
|---|------|----------|
| P1 | Forced change after create-login or after office reset. | `/password` works. Not removed, not office-only. |
| P2 | Signed-in user with `must_change_password` false. | No requirement to use office reset to change own password later if product adds settings later; v1 may only be forced `/password`. Do not block `/password` for office-forced users. |

---

## Privilege extras

- Wall is **office hats**, not `class_teachers`. Teaching FoM does not grant reset on those students’ **auth** passwords unless the actor is administrator/superintendent. (Teacher may still assign lessons to them.)
- In-app AI must not reset passwords for a teacher account.
- Do not log the new password. Do not put service role in the Expo client.

---

## Pass / fail

**Pass:** T1–T4 fail closed for @jacquee; O1–O5 pass for administrator and superintendent; P1 `/password` intact.

**After implement:** run this file live (iPhone and/or :8081). File bugs with repro / expected / actual / severity. Write a Grok Build prompt only then; still HOLD until CoS/Chuck say send.
