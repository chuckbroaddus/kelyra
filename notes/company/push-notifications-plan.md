# NOTIFY-P1: Push notifications plan (mobile + desktop)

**Date:** 2026-09-24  
**Author:** Chief of Staff / Grok Bot (Kelyra)  
**Card:** `t_47c87ab8` · Research SoT: `notes/company/push-notifications-research.md` (NOTIFY-R1)  
**Status:** Spec / roadmap only — **no app code**, no SQL apply, no migrations, no kelyra-qa-loop, no Hermes AI staffing, no force-push.  
**Audience:** CEO / CoS review. **Not** an implementation ticket. Do not staff `senior-developer` until Chuck says send.

**Stack ground:** Expo SDK 57 · Supabase (Auth, Postgres, Edge Functions, RLS) · EAS · in-app `/notifications` + messaging already pull-based · architecture currently soft-skips OS push.

---

## 0. One-line product law

| Surface | Job | What it is not |
|---|---|---|
| **OS push** | Wake the **right hat** when a time-sensitive in-app event exists, then deep-link into an existing RLS-gated screen | Not a second messenger; not email; not SMS |
| **Preference center** | Per-event opt-in + quiet hours + Android channels | Not “OS permission alone = product consent” |
| **In-app bell** | Source of truth while app is open | Not replaced by push |
| **Web Push (desktop)** | Same events on Chromebook / teacher desk browsers | Not a native Mac/Windows app |

**CEO bar:** Ride / Needs (and optionally messages) can reach a locked phone without leaking grades, IEP text, twin mix-ups, or class-wide education-record blasts.

---

## 1. Problem statement (grounded)

`docs/architecture.md` says push is **skipped in v1** (inbox is pull; FCM when weekly email/SMS appears). Product reality has moved: Ride car-line, Needs drafts, family messaging, and calendar reminders all create **time-sensitive** moments where pull-only fails (phone in pocket, Chromebook lid closed).

Kelyra already has Expo + Supabase + EAS. Competitors and OS vendors solve this with **APNs + FCM + (desktop) Web Push**, usually behind a single server send path. The gap is **credentials, token storage, Edge send, prefs, and event wiring** — not inventing a new client framework. **`expo-notifications` is not installed today.**

---

## 2. Architecture decision (locked for plan)

**Choose Expo Push Service as P0 fan-out** (Edge → `exp.host/--/api/v2/push/send` → APNs + FCM v1).

| Decision | Choice | Rationale |
|---|---|---|
| Client library | `expo-notifications` | Matches Expo 57; device + Expo tokens |
| Token type P0 | Expo push token | One send path for iOS + Android |
| Send runtime | Supabase Edge Function | Already how AI/jobs run; secrets stay server-side |
| Trigger | Authorized event → outbox/webhook invoke | Never client-fired “notify everyone” |
| Desktop P1 | Web Push + VAPID | Covers “other computers” without native wrappers |
| Direct APNs/FCM | P2 escape hatch | When Expo limits / advanced APNs fields bite |
| Topics | Deferred | Per-user devices first; no auto class topics |

**Refuse:** putting scores/IEP/transcripts in lock-screen body; student default-on; twin-aggregated parent blasts; Expo Go as Android acceptance SoT.

---

## 3. Phased roadmap

### P0 — Trial / single-school MVP (phones first)

| ID | Work | Done when |
|---|---|---|
| **P0-1** | Install `expo-notifications`; config plugin; EAS APNs key + FCM v1 credentials | Dev/preview build receives a test Expo push |
| **P0-2** | Permission UX after value moment (not splash); Android channels `ride` / `needs` / `messages` | User can grant/deny; deny is respected |
| **P0-3** | `device_push_tokens` (+ RLS) upsert on login / token refresh; prune on sign-out | Multi-device per user; no orphan tokens after logout |
| **P0-4** | Edge `push` + `EXPO_ACCESS_TOKEN` (enhanced security on); ticket → receipt hygiene | Send from server only; `DeviceNotRegistered` clears token |
| **P0-5** | Preference defaults: Ride + Needs **on** (after opt-in), messages **off** or on-by-choice; quiet hours 21:00–07:00 local; Ride bypass optional toggle | Prefs screen ships with equal-weight controls |
| **P0-6** | Wire **Ride** events (check-in / ready-at-curb style — exact event names Eng-confirm) with deep link | Parent/office/teacher (as designed) get banner → correct Ride surface |
| **P0-7** | Wire **Needs / draft ready** for owning teacher | Banner → Needs item; no student PII beyond necessary cue |
| **P0-8** | Payload minimization + twin/hat fail-closed checks in send path | Security review checklist green |
| **P0-9** | Student role: **no push registration UI** | Cannot enable from student chrome |
| **P0-10** | Update architecture note when Chuck accepts (soft-skip → “P0 push for Ride/Needs”) | Docs match product |

**Effort (order-of-magnitude):** ~1–2 Eng weeks after credentials, assuming existing Ride/Needs event hooks; QA on 2 physical devices (iPhone + Android) mandatory.

### P1 — Paid / desk + richer events

| ID | Work | Done when |
|---|---|---|
| **P1-1** | Web Push (VAPID) for Expo web / PWA on Chrome, Edge, Firefox, Safari macOS | Teacher Chromebook receives banner while tab backgrounded |
| **P1-2** | Optional **1:1 / family message** push (pref default cautious) | Deep link to thread; mute honors messaging mute |
| **P1-3** | Calendar reminder pushes (published events only; draft dues never) | Respects calendar publish / hat walls |
| **P1-4** | Office Ride alert integration (align with `t_c20b5e0d` if promoted) | Office gets urgent channel |
| **P1-5** | Collapse keys / threads per event family; badge sync with in-app unread | Less notification spam |
| **P1-6** | Prefs: per-class mute for teachers; per-child mute for parents | Twin-safe child toggles |
| **P1-7** | Observability: send/receipt metrics, failure alerts for InvalidCredentials | Ops can see broken APNs/FCM |

**Effort:** ~1–2 Eng weeks Web Push + ~1 week event expansions.

### P2 — Multi-school / advanced

| ID | Work | Done when |
|---|---|---|
| **P2-1** | Direct FCM v1 / APNs path for features Expo does not expose | Documented failover |
| **P2-2** | Opt-in school topics (weather / closure) — never grade topics | Explicit subscribe UI |
| **P2-3** | Student push under school/parent policy matrix | COPPA review signed off |
| **P2-4** | Critical / time-sensitive iOS interruption levels for Ride only | Entitlement + user consent |
| **P2-5** | Multi-tenant credential isolation per school Apple/Firebase apps if required | District packaging story |
| **P2-6** | Local scheduled notifications for study reminders (device-only) | No server PII in schedule |

---

## 4. Event matrix (P0 defaults)

| Event | Teacher | Office | Parent | Student | Notes |
|---|---|---|---|---|---|
| Ride: child ready / check-in relevant | Own duty only | School Ride ops | **Focused child only** | Off | Time-critical; quiet-hours bypass only if enabled |
| Needs: drafts ready for you | Owner | Off | Off | Off | Collapse by day |
| Message received | Pref | Pref | Pref | Off | P0 optional; P1 default refine |
| Calendar reminder | Pref | Pref | Pref (own kids) | Off | P1; published only |
| Class/school post | Off default | Pref | Off default | Off | Prefer in-app; push rare |
| Grade published | **Never lock-screen score** | — | Optional “new grade” cue P2 | Off | Deep link only |

---

## 5. Acceptance criteria (future Eng ticket — not this card)

**ACCEPT**

1. Physical iOS + Android preview builds receive Expo test push.  
2. Denied OS permission → no retry spam; prefs explain how to re-enable in Settings.  
3. Sign-out removes/revokes tokens for that session’s devices.  
4. Parent with twins: notification copy and deep link never mix siblings.  
5. Lock-screen body contains no scores, IEP/504, full names of other students, photo URLs, or join codes.  
6. Student chrome has no push enable control in P0–P1.  
7. Web (P1): HTTPS + service worker path documented; iOS Safari requires installed PWA (call out limitation).  
8. Architecture soft-skip updated only after Chuck accept.

**REJECT**

- Client-side broadcast send with service role embedded in Expo.  
- Expo Go Android as sole QA evidence.  
- Auto-subscribe all class parents to a topic.  
- Push as substitute for Approve / publish gates.

---

## 6. Security / privacy gates before Eng send

- [ ] Audience resolution uses existing hat / `parent_students` / focused-child laws.  
- [ ] Payload minimization reviewed (FERPA bystander test).  
- [ ] `EXPO_ACCESS_TOKEN` + enhanced Expo push security on.  
- [ ] Edge not callable anonymously for arbitrary user fan-out (webhook secret or signed invoke).  
- [ ] Token table RLS: users CRUD own rows only.  
- [ ] Receipt job deletes dead tokens.  
- [ ] COPPA: student off.  
- [ ] Quiet hours behavior documented for Ride.  
- [ ] No logging of full push tokens to third-party analytics.

---

## 7. Implementation approach (for future Eng — not this card)

Ordered workstream suggestion:

1. **Credentials** (Apple + Firebase + EAS + Expo access token).  
2. **Native module + preview build** + Expo push tool smoke test.  
3. **Schema** `device_push_tokens` + `notification_prefs` (migration ticket).  
4. **Edge `push`** + receipt sweeper.  
5. **Client register / deep link / channels / prefs UI**.  
6. **Wire Ride + Needs** producers.  
7. **Security + device QA checklist**.  
8. **Web Push P1** spike on `expo start --web` / hosted web.  
9. **Docs:** flip architecture Push row after Chuck accept.

---

## 8. Open questions (block Eng until answered if marked ★)

1. ★ Accept reversing architecture soft-skip for Ride/Needs P0?  
2. ★ Include message push in P0 or defer to P1?  
3. ★ Ride quiet-hours bypass default on or off?  
4. ★ Web Push required in first paid tier, or phone-only?  
5. Student forever-off vs policy-gated P2?  
6. Fold office banned-parent alert (`t_c20b5e0d`) into this epic?

---

## 9. Deliverables already produced (this card)

| File | Role |
|---|---|
| `notes/company/push-notifications-research.md` | Research SoT (NOTIFY-R1) |
| `notes/company/push-notifications-plan.md` | This plan (NOTIFY-P1) |
| `notes/research/2026-09-24-push-notifications-report.md` | Chuck-readable digest |

**Next (not this card):** Chuck review → optional Eng ticket with P0 checklist only.
