# DITL-P-02-ASK-01 EXEC report (2026-09-28 rewrite rerun)

CASE: DITL-P-02-ASK-01
PLAN: DITL-P-02
LANE: B
ENGINE: hermes / SuperGrok
BROWSER: Chromium persistent user-data-dir /tmp/ditl-pw-lane-b (not Chrome :9223)
APP: http://localhost:8081
SEAT: ditl-parent-1 (parent only; not teacher/admin/student)
CHILD: S1 Jordan Lee (sibling Jamie present on seat)
SCHOOL: ditl-Sandbox Academy
KANBAN: t_64f06ecd
RESULT: FAIL

## Close summary

RESULT FAIL. Live parent Ask: sign-in, Jordan bind, Ask open OK; list_my_assignments did not list Jordan titles (assistant: "I started that work, then stopped…"); no sibling mix observed because list failed; send_message_to_teacher Sent (message id bac967b1-…, grades unchanged); no grade-mutation chrome; /parent/grades still shows assignments; signed out.

## Evidence (live screenshots)

1. Sign-in ditl-parent-1 → /parent Taylor Lee, Jamie + Jordan chips — OK (01-after-signin.png)
2. Bound Jordan on Home → tray Ask → /ask open; assignment chips include ditl-Math HW S1 / ditl-English HW S1 and more; banner also: Could not find function public.ask_list_messages(p_limit, p_seat) in schema cache — Ask still usable — OK open (02-ask-open-jordan.png)
3. New chat / Just chatting → Call list_my_assignments for Jordan Lee only (S1)… Do not list Jamie Lee — assistant reply only: "I started that work, then stopped. Check People or the class card to confirm what was saved." No assignment title list in reply. Invented titles: no. Sibling mix of listed titles: N/A (list failed). — MISS / FAIL vs expected Jordan-only list (03-list-assignments.png)
4. Call send_message_to_teacher for Jordan Lee body DITL-P-02-ASK-01-r2… — assistant: Sent. Message saved in your thread (`bac967b1-8b3e-488d-a629-7b6a5856e14f`). Grades unchanged. — OK (04-send-message.png)
5. No Approve capture / Publish grade / Save score chrome on Ask — OK
6. /parent/grades still lists ditl-Math HW S1, PhaseB, Hist, Multi rows (not wiped by Ask) — OK (05-grades-check.png)
7. Sign out → /sign-in — OK (06-signout.png)

## Expected vs actual

| Expected | Actual |
| Assignments listed are S1 Jordan only | FAIL — no titles listed via Ask tool path |
| Sibling mix is a fail | Not observed (no successful list to mix) |
| Message to teacher still sends | PASS — Sent + thread message id |
| Ask does not mutate grades | PASS — Grades unchanged wording + grades page intact |

## FINDINGS

FINDING: parent Ask list_my_assignments did not list Jordan-only assignments (stop-mid-work assistant reply); severity P2; case DITL-P-02-ASK-01

Note: Ask open showed schema-cache miss for ask_list_messages; message send still worked. Not filed as separate finding unless CoS wants inbox RPC tracked.

## GAPS

none on case card (PARTIAL/GAP: none)

## Artifacts

notes/qa-fixtures/ditl/artifacts-P-02-ASK-01/
- run-ask-01.mjs, run.log, result.json
- 01-after-signin.png … 06-signout.png

## Constraints honored

No product fix. No kanban finding cards filed from this seat. No Grok Bot. No port 9223. Shared seed not torn down. Password not printed.
