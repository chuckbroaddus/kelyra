# Kelyra browser / UI testing (read first)

**Who:** every UI, live-browser, screen-proof, or `ui-drive` card agent.  
**Time budget:** ~2 minutes. Do not invent a second driver.

## When to use this

- Card asks for a live web/phone screenshot, Drive line, UI loop proof, or acceptance walk.
- You will call `scripts/ui-drive.mjs` (or Playwright / CDP for a second Metro port).

## Prerequisites (check before Drive)

| Need | How |
|------|-----|
| Metro / Expo web | Main checkout: `http://127.0.0.1:8081` (often screen `kelyra-metro`). Worktree second server: `CI=1 npx expo start --web --port 8091` (or next free port); **stop it when done**. |
| QA Chrome CDP | `http://127.0.0.1:9223/json/list` must answer. `ui-drive` auto-launches via `~/.hermes/profiles/chief-of-staff/scripts/launch_qe_chrome.sh` if missing. DITL parallel lanes: use your own Chromium user-data-dir — **do not steal :9223**. |
| Personas | File: `~/.kelyra/ui-personas.json`. Names: `office`, `teacher`, `parent`, `student`. Optional `--seat office\|teacher\|parent`. **Never print handles/passwords/tokens.** |
| App env | Checkout `.env` must define `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (names only). |

`ui-drive.mjs` hardcodes **web + Expo deep-link port 8081**. If you only started 8091, Drive reports `WEB_NOT_READY` unless 8081 is also up. For worktree-only proof, CDP/navigate `http://127.0.0.1:8091` yourself (GB-AC2 pattern) — persona CORS allows **8081 origins only**.

## Sign-in / persona gotchas

1. Prefer `--persona <name>` so `ui-persona-session.mjs` injects tokens (web). Stdout is only `READY` / `INJECT_PORT=` — never dump session JSON.
2. Phone cannot reach a host `127.0.0.1` inject server from the sim the same way Chrome can; phone path uses `ensurePhoneSession` (splash → form → one submit). Failure code: `PHONE_SIGN_IN_FAILED`.
3. Splash has two Sign-in taps: first reveals fields; second submits. Do not double-submit or Sign out.
4. Wrong seat for the route looks like an empty/denied page (e.g. teacher on `/school/grading-policy` — use `office`).
5. Dismiss iOS “Save Password” with Not Now; dismiss Chrome “Restore pages” with Close (never Restore).

## Expo web load + route readiness

- Wait for HTTP 200 on the Metro port before Drive.
- Soft “Working…” is not settled. Drive waits until real rows/labels appear (`ROUTE_NOT_SETTLED` if stuck).
- After viewport resize (390 / 1280), wait again — remount can flash Working.
- Bundle overlay (`Unable to resolve module`) → `BUNDLE_OVERLAY` (harness, not product).
- Still on Sign in with a persona requested → `PERSONA_INJECT_FAILED`.

## Drum pickers, sheets, scroll / visibility

- **Calendar drum** (`PeriodPager`): pan/snap owns gestures; do not treat LTR drum swipe as app-back. Wait for snap before screenshot.
- **FormSheet / bottom sheets:** on narrow widths (≤~400) help and many editors open as sheets — assert the sheet, not only the inline card.
- **Scroll / visibility:** target may be off-screen; scroll into view or open the sheet that hosts it. Chip rows may scroll horizontally by design; page body usually must not.
- **Clicks:** prefer `click=[aria-label="Exact Name"]`. Bare multi-word labels are normalized, but quoted is safer. Never click Sign out, Disconnect, or Search as the proof control (`INTERACTION_MISSING` / unsafe).

## How to run `ui-drive.mjs`

```bash
# From the checkout that owns the code under test (usually the card worktree if Metro is 8081,
# or main if the card says Metro is already on 8081).
node scripts/ui-drive.mjs \
  --surface web|phone|both \
  --persona office|teacher|parent|student \
  --seat office \          # optional
  --route /path \
  --click '[aria-label="Open Capture"]' \
  --out /tmp/my-packet.json
```

- Stdout: one line `PACKET <path>`. Stderr: status codes only (`WEB_READY`, `CHROME_READY`, `PERSONA_READY`, or fail codes).
- Screenshots land next to the packet: `<out-without-.json>/web-390.png`, `web-1280.png`, `web-after.png`, and phone shots when `--surface` includes phone.
- `--click` is required for a full Drive packet. For screenshot-only acceptance walks, CDP/Playwright without `--click` is OK if the card says so.

## Top recurring failure causes → fix

| Code / symptom | Usual cause | Fix |
|----------------|-------------|-----|
| `WEB_NOT_READY` | Metro down or wrong port | Start Expo on 8081 (or point custom CDP at your worktree port). |
| `CHROME_NOT_READY` / CDP timeout | Nothing on :9223; restore bubble; lane stole Chrome | Launch QE Chrome; dismiss Restore; DITL lanes use private Chromium dirs. |
| `PERSONA_NOT_READY` / `PERSONA_MISSING` / `SIGN_IN_FAILED` | Bad/missing `~/.kelyra/ui-personas.json` or `.env` keys | Fix file/env locally; never log secrets. |
| `PERSONA_INJECT_FAILED` | Still on splash; CORS (non-8081 origin); inject flag fail | Use 8081 for inject; wait for settle; check persona name. |
| `ROUTE_NOT_SETTLED` | Stuck on Working…; cold bundle; wrong route | Wait longer; hard-reload; confirm route exists for that seat. |
| `INTERACTION_MISSING` | Bad/missing `--click`; control not visible; unquoted aria-label | Quote aria-label; open sheet/scroll; do not invent a second control name. |
| `PHONE_SIGN_IN_FAILED` | Splash timing; empty AX tree; springboard | Skip splash; wait form; one submit; reopen Expo; springboard ≠ inside. |
| `PHONE_SAFARI` | Opened `http://` on sim | Use `exp://127.0.0.1:8081/--/route` only. |
| Empty / wrong screen after “success” | Wrong persona for office-only routes | Match persona to role (`office` for school policy, etc.). |
| Harness vs product | Drive never produced a packet | File/fix harness; do **not** weaken the AC or mock the screenshot. |

## What NOT to do

- Do not print passwords, tokens, persona JSON, or `.env` values.
- Do not weaken SRS/AC checks or ship a fake screenshot to pass.
- Do not dirty `~/projects/kelyra` when the card gave you a worktree — stay in that worktree.
- Do not leave a second Expo server running after the card.
- Do not share QA Chrome :9223 across parallel DITL lanes.
- Do not click Sign out / Search as the Drive interaction.
- Do not run prettier. Do not `db push` / apply SQL / deploy from a UI proof card unless the card says so.
