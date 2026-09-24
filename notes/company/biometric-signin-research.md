# Biometric Sign-In Research Note (BIOAUTH-R1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1 (greenfield research; no prior BIOAUTH note)  
**Cards:** `t_c880a23a`  
**Access date for all URLs below:** 2026-09-24 (America/Chicago)

**Related (do not conflate):** Google / Apple OAuth (separate); office password reset (`resetLoginPassword`); chrome seat / hat switch (`src/lib/chrome/seat.ts` — not JWT); FERPA posture in `avg-spec-security-ferpa.md` / `docs/architecture.md`.  
**Grounded in live code:** Expo `^57`, `@supabase/supabase-js` `^2.57.4`, session via `AsyncStorage` in `src/lib/supabase/client.ts`, splash auth (`SplashLanding` / `sign-in.tsx`), `AuthProvider` + `signInWithPassword`. **No** `expo-local-authentication` or `expo-secure-store` in `package.json` / `app.json` today.  
**Constraints for this card:** Research + plan only. No app code, no SQL, no Hermes AI staffing, no force-push.

---

## Executive summary

CEO wants **fast re-auth** on phone (Face ID / Touch ID / Android biometrics) for teachers (capture, car-line), office, parents, and students — without turning Kelyra into a password-less identity provider that phones home with face/fingerprint data.

**Verdict:** Ship **biometric unlock of a locally stored Supabase session (refresh token)** as the P0 product, not “biometric as primary cloud factor.” Templates never leave the Secure Enclave / TEE. Expo SDK 57 already has first-party modules (`expo-local-authentication`, `expo-secure-store`). Kelyra’s gap is storage + gate UX: sessions live in **AsyncStorage** today (readable without biometrics). Web / Chromebook stays password (or later passkeys); native Face ID needs a **dev/prod client**, not Expo Go.

**Copy:** Apple LocalAuthentication + Keychain gating; Android BiometricPrompt Class 3 (`BIOMETRIC_STRONG`); Expo LocalAuthentication + SecureStore `requireAuthentication`; opt-in after successful password sign-in; fallback to password/handle.  
**Skip:** Storing the password in SecureStore; sending biometrics to Supabase; every-launch biometric with no opt-in; treating chrome seat switch as a biometric event; building a student Face ID requirement on shared classroom iPads in v1.

---

## 1. What “biometric sign-in” actually means

Three architectures are commonly confused:

| Model | What happens | Server sees | Fit for Kelyra |
|---|---|---|---|
| **A. Local biometric unlock of session** | After password/SSO once, device stores refresh session; Face ID/Touch ID/fingerprint unlocks access to that secret | Normal Supabase JWT refresh | **Recommended P0** |
| **B. Password replay after biometric** | App stores password; biometric reveals it and calls `signInWithPassword` | Password again | **Refuse** — expands breach surface for zero benefit |
| **C. Cloud biometric / passkey as primary factor** | WebAuthn / passkey registered with Supabase; assertion proves possession | Public key + assertion | **P2** (Supabase passkeys exist, experimental; web-first; native mobile needs extra glue) |

Apple and Android both emphasize that **biometric templates stay on-device**. The app receives only pass/fail (or a Keystore/Keychain unlock). Kelyra must never invent a “upload face for login” path.

---

## 2. Platform capabilities

### 2.1 Apple — LocalAuthentication, Face ID, Touch ID, Optic ID

- Framework: **LocalAuthentication** (`LAContext`). Policies: biometrics-only vs biometrics-or-device-passcode.  
- Biometry types include Face ID, Touch ID, and (visionOS / supported devices) Optic ID — all evaluated by the **Secure Enclave**; app never receives template data.  
- **NSFaceIDUsageDescription** required in Info.plist for Face ID; without it Face ID is blocked / falls back. Touch ID historically has no parallel usage string.  
- Pattern for sessions: protect Keychain items so reads require Face ID / Touch ID (Security + LocalAuthentication).  

Sources: [Local Authentication](https://developer.apple.com/documentation/localauthentication); [Accessing Keychain Items with Face ID or Touch ID](https://developer.apple.com/documentation/localauthentication/accessing-keychain-items-with-face-id-or-touch-id); [NSFaceIDUsageDescription](https://developer.apple.com/documentation/bundleresources/information-property-list/nsfaceidusagedescription). Accessed 2026-09-24 (America/Chicago).

### 2.2 Android — BiometricPrompt / BiometricManager

- Use **AndroidX Biometric** (`BiometricPrompt`), not deprecated FingerprintManager.  
- Authenticator classes (CDD): **Class 3 / BIOMETRIC_STRONG** (fingerprint, iris, or 3D face meeting strong requirements — eligible for Keystore crypto); **Class 2 / BIOMETRIC_WEAK** (e.g. some camera face unlock — BiometricPrompt OK, **not** Keystore ops); Class 1 convenience (lockscreen only).  
- Apps declare allowed authenticators (`BIOMETRIC_STRONG`, `BIOMETRIC_WEAK`, `DEVICE_CREDENTIAL`). Credential Manager is preferred for **initial** sign-in; BiometricPrompt for **re-auth**.  
- Google guidance last updated **2026-09-16 UTC** (shown on page).  

Sources: [Show a biometric authentication dialog](https://developer.android.com/identity/sign-in/biometric-auth); [BiometricManager.Authenticators](https://developer.android.com/reference/androidx/biometric/BiometricManager.Authenticators); [AOSP Biometrics](https://source.android.com/docs/security/features/biometric). Accessed 2026-09-24 (America/Chicago).

### 2.3 Expo / React Native modules (SDK 57 — matches Kelyra)

| Module | Role | Notes for Kelyra |
|---|---|---|
| **`expo-local-authentication`** | Prompt Face ID / Touch ID / Android biometrics | `hasHardwareAsync`, `isEnrolledAsync`, `supportedAuthenticationTypesAsync`, `authenticateAsync`, Android `biometricsSecurityLevel: 'strong' \| 'weak'` (default **weak** — raise to **strong** for auth) |
| **`expo-secure-store`** | Keychain / Keystore KV | `requireAuthentication: true` gates reads; keys invalidated when biometrics change; Android Auto Backup must exclude SecureStore (plugin default) |
| **Neither installed today** | — | Both need `npx expo install` + config plugins + **new native binary** |
| **Expo Go** | Face ID / `requireAuthentication` limited | Face ID **not** supported in Expo Go; SecureStore biometric option incomplete without NSFaceIDUsageDescription. Use **dev client / EAS build**. |

Sources: [Expo LocalAuthentication (v57)](https://docs.expo.dev/versions/v57.0.0/sdk/local-authentication/); [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/); [Using Supabase (Expo)](https://docs.expo.dev/guides/using-supabase/). Accessed 2026-09-24 (America/Chicago).

### 2.4 Web / PWA / Chromebook

- No Face ID / Touch ID API equivalent in Expo web today for this product law.  
- Browser **WebAuthn / passkeys** can use platform authenticators (Windows Hello, ChromeOS, some Android Chrome) — separate from `expo-local-authentication`.  
- Kelyra web should keep **handle + password** (and existing flows) for P0; treat passkeys as P2.

---

## 3. Auth architecture with Supabase (Expo)

### 3.1 Current Kelyra posture

```ts
// src/lib/supabase/client.ts (live)
auth: {
  storage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
}
```

Implications:

1. Session (access + refresh material) persists in **AsyncStorage** — not hardware-backed, not biometric-gated.  
2. Cold start → `AuthProvider` → `getSession()` can restore a full signed-in app **without** any biometric.  
3. Sign-in is `signInWithPassword` (handle → email path in `src/lib/auth/api.ts`).  
4. Chrome seat preference is a **separate** AsyncStorage key (`kelyra.chrome.seat.<profileId>`) — UI chrome only, not a second login.

### 3.2 Recommended architecture (Model A)

```
[Password / future SSO once]
        ↓
[Supabase session issued]
        ↓
[Opt-in: “Unlock with Face ID?”]
        ↓
[Move / mirror refresh session into SecureStore
 with requireAuthentication + THIS_DEVICE_ONLY]
        ↓
[Clear or lock plain AsyncStorage session while “locked”]
        ↓
Cold start → LocalAuthentication.authenticateAsync
        → read SecureStore → supabase.auth.setSession / refreshSession
        → AuthProvider refresh as today
```

Design rules:

1. **Never store the password** for biometric replay.  
2. Prefer **SecureStore-backed auth storage** (or LargeSecureStore pattern from Supabase Expo tutorials: AES key in SecureStore, blob in AsyncStorage) for *all* persisted sessions over time; biometric gate is an **extra** lock on cold start / foreground after timeout.  
3. On biometric enrollment change, SecureStore values with `requireAuthentication` become unreadable → fall back to full sign-in (documented Expo behavior).  
4. On **signOut**, wipe SecureStore session + AsyncStorage session; keep only a non-secret “biometric preferred” preference if desired (or wipe that too on explicit disable).  
5. Tie `autoRefreshToken` to `AppState` (`startAutoRefresh` / `stopAutoRefresh`) per Expo Supabase guide — independent of biometrics but required for mobile session hygiene.

Sources: [Expo + Supabase guide](https://docs.expo.dev/guides/using-supabase/); Supabase Expo React Native tutorial (LargeSecureStore pattern on GitHub `supabase/supabase` docs tree). Accessed 2026-09-24 (America/Chicago).

### 3.3 Passkeys / WebAuthn overlap (Model C — later)

Supabase documents **experimental** passkeys: enable in Auth settings, `auth: { experimental: { passkey: true } }`, then `registerPasskey` / `signInWithPasskey`. This is a **true passwordless primary factor** and complements (does not replace) local Face ID unlock.

Sources: [Supabase Auth passkeys](https://supabase.com/docs/guides/auth/passkeys); [signInWithPasskey](https://supabase.com/docs/reference/javascript/auth-signinwithpasskey); [registerPasskey](https://supabase.com/docs/reference/javascript/auth-registerpasskey). Accessed 2026-09-24 (America/Chicago).

### 3.4 “Remember device” vs every-launch gate

| Mode | Behavior | Recommendation |
|---|---|---|
| **Remember unlocked** | Biometric once per install / until logout; session auto-refreshes | Weak for shared tablets |
| **Gate every cold start** | Biometric (or passcode fallback) before hydrating session | **Default for teacher phone P0** |
| **Gate after idle** | Background → foreground after N minutes | **P1** for capture / Ride contexts |
| **Remember device cookie only (web)** | Standard session cookie / localStorage | Web P0; no Face ID |

Product default proposal: **opt-in**, then **cold-start gate** on iOS/Android; idle gate configurable later; web unchanged.

---

## 4. Concrete Kelyra change list (what would have to be done)

Research-only inventory — **do not implement from this note**.

| Area | Change | Priority |
|---|---|---|
| Dependencies | Add `expo-local-authentication`, `expo-secure-store` via `npx expo install` | P0 |
| `app.json` plugins | Config plugins + Face ID permission strings; Android gets `USE_BIOMETRIC` via library | P0 |
| `ios.infoPlist` | `NSFaceIDUsageDescription` e.g. “Kelyra uses Face ID so you can unlock your school account on this device.” | P0 |
| `ios.config.usesNonExemptEncryption` | Set `false` if only OS crypto (SecureStore export compliance) | P0 |
| EAS / native | New **development + production builds**; Face ID untestable in Expo Go | P0 |
| `src/lib/supabase/client.ts` | Replace or wrap AsyncStorage with SecureStore-backed storage; optional biometric-gated read path | P0 |
| Auth UX | Post-password opt-in sheet; Settings toggle; splash “Unlock with Face ID / fingerprint” | P0 |
| `AuthProvider` | Locked vs unlocked state; do not treat “session exists in SecureStore” as signed-in until unlock succeeds | P0 |
| Logout / revoke | `signOut` clears SecureStore + AsyncStorage; server revoke via existing Supabase signOut | P0 |
| Multi-account | v1: one remembered account per install; switching accounts requires password | P0 law |
| Hat / seat | **No biometric for chrome seat switch**; seat stays local preference after unlock | P0 law |
| Web | Hide biometric controls; keep password splash | P0 |
| Idle re-lock | AppState timer for Ride / Capture | P1 |
| Student / under-13 policy | Default **off**; office/parent policy TBD | P1 product |
| Shared family iPad | Warn + prefer passcode fallback; optional “don’t enable on shared devices” copy | P1 |
| MDM / school-managed | Document that MDM can disable biometrics; fail open to password | P1 |
| Passkeys | Experimental Supabase enablement + web first | P2 |
| Android Class selection | Force `biometricsSecurityLevel: 'strong'` for auth unlock | P0 |

---

## 5. Security & privacy

### 5.1 On-device templates (non-negotiable)

- Face / fingerprint / iris **templates never leave the device**. Kelyra servers, Supabase, and model vendors must not receive biometric media for login.  
- App stores only: encrypted session material + boolean preferences.  
- Audit / logging: record “biometric unlock success/fail” as local UX events if needed — **not** biometric samples.

### 5.2 FERPA / education records

- Biometric unlock does not create a new education record class if templates stay on-device.  
- Session tokens remain the access path to FERPA-sensitive APIs; RLS / hats unchanged.  
- Risk is **device possession**: unlocked phone ≈ signed-in teacher/parent. Mitigate with cold-start / idle gates and short access-token lifetime (Supabase default refresh model).  
- Not a legal opinion; engineering posture only (same disclaimer as AVG security notes).

### 5.3 COPPA / under-13 students

- Student logins may be under 13. Default biometric **off** for student role until Chuck decides.  
- Shared classroom devices: **do not** encourage Face ID binding to a child account. Prefer session that ends at logout / end of period.  
- Parental consent for biometric *features* is a product/legal question separate from on-device OS biometrics the child already uses to unlock the iPad.

### 5.4 Shared family iPad / dual-hat staff

- One Apple ID / one enrolled face can unlock **whoever’s session is stored**. Product must show **which account** will unlock (display name / handle) before prompt.  
- Dual-hat staff: biometric unlocks the **account**; chrome seat still chooses office/teacher/parent tray after unlock — never merge trays (existing seat law).

### 5.5 MDM / school-managed devices

- Schools may restrict biometrics or use shared carts. Always keep password path.  
- If `hasHardwareAsync` / `isEnrolledAsync` / `canUseBiometricAuthentication` is false → hide toggle, no dead-end.

### 5.6 Threats to refuse

| Threat / anti-pattern | Response |
|---|---|
| Store password in SecureStore for replay | Refuse |
| Upload selfie for “Kelyra Face Login” | Refuse |
| Silent biometric without opt-in | Refuse |
| Biometric required with no password fallback | Refuse |
| Expo Go as Face ID QA SoT | Refuse — use device builds |
| Weak Android face unlock for token access | Prefer `'strong'` |

---

## 6. UX recommendations

| Audience | Default | Prompt timing | Fallback |
|---|---|---|---|
| **Teacher (phone)** | Offer opt-in after first successful password sign-in | Cold start; optional idle for Capture/Ride | Password / handle |
| **Office** | Same as teacher | Cold start | Password |
| **Parent** | Offer opt-in; slightly softer copy | Cold start | Password |
| **Student** | **Off** until policy | N/A | Password |
| **Web / Chromebook** | No biometric UI | — | Password (passkeys P2) |

Copy principles:

1. Equal-weight **Allow** / **Not now** on opt-in.  
2. Settings → Security: Enable / Disable unlock; Disable clears SecureStore session gate (forces password next time).  
3. Prompt message examples: “Unlock Kelyra”, “Confirm it’s you to open grades and captures”.  
4. After lockout / biometry change → clear gated secrets → password screen with plain explanation.

---

## 7. Needed vs desired

| Needed (P0) | Desired (P1–P2) |
|---|---|
| Opt-in Face ID / Touch ID / Android strong biometric unlock of Supabase session | Idle re-lock timers |
| SecureStore (+ plugin / Face ID string) + LocalAuthentication | Student-role policy matrix |
| Dev/prod client builds | Multi-account switcher |
| Password fallback always | Passkeys / WebAuthn |
| Web: no fake biometric | Android Credential Manager initial sign-in |
| Sign-out wipes gated tokens | Per-school MDM admin docs |
| Strong Android biometrics for auth | Optic ID explicit QA matrix |

---

## 8. Open questions for Chuck

1. **Student accounts:** keep biometric permanently off, office-controlled, or parent-controlled?  
2. **Idle timeout:** required for Ride / Capture in v1, or cold-start only?  
3. **Shared family iPad:** warn-only, or block enabling biometrics when multiple profiles historically used the device?  
4. **Passkeys on web:** prioritize after native unlock, or skip until Google/Apple OAuth epic?  
5. **Session storage migration:** big-bang move all Auth storage to SecureStore, or biometric gate layered on top of AsyncStorage first?  
6. **Default after opt-in:** gate every cold start (recommended) vs “stay unlocked until logout”?

---

## 9. Citations (access date 2026-09-24 America/Chicago)

1. Expo LocalAuthentication (SDK 57) — https://docs.expo.dev/versions/v57.0.0/sdk/local-authentication/  
2. Expo SecureStore — https://docs.expo.dev/versions/latest/sdk/securestore/  
3. Expo Using Supabase — https://docs.expo.dev/guides/using-supabase/  
4. Apple LocalAuthentication — https://developer.apple.com/documentation/localauthentication  
5. Apple Keychain + Face ID / Touch ID — https://developer.apple.com/documentation/localauthentication/accessing-keychain-items-with-face-id-or-touch-id  
6. Apple NSFaceIDUsageDescription — https://developer.apple.com/documentation/bundleresources/information-property-list/nsfaceidusagedescription  
7. Android biometric auth dialog — https://developer.android.com/identity/sign-in/biometric-auth (page notes last update 2026-09-16 UTC)  
8. Android BiometricManager.Authenticators — https://developer.android.com/reference/androidx/biometric/BiometricManager.Authenticators  
9. AOSP Biometrics classes — https://source.android.com/docs/security/features/biometric  
10. Supabase Auth passkeys — https://supabase.com/docs/guides/auth/passkeys  
11. Supabase signInWithPasskey — https://supabase.com/docs/reference/javascript/auth-signinwithpasskey  
12. Supabase registerPasskey — https://supabase.com/docs/reference/javascript/auth-registerpasskey  

---

## 10. Out of scope (this card)

- App / SQL / Edge implementation  
- Hermes profile staffing / kelyra-qa-loop  
- OAuth provider epics  
- Changing RLS, hats, or chrome seat semantics beyond documenting that biometric ≠ seat switch  
