# Phone sign-in

## Sub-features

The splash Sign in button reveals the form. The same button submits after the fields are filled. A tray means the phone is already inside the app.

## How to get to it (user POV)

Open Kelyra in Expo Go on the iPhone simulator. The splash shows the wordmark and one Sign in button. Tap it. The fields `Email or @username` and `Password` appear. The username is either an email address or an @handle. Tap Sign in again.

## Driving it with ui-drive

This is not a Drive click. Pass `--persona office` (or teacher, parent, student). The script reads `~/.kelyra/ui-personas.json` and does the three steps once. The Drive line is the control to tap after the tray is visible, for example `Drive: / click=[aria-label=People]`.

## Gotchas

The first Sign in does not log anyone in. Seeing the fields is the form opening. The same field takes an email address, such as `chuckbroaddus@gmail.com`, or an @handle, such as `@chuckbroaddus`. Keep the `@`. Do not turn an email into a handle, or a handle into an email, and try again. A field that shows `chuckbroaddus` with no `@` is neither form and must not be submitted. Do not tap Sign in a third time. Do not tap Sign out. Do not start the sequence again when Home, Diary, Calendar, Desk, People, or Messages is already on screen. The sentence "Sign in to view Calendar" is a signed-out wall, not the Sign in button. The web session injection does not sign the simulator in. After the second Sign in, iOS may show "Save Password?" or "Save this password" over the app. Tap Not Now. Do not tap Save. The dialog is not a Kelyra control, and it can appear again after the next tap. Dismiss it before reading the screen.
