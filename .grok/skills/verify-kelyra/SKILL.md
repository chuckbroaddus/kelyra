---
name: verify-kelyra
description: >
  Drive the Kelyra class app the way a teacher, parent, student, or office
  user does. Use for a screen proof, a Drive line, or /verify-kelyra. The
  feature map is the source of Drive: /route click=[aria-label=Name].
---

# Verify Kelyra

The driver is `scripts/ui-drive.mjs`. A model grades the packet. It does not click around the app.

## Launch

From `~/projects/kelyra`:

```bash
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

When nothing is listening, start `npx expo start --web --port 8081` in the background. QA Chrome is port 9223 via `~/.hermes/profiles/chief-of-staff/scripts/launch_qe_chrome.sh`. Do not use daily Chrome on 9222. If Chrome shows "Restore pages?" or "Chrome wasn't shut down correctly", close that bubble. Do not click Restore. Restore reopens old tabs and leaves the test page. The QA Chrome launch hides that bubble.

## Doctor

```bash
node --test scripts/ui-drive.test.mjs
node scripts/check-test-imports.mjs --changed src/app/index.tsx
```

Both exit 0 before a drive. A non-zero `ui-drive` status (`ROUTE_NOT_SETTLED`, `BUNDLE_OVERLAY`, `PERSONA_INJECT_FAILED`, `PHONE_SAFARI`, `INTERACTION_MISSING`) is a harness failure. Do not edit the screen to make that status disappear.

## Drive

Copy the route and the click from `features/`. One example:

```bash
node scripts/ui-drive.mjs \
  --surface web \
  --persona teacher \
  --route /messages \
  --click '[aria-label=Messages]' \
  --ids ac-tray-school-1 \
  --out /tmp/kelyra-ui-drive-messages.json
```

Stdout is `PACKET` and the path. Stderr is one status word when the drive fails. Passwords stay in `~/.kelyra/ui-personas.json`. Do not print them.

Phone and both open Expo Go with `exp://`. When `--persona` is set, the script signs in on the phone before the Drive tap. `phone.ran` stays false until that Drive tap changes the accessibility tree. An http URL exits `PHONE_SAFARI`. A missing `idb` exits `PHONE_TAP_TOOL_MISSING`. A tap that does not change the screen exits `PHONE_TAP_UNCHANGED`. A sign-in that does not reach a tray exits `PHONE_SIGN_IN_FAILED`. Do not use cliclick or DeviceHub.

## Phone sign-in

The simulator does not use the web persona port. The web page injects the session. The phone uses the splash form, once:

1. The splash shows one Sign in button and no fields. Tap Sign in. The username and password boxes appearing means the form opened. That is not a failed login.
2. Type the persona username into the field whose value is `Email or @username`, and the persona password into the field whose value is `Password`. That username is either an email address or an @handle. An email is typed unchanged, `@` included, such as `chuckbroaddus@gmail.com`. A handle is typed with `@` in front of the name, such as `@chuckbroaddus` or `@ditl-teacher-a`. Do not strip the `@` and do not switch from one form to the other. A box that shows `chuckbroaddus` with no `@` is neither form, and the script must not submit it. Do not print the password.
3. Tap Sign in one more time. That submits. Wait until a tray name is visible: Home, Diary, Calendar, Desk, People, Manage, Assignments, or Messages.

Stop there. Do not tap Sign in again. Do not tap Sign out. Do not start another sign-in. If a tray name is already visible, the phone is already signed in. A wall that says "Sign in to view Calendar" is signed out, and it is not the Sign in button. If iOS shows "Save Password?" or "Save this password", tap Not Now. That dialog is the phone's, and it can cover Kelyra after the second Sign in. Do not tap Save. The driver dismisses it before and after the Drive tap.

## Evidence

The packet has screenshot paths, the widths, and the interaction. Open each screenshot once. An acceptance id passes only when the screenshot shows it. Record the URL, the words on the screen, and the screenshot path. A failed request is named with its status.

## Cleanup

Stop the persona helper the script started. Leave Expo and QA Chrome running when they were already up. Leave the packet and the screenshots in place.

## Helpers

`node scripts/ui-drive.mjs --help` is not the interface. The flags are `--surface`, `--persona`, `--seat`, `--route`, `--click`, `--ids`, and `--out`.
