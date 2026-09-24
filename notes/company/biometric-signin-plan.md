# BIOAUTH-P1: Biometric unlock plan (Face ID / Touch ID / Android)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Card:** `t_c880a23a` · Research SoT: `notes/company/biometric-signin-research.md` (BIOAUTH-R1)  
**Status:** Spec / plan only — **no app code**, no SQL, no migrations, no kelyra-qa-loop, no Hermes AI staffing, no force-push.  
**Audience:** CEO / CoS review. **Not** an implementation ticket. Do not staff `senior-developer` until Chuck says send.

**Stack ground:** Expo SDK 57 · Supabase Auth (`signInWithPassword` + AsyncStorage session) · dual-hat chrome seats (not JWT).

---

## 0. One-line product law

| Surface | Job | What it is not |
|---|---|---|
| **Biometric unlock** | After a normal password (or future SSO) sign-in, optionally gate **this device’s stored Supabase session** behind Face ID / Touch ID / Android Class 3 biometrics | Not cloud face login; not password storage; not a second identity provider |
| **Password / handle** | Always available fallback; only path on web P0 | Not removed when biometrics enabled |
| **Chrome seat** | Office / teacher / parent tray after unlock | Not a biometric step; never merges trays |
| **Passkeys (later)** | Optional WebAuthn primary factor | Not P0; does not replace local unlock |

**CEO bar:** Fast re-open of Kelyra on phone for capture / car-line / parent check — without shipping biometric templates off-device or FERPA-risk selfie upload.

---

## 1. Problem statement (grounded)

Today a teacher who signed in yesterday opens Kelyra and is **already in** via AsyncStorage session (`src/lib/supabase/client.ts`). That is convenient on a personal phone and risky on a shared / briefly unlocked device. Mobile contexts (Capture, Ride) want **seconds-to-useful**, not full typing of handle + password every launch — but schools need a clear security story.

Competitors and OS vendors already solved this as **local unlock of an existing account**, not as “send face to server.” Expo ships the modules; Kelyra has not wired them.

---

## 2. Architecture decision (locked for plan)

**Choose Model A from BIOAUTH-R1:** biometric unlock of locally stored refresh/session material.

**Refuse Model B:** password-in-SecureStore replay.  
**Defer Model C:** Supabase experimental passkeys to P2.

High-level flow (implementation sketch only — not code to paste-ship):

1. User signs in with handle + password (existing).  
2. Opt-in sheet: enable Face ID / fingerprint unlock.  
3. Persist session with SecureStore (`requireAuthentication`, device-only accessibility where available).  
4. While “locked,” do not expose `AuthProvider.session` as active app chrome.  
5. Cold start → `LocalAuthentication.authenticateAsync` (Android `biometricsSecurityLevel: 'strong'`) → read secret → `setSession` / refresh → existing `AuthProvider` path.  
6. Failure / cancel / biometry change → password splash.  
7. Sign-out → delete gated secrets + normal `supabase.auth.signOut()`.

---

## 3. Needed vs desired

| Needed (ship first) | Desired (later) |
|---|---|
| Opt-in native biometric unlock | Idle re-lock (Ride/Capture) |
| SecureStore + LocalAuthentication + app.json Face ID string | Student-role policy |
| EAS / dev client (not Expo Go Face ID QA) | Multi-account remembered list |
| Password always works; web hides biometric | Passkeys on web |
| Sign-out wipes gated tokens | MDM admin playbook |
| Show which account will unlock | Credential Manager initial sign-in |
| Strong Android biometrics for token gate | Explicit Optic ID QA matrix |

---

## 4. Phased roadmap

### P0 — Native unlock MVP (personal teacher / office / parent phones)

| ID | Work | Acceptance (product-level) |
|---|---|---|
| **P0-1** | Add `expo-local-authentication` + `expo-secure-store`; config plugins; `NSFaceIDUsageDescription`; Android biometric permissions via library | Dev client build installs; Face ID prompt appears on real iPhone; fingerprint/face prompt on Android |
| **P0-2** | Secure session storage path (replace or wrap AsyncStorage for auth) | Session material not left solely in plain AsyncStorage when biometric enabled |
| **P0-3** | Opt-in after successful password sign-in + Settings toggle | Equal-weight Allow / Not now; toggle can disable and force password next launch |
| **P0-4** | Cold-start unlock gate before app chrome | Cancel/fail → password; success → same home as today |
| **P0-5** | Android `biometricsSecurityLevel: 'strong'` for unlock | Weak-only devices fall back to password path (no silent weak unlock of tokens) |
| **P0-6** | Sign-out / revoke hygiene | No readable refresh token remains after Sign out |
| **P0-7** | Web / Chromebook | No biometric controls; password splash unchanged |
| **P0-8** | Hat law unchanged | Unlock restores account; chrome seat preference still separate AsyncStorage; no biometric on seat switch |
| **P0-9** | Multi-account law v1 | One remembered account; switching user requires password sign-in of the other account |

### P1 — Hardening & school policy

| ID | Work | Acceptance |
|---|---|---|
| **P1-1** | Idle re-lock after background (configurable minutes; tighter defaults near Capture/Ride) | Returning from background past threshold requires biometric or password |
| **P1-2** | Shared-device warning copy when enabling | User sees “anyone with Face ID on this iPad can open this account” |
| **P1-3** | Student role default **off**; optional office/parent policy later | Student Settings does not offer toggle unless policy allows |
| **P1-4** | Biometry-change invalidation UX | Clear explanation → password; no crash loops |
| **P1-5** | AppState-tied token refresh hygiene | Align with Expo Supabase `startAutoRefresh` / `stopAutoRefresh` guidance |
| **P1-6** | QA matrix on real devices | iPhone Face ID, Touch ID (if available), Pixel fingerprint, one Class-2-only Android (must refuse strong path) |

### P2 — Passkeys & cross-platform primary factors

| ID | Work | Acceptance |
|---|---|---|
| **P2-1** | Evaluate Supabase experimental passkeys for **web** | Register / sign-in with platform authenticator without storing password |
| **P2-2** | Native passkey glue (if still experimental / incomplete) | Only after web prove-out |
| **P2-3** | Credential Manager as initial Android sign-in (Google guidance) | Optional; does not remove password |
| **P2-4** | Multi-account switcher with per-account biometric | Explicit CEO ask |

---

## 5. Per-hat user stories (acceptance Chuck can judge)

### Teacher
**US-T-1** — As a teacher on my phone, after I opt in, I open Kelyra with Face ID and land in my last seat ready to Capture.  
**ACCEPT:** No password typing; Cancel returns to password; Sign out requires password next time.

### Office
**US-O-1** — As office staff, same unlock as teacher; switching to Parent seat still does not ask Face ID again in the same unlocked session.  
**ACCEPT:** Seat switch ≠ re-auth in P0 (idle re-lock is P1).

### Parent
**US-P-1** — As a parent, I can enable fingerprint unlock; my child’s grades never unlock for a different remembered account on the same device without that account’s password.  
**ACCEPT:** Unlock screen shows my display name/handle.

### Student
**US-S-1** — As a student (incl. under-13), biometric is not offered in P0.  
**ACCEPT:** No student Settings toggle until Chuck flips policy (P1-3).

### Web user
**US-W-1** — As a Chromebook / desktop user, I never see a broken Face ID button.  
**ACCEPT:** Password only in P0–P1; passkeys only if P2 ships.

---

## 6. Hard non-goals (copy into future Eng ticket)

| Refuse | Why |
|---|---|
| Store password for biometric replay | Breach surface |
| Upload face/fingerprint to Kelyra or Supabase for login | Privacy / FERPA optics; OS already forbids useful template access |
| Require biometrics with no password fallback | Lockouts, MDM, shared devices |
| Expo Go as Face ID acceptance SoT | Platform limitation |
| Biometric gate on chrome seat switch | Seat is not authentication |
| Auto-enable without opt-in | Consent |
| Weak Android biometrics for session secret access | Prefer Class 3 / `strong` |
| Student biometric default on | COPPA / shared classroom risk |
| SQL / RLS changes for biometric | Tokens unchanged; no server biometric table |

---

## 7. Implementation approach (for future Eng — not this card)

Ordered workstream suggestion:

1. **Native deps + app.json** → EAS preview build.  
2. **Storage adapter** behind `getSupabaseClient()` with feature flag.  
3. **Auth lock state machine** in / near `AuthProvider` (`locked` \| `unlocked` \| `signed_out`).  
4. **Splash / Settings UI** (opt-in, unlock button, disable).  
5. **Security tests** (static assertions: no password written to SecureStore; signOut deletes keys; web path never imports LocalAuthentication prompts).  
6. **Device QA checklist** (P1-6).  
7. **Passkeys spike** only after P0 baked (P2).

No migrations expected for P0. No Edge functions required for Model A.

---

## 8. Security / privacy gates before Eng send

- [ ] Templates on-device only (documented in Eng ticket).  
- [ ] No password in SecureStore (test).  
- [ ] Sign-out wipe (test).  
- [ ] Student default off.  
- [ ] Web hide.  
- [ ] Strong Android for token unlock.  
- [ ] Face ID usage string truthful and school-appropriate.  
- [ ] FERPA note: session still subject to existing RLS; biometric is device possession control only.

---

## 9. Open questions (block Eng until answered if marked ★)

1. ★ Student biometric policy (off / office / parent)?  
2. ★ Cold-start only vs idle re-lock in first Eng send?  
3. Session storage: full SecureStore migration vs gate layered on AsyncStorage?  
4. Passkeys priority vs OAuth epics?  
5. Shared iPad: warn vs block enable?

---

## 10. Deliverables already produced (this card)

| File | Role |
|---|---|
| `notes/company/biometric-signin-research.md` | Research SoT (BIOAUTH-R1) |
| `notes/company/biometric-signin-plan.md` | This plan (BIOAUTH-P1) |
| `notes/research/2026-09-24-biometric-signin-report.md` | Chuck-readable digest |

**Next (not this card):** Chuck review → optional Eng ticket with P0 checklist only.
