# Push Notifications — Research + Roadmap Digest (NOTIFY-R1 / P1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**SoT pair:** `notes/company/push-notifications-research.md` · `notes/company/push-notifications-plan.md`  
**Card:** `t_47c87ab8`  
**Access date for citations:** 2026-09-24 (America/Chicago)

This dated file is a **readable pack** for Chuck. Full detail lives in the SoT pair above. Research + roadmap only — **no app implementation**. No Hermes staffing.

---

## Top recommendations (P0–P2)

### P0 (phones — reverse soft-skip carefully)

1. **P0-1/2** — Add `expo-notifications` + EAS **APNs** + **FCM v1** credentials; permission UX after a value moment (not splash); Android channels for Ride / Needs / Messages.  
2. **P0-3/4** — Store **per-device Expo tokens** (RLS); send only from a **Supabase Edge Function** → Expo Push Service with **`EXPO_ACCESS_TOKEN`** enhanced security; prune `DeviceNotRegistered`.  
3. **P0-5/8** — Preference center + quiet hours; **payload minimization** (no scores / IEP / twin mix).  
4. **P0-6/7** — Wire **Ride** + **Needs draft ready** first; deep-link into existing surfaces.  
5. **P0-9** — **Student push off**; no student enable UI.

### P1

- **Web Push (VAPID)** for Chromebook / desk browsers; optional message + calendar reminder pushes; richer mute; ops metrics; office Ride alert alignment.

### P2

- Direct APNs/FCM escape hatch; opt-in school topics (never grade topics); policy-gated student push; multi-school credential isolation.

---

## Research (digest)

### Verdict

Ship push as a **server-mediated alert layer** on top of the existing in-app bell — not a new chat product. Best fit for Expo 57 + Supabase: **Expo Push Service fan-out to APNs + FCM**, with **Web Push later for desktop**. Architecture today still says **Push | Skip in v1** (`docs/architecture.md`); this roadmap proposes a controlled reverse for Ride/Needs.

### Platforms (one table)

| Platform | Mechanism | Kelyra path |
|---|---|---|
| iOS / iPadOS | **APNs** HTTP/2 | Via Expo (P0) or direct (P2) |
| Android | **FCM HTTP v1** | Via Expo (P0) or direct (P2) |
| Chrome / Edge / Firefox desktop | **Web Push** → FCM / Mozilla | P1 |
| Safari macOS 16+ | **Web Push** → APNs | P1 |
| iOS Safari tab | No push | Installed PWA only (limitation) |
| Native Mac/Win apps | — | **Out of scope** |

### Supabase send path

```
Authorized event → Edge Function → Expo Push API → APNs/FCM
```

Documented by Supabase (Expo + FCM Edge examples). Kelyra should use a **device token table** (not a single profile column) and resolve audience with **existing hat / parent_students / twin laws before send**.

### Concrete Kelyra gaps today

- No `expo-notifications` dependency / plugin.  
- No push Edge function.  
- No device token / prefs schema.  
- In-app `/notifications` is pull-only.  
- EAS project exists (`eas.json`) but push credentials not part of this research’s live verification (Eng confirms at implement time).

### Privacy

Lock screens are bystander-visible → **FERPA soft posture**: minimize copy; deep-link into RLS screens; COPPA → students off; twins never mixed; OS permission ≠ product consent.

---

## Plan (digest)

**Locked decision:** Expo Push Service P0; Web Push P1; direct vendor APIs P2.

**Event defaults:** Ride + Needs on (after opt-in); messages cautious; calendar P1; grades never as lock-screen scores; students off.

**Effort guess:** P0 ~1–2 Eng weeks post-credentials + 2-device QA; P1 Web Push ~1–2 weeks.

---

## Open questions for Chuck

1. Reverse architecture soft-skip for Ride/Needs now?  
2. Messages in P0 or P1?  
3. Ride quiet-hours bypass default?  
4. Web Push required for “other computers” in first paid tier?  
5. Student forever-off vs later policy?  
6. Fold `t_c20b5e0d` office banned-parent alert into this epic?

---

## Citations (primary — access 2026-09-24 CT)

- https://docs.expo.dev/push-notifications/push-notifications-setup/  
- https://docs.expo.dev/push-notifications/sending-notifications/  
- https://docs.expo.dev/push-notifications/sending-notifications-custom  
- https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns  
- https://firebase.google.com/docs/cloud-messaging/send/v1-api  
- https://supabase.com/docs/guides/functions/examples/push-notifications  
- https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription  
- https://www.w3.org/TR/push-api/  

Full citation list in the research SoT.

---

## Files

| Path | Role |
|---|---|
| `notes/company/push-notifications-research.md` | Research SoT |
| `notes/company/push-notifications-plan.md` | Roadmap / plan SoT |
| `notes/research/2026-09-24-push-notifications-report.md` | This digest |
