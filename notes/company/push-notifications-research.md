# Push Notifications Research Note (NOTIFY-R1)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Status:** Ready for Chuck review  
**Revision:** R1 (greenfield research; architecture soft-skipped push in MVP)  
**Cards:** `t_47c87ab8`  
**Access date for all URLs below:** 2026-09-24 (America/Chicago)

**Related (do not conflate):** In-app bell `/notifications` + messaging (`docs/messaging-v1.md` — pull, not OS push); weekly parent email (S8 desired, not SMS); biometric unlock (`biometric-signin-research.md` — session gate, not push); Ride / Needs / Calendar epics (event sources).  
**Grounded in live stack:** Expo `^57`, `@supabase/supabase-js` `^2.57.4`, EAS (`eas.json` present), Edge Functions under `supabase/functions/` (no `push` function today). **No** `expo-notifications` in `package.json` / `app.json` plugins.  
**Architecture stance today:** `docs/architecture.md` — **Push | Skip in v1** — Inbox is pull; FCM only when weekly email/SMS appears. This card revisits that soft skip.  
**Constraints for this card:** Research + roadmap only. No app code, no SQL apply, no Hermes AI staffing, no force-push.

---

## Executive summary

CEO wants a clear answer on **how Kelyra reaches teachers, office, parents, and (carefully) students on locked phones and other computers** when Ride, Needs, messages, or calendar events matter — without turning notification payloads into a FERPA leak or a spam firehose.

**Verdict:** Kelyra should ship push as a **server-mediated, preference-gated, deep-linked alert layer** on top of the existing in-app bell — not as a second messaging product. For Expo + Supabase, the lowest-risk P0 path is:

1. Client: `expo-notifications` + EAS credentials (APNs key + FCM v1 service account).  
2. Store **Expo push tokens** (and later Web Push subscriptions) per device, RLS-bound to `auth.uid()`.  
3. Send via a **Supabase Edge Function** → Expo Push Service (`https://exp.host/--/api/v2/push/send`) with `EXPO_ACCESS_TOKEN` enhanced security — Expo fans out to **APNs** (iOS) and **FCM v1** (Android).  
4. Desktop / Chromebook / Safari macOS: **Web Push (VAPID)** as P1, not a second native macOS/Windows binary.  
5. Direct APNs/FCM from Edge is a P2 escape hatch (finer control, more ops).

**Copy:** Expo Notifications + Expo Push Service + Supabase Edge webhook pattern; OS permission + in-app preference center; deep links into Ride / Needs / messages / calendar.  
**Skip:** Silent education-record dumps in the lock-screen body; class-wide blast topics; student push default-on; twin/parent audience mix; Expo Go as Android QA SoT (SDK 53+ remote push removed from Expo Go on Android).

---

## 1. What “push” means for Kelyra (vs what already exists)

| Layer | What it is | Status today |
|---|---|---|
| **In-app Notifications** | Derived Needs / practice / parent note rows on `/notifications` | Shipped (pull while app open) |
| **Messages unread badge** | Mail icon count | Shipped |
| **OS push (this card)** | System banner/sound when app backgrounded or device locked | **Not wired** |
| **Email invite / digest** | Parent invite; S8 weekly digest desired | Invite path exists; digest not push |
| **SMS** | L6 deferred (A2P) | Out of scope |

Push does **not** replace Approve, hat walls, or RLS. It only **nudges the right person to open a surface they already may see**.

---

## 2. Platform capabilities

### 2.1 Apple — APNs (iOS, iPadOS; also underlies Safari Web Push on Apple)

- Provider API: **HTTP/2** + TLS 1.2+ to `api.push.apple.com` (prod) or `api.sandbox.push.apple.com` (dev).  
- Path: `POST /3/device/<device_token>`; token-based auth via ES256 JWT (`authorization: bearer …`) or certificate auth.  
- Headers: `apns-topic` (bundle id), `apns-push-type`, `apns-priority`, optional collapse id.  
- JSON body with `aps`; payload **≤ 4 KB** (VoIP 5 KB). Binary protocol retired.  
- Entitlement required; paid Apple Developer account.  

Sources: [Sending notification requests to APNs](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns). Accessed 2026-09-24 (America/Chicago).

### 2.2 Google — FCM HTTP v1 (Android; also Chromium Web Push backend)

- Endpoint: `POST https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`.  
- Auth: OAuth 2.0 access token with scope `https://www.googleapis.com/auth/firebase.messaging` (service account).  
- Targets: device registration token, topic, or condition. Platform blocks for `android` / `apns` / `webpush`.  
- **Legacy FCM HTTP APIs retired (June 2024)** — use v1 only.  

Sources: [Send a message using FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/send/v1-api); [Customize a message across platforms](https://firebase.google.com/docs/cloud-messaging/customize-messages/cross-platform). Accessed 2026-09-24 (America/Chicago).

### 2.3 Web Push API (desktop Chrome / Edge / Firefox / Safari macOS; iOS Safari only as installed PWA)

- Standards: Push API + Service Worker; encryption RFC 8291; auth **VAPID** RFC 8292.  
- Client: `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → store `endpoint` + `p256dh` + `auth` on server.  
- Browser push services: Chrome/Edge → FCM; Firefox → Mozilla autopush; Safari → APNs.  
- **Safari macOS:** Safari 16+ / macOS Ventura+ standard Web Push.  
- **iOS/iPadOS Safari:** push only for **Home Screen / installed PWA** (16.4+), not ordinary tabs.  
- Payload ~4 KB; Safari requires **user-visible** notifications (no silent background push).  

Sources: [MDN PushSubscription](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription); [W3C Push API](https://www.w3.org/TR/push-api/); [Meet Web Push for Safari (WWDC22)](https://developer.apple.com/videos/play/wwdc2022/10098/); [web-push library](https://github.com/web-push-libs/web-push). Accessed 2026-09-24 (America/Chicago).

### 2.4 Expo Notifications / EAS (matches Kelyra Expo 57)

| Piece | Role | Kelyra note |
|---|---|---|
| **`expo-notifications`** | Permissions, channels, listeners, Expo + device tokens | **Not installed** today |
| **`getExpoPushTokenAsync({ projectId })`** | Token for Expo Push Service | Needs EAS `projectId` |
| **`getDevicePushTokenAsync()`** | Raw APNs / FCM / Web PushSubscription | For direct send path |
| **Expo Push Service** | `POST https://exp.host/--/api/v2/push/send` → FCM v1 + APNs | Recommended P0 send target |
| **EAS credentials** | APNs key + FCM v1 service account on project | Required for real devices |
| **Expo Go** | Android remote push **removed SDK 53+** | Use **dev/preview client** for QA |
| **Enhanced security** | `Authorization: Bearer EXPO_ACCESS_TOKEN` | Enable before production |

Sources: [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/); [Send notifications with the Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/); [Send with FCM and APNs](https://docs.expo.dev/push-notifications/sending-notifications-custom); [expo-notifications SDK](https://docs.expo.dev/versions/latest/sdk/notifications/). Accessed 2026-09-24 (America/Chicago).

### 2.5 macOS / Windows “other computers”

| Path | Fit |
|---|---|
| **Kelyra web + Web Push** in Chrome/Edge/Firefox/Safari | **Recommended** for desktop/Chromebook |
| Native Electron / Catalyst wrapper | Not needed for P0–P1 |
| macOS APNs for a separate Mac app | Out of scope (no Mac binary) |
| Windows Notification Service native | Out of scope (web covers Chromebooks + teacher desks) |

---

## 3. Supabase send architecture (recommended)

Supabase has **no first-party “push product.”** The documented pattern is **Edge Function + Database Webhook** (or RPC-triggered invoke) calling Expo or FCM.

### 3.1 Recommended P0 path — Expo Push Service

```
Event (Ride / message / Needs / calendar)
  → Postgres row or Edge job (authorized, RLS-aware)
  → Edge Function `push` (service role; verify_jwt=false for webhook OR signed invoke)
  → SELECT device tokens for intended user_ids (hat/scope already decided)
  → POST exp.host/--/api/v2/push/send  (+ EXPO_ACCESS_TOKEN)
  → Expo → APNs / FCM
  → later: getReceipts; prune DeviceNotRegistered
```

Official guide: [Sending Push Notifications (Supabase)](https://supabase.com/docs/guides/functions/examples/push-notifications) — Expo example stores `profiles.expo_push_token`, webhook on `notifications` insert, Edge POSTs to Expo. Accessed 2026-09-24 (America/Chicago).

**Kelyra adaptation (do not copy the toy schema blindly):**

- Prefer a **`device_push_tokens`** (or `user_devices`) table: many devices per user; platform; token; `expo` vs `web_push`; last_seen; revoked_at.  
- Do **not** put the Expo token only on `profiles` if teachers have phone + iPad.  
- Preference columns / `notification_prefs` table: per-event enable, quiet hours, channel (push / email / none).  
- **Audience resolution happens before send** using existing hat / `parent_students` / twin focus laws — push is a delivery pipe, not an ACL.

### 3.2 Alternate path — direct FCM v1 from Edge

Same webhook pattern; Edge uses Google service-account JWT → FCM v1. Useful if Web Push and Android share FCM, or if Expo Push SLA is insufficient. More secret handling (`service-account.json` / Vault). Documented in the same Supabase guide (FCM section).

### 3.3 Alternate path — direct APNs from Edge

HTTP/2 provider from Deno is possible but operationally heavier (connection reuse, JWT rotation, sandbox vs prod). Prefer Expo fan-out until volume or feature gaps force it.

### 3.4 Topics vs per-user

| Model | Use |
|---|---|
| **Per-user / per-device tokens** | **Default** — messages, Ride for one parent, Needs for one teacher |
| **FCM/Expo topics** | School-wide weather day, optional office blast — **P2**, with explicit opt-in |
| **Class topic auto-subscribe** | **Refuse** for education records — leaks sibling/roster adjacency |

---

## 4. Concrete Kelyra work (inventory — not implementation)

### 4.1 Client / Expo

1. `npx expo install expo-notifications` (+ device / constants as needed).  
2. `app.json` plugin `expo-notifications`; iOS push entitlement via EAS; Android POST_NOTIFICATIONS (13+) via library/plugin.  
3. Permission UX: request **after** value moment (first Ride shift, first unread Needs) — not on cold splash.  
4. Register token → upsert device row with `user_id`, platform, app version.  
5. Foreground handler + response listener → **deep link** (`/ride…`, Needs draft, `/messages/{id}`, calendar event).  
6. Android notification **channels**: `ride`, `needs`, `messages`, `calendar` (user can mute one channel).  
7. **Dev/preview EAS build** required for real push QA.

### 4.2 Credentials / ops

1. Apple Push Key (`.p8`) in EAS Credentials.  
2. Firebase project + FCM v1 service account uploaded to EAS.  
3. Expo Access Token + enhanced push security.  
4. Edge secret `EXPO_ACCESS_TOKEN` (and later VAPID keys / FCM SA).  
5. Receipt sweeper (cron Edge or scheduled) for `DeviceNotRegistered`.

### 4.3 Database / server (sketch only — no apply)

| Object | Purpose |
|---|---|
| `device_push_tokens` | token, provider (`expo`\|`fcm`\|`apns`\|`web`), platform, user_id, device_label, updated_at |
| `notification_prefs` | per user (+ optional per student focus for parents): event_key → on/off, quiet_hours |
| Outbox / `push_jobs` (optional) | idempotent send queue, ticket/receipt ids |
| Webhook or invoke from existing event writers | Ride check-in, Needs ready, message insert, calendar reminder |

RLS: users manage own devices/prefs; **only service role sends**.

### 4.4 Product surfaces to deep-link

| Event family | Deep link target | Priority candidate |
|---|---|---|
| Ride / car-line | Ride session / student card | **P0** (time-critical) |
| Needs / draft ready | Needs / capture inbox item | **P0** |
| Direct / family message | `/messages/{threadId}` | **P0** (optional; badge already exists) |
| Calendar reminder | Calendar day / event | **P1** |
| Office alert (banned parent attempt — tracked elsewhere) | Office Ride alert | **P1** (see `t_c20b5e0d`) |
| Weekly digest | Prefer **email** first (S8) | Not push P0 |

---

## 5. Product: who gets what (hat laws)

| Hat | Default push posture | Hard rules |
|---|---|---|
| **Teacher** | Opt-in; Ride + Needs on; class posts muted | Own classes only |
| **Office** | Opt-in; Ride school alerts; staff messages | School scope; not every homework |
| **Parent** | Opt-in; **focused child only**; twins **never mixed** in one notification | Body never names the other twin’s education record |
| **Student** | **Off** in P0 (COPPA / shared iPad) | If ever on: no peer names; school/parent policy |
| **Dual-hat** | Push follows **signed-in profile role**, then seat | Teacher-parent does not inherit other-class blasts |

**Quiet hours:** default 21:00–07:00 local (user timezone) for non-Ride; Ride may break quiet hours only if user enables “car-line urgent.”

**Payload minimization:** title/body = category + non-identifying cue (“Maya is at the curb”, “Needs: 3 drafts ready”) — **no scores, IEP text, full transcripts, photo URLs, or join codes** in the OS-visible body. Rich detail only after authenticated open.

---

## 6. Privacy / compliance

| Concern | Stance |
|---|---|
| **FERPA** | Lock-screen text can be visible to bystanders → treat as semi-public. Minimize; deep-link into RLS-gated screens. Do not claim school-official without DPA (`docs/architecture.md`, `avg-spec-security-ferpa.md`). |
| **COPPA / under-13** | Student push **default off**; no behavioral ad IDs; parental/school policy before any student enable. |
| **Consent** | OS permission ≠ product consent. In-app preference center required; equal-weight Skip. |
| **Device tokens** | Pseudonymous device identifiers; revoke on sign-out / uninstall receipt; do not log tokens to client analytics. |
| **Vendors** | Expo / Apple / Google see delivery metadata + chosen title/body — same soft FERPA posture as other subprocessors; keep bodies clean. |
| **Twins / siblings** | Fail-closed audience; never “your children” aggregate that mix records. |
| **Biometric card interaction** | Unlocking the app (BIOAUTH) is separate from receiving a banner; a locked phone can still show a minimized push. |

---

## 7. Needed vs desired

| Needed (to reverse architecture soft-skip safely) | Desired (later) |
|---|---|
| Expo notifications client + EAS APNs/FCM creds | Direct APNs/FCM for advanced APNs features |
| Device token table + RLS | FCM topics for school weather |
| Edge send + Expo receipts hygiene | Web Push on all desktop browsers |
| Pref center + quiet hours | Critical alerts / interruption levels |
| Ride + Needs P0 events | Calendar reminders, rich images |
| Parent twin fail-closed | Student-role push matrix |
| Payload minimization law | Local notification scheduling for study reminders |
| Dev-client QA (not Expo Go Android) | Multi-school topic admin |

---

## 8. Open questions for Chuck

1. **Reverse the architecture soft-skip now?** Or keep push behind “after weekly email (S8)” as originally written?  
2. **P0 event set:** Ride + Needs only, or also 1:1 messages?  
3. **Student devices:** permanently off until district policy, or parent-toggle later?  
4. **Quiet hours default** and whether Ride may bypass?  
5. **Web Push P1** for teacher Chromebook desks — required for “other computers,” or phone-only for first year?  
6. **Expo Push vs direct FCM** as long-term SoT (ops ownership)?  
7. **Office banned-parent Ride alert** (`t_c20b5e0d`) — fold into this roadmap or stay separate epic?

---

## 9. Citations (access date 2026-09-24 America/Chicago)

1. Expo push setup — https://docs.expo.dev/push-notifications/push-notifications-setup/  
2. Expo Push Service send API — https://docs.expo.dev/push-notifications/sending-notifications/  
3. Expo send via FCM/APNs directly — https://docs.expo.dev/push-notifications/sending-notifications-custom  
4. Expo Notifications SDK — https://docs.expo.dev/versions/latest/sdk/notifications/  
5. Expo push FAQ — https://docs.expo.dev/push-notifications/faq/  
6. Apple APNs HTTP/2 provider — https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns  
7. FCM HTTP v1 send — https://firebase.google.com/docs/cloud-messaging/send/v1-api  
8. FCM cross-platform customize — https://firebase.google.com/docs/cloud-messaging/customize-messages/cross-platform  
9. Supabase Edge push examples (Expo + FCM) — https://supabase.com/docs/guides/functions/examples/push-notifications  
10. MDN PushSubscription — https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription  
11. W3C Push API — https://www.w3.org/TR/push-api/  
12. Apple WWDC22 Web Push for Safari — https://developer.apple.com/videos/play/wwdc2022/10098/  
13. web-push (VAPID helpers) — https://github.com/web-push-libs/web-push  
14. Kelyra architecture soft-skip — `docs/architecture.md` (Push row)  
15. Messaging / in-app alerts — `docs/messaging-v1.md`, `docs/ui-design.md`  
16. FERPA posture — `notes/company/avg-spec-security-ferpa.md`

---

## 10. Out of scope (this card)

- App / SQL / Edge implementation  
- Hermes profile staffing / kelyra-qa-loop  
- SMS / A2P  
- Changing in-app `/notifications` product into a chat inbox  
- Hermes (AI staffing) — CoS-only research
