# Office People — reset someone else’s password

Status: HOLD. Spec only. Do not send Grok Build. No create-class. No teacher mint-student.

Headline: Administrator and superintendent can reset school logins from People. Teachers cannot. This is office reset of someone else, not self-service Change password on /password.

## Who sees it
Superintendent and administrator (is_school_admin / office People). Not a class teacher, even if they opened the student record. Not parents. Hide on your own row (use Change password on Profile).
Applies to school logins: teachers, students, parents, other staff. Same control, same sheet.

## Where
Office People (Staff / Parents / Students tabs in PeopleAdmin): swipe on the ListRow, label Reset password (reuse existing swipe recipe, tone wash or brand, not delete).
Also a Ghost Reset password on the office person account (/profile?person=…) under identity, next to hats. Do not put it on teacher Class Setup, student person tabs, or Practice/Work.
Create login stays where it is. Reset is not Create.

## What it does (match today)
Kelyra signs in with username + password. Create login already sets a temporary password and must_change_password. Reset reuses that: office types or generates a new temporary password, save sets must_change_password true, next sign-in forces /password.
No send-link / magic email in v1. Username does not change. Email is not the sign-in.

## Sheet
Pushed or ConfirmSheet-scale FormSheet. Title Reset password. Lead: They will sign in with @username and this password, then choose a new one.
Field: Temporary password (office can type; optional Generate fills a pronounceable temp, 8+ chars). Ghost Save.
On success: keep the temp on screen once with Copy. Status: Password reset. They must change it at next sign-in. Do not show it again if they leave the sheet.
Cancel does nothing. Cannot reset a login that has no account yet (no username) — copy No login yet, create one from People.

## Copy
Swipe/button: Reset password
Success: Password reset. They must change it at next sign-in.
Forbidden (teacher): omit the control. Do not show an error tease.
Self: omit; Profile already has Change password.

## Not this
Teacher create-class. Teacher Add as a new student. Email reset links. Changing @username. Reset from Capture/Inbox/Assign.
