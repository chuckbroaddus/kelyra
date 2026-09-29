# DITL-P-01-ASK-01 report

RESULT: PARTIAL

LANE: B (user-data-dir /tmp/ditl-pw-lane-b, own Chromium — not 9223)
ENGINE: hermes / SuperGrok pool
APP: http://localhost:8081
SEAT: parent ditl-parent-1 only (Taylor Lee; children Jordan + Jamie)
CASE: DITL-P-01-ASK-01 (seq 29 / 78)
ARTIFACTS: notes/qa-fixtures/ditl/artifacts-P-01-ASK-01/
RUNNER: run-ask-01.mjs → result.json

## Steps vs live

1. Sign-in ditl-parent-1 → /parent Taylor Lee — OK (01-after-signin.png)
2. Bind Jordan on Home (SPA tray) → /ask; Which assignment? / Just chatting ground — OK (03-ask-open-jordan.png)
3. Ask tool path my_children_progress for Jordan Lee — OK. Assistant returned focus ditl-bulk-jordan-place-value, practice none, parent sentence still working… No scores invented in reply (04-ask-progress-jordan.png)
4. Switch Jamie on Home → /ask; second Ask turn — MISS. After twin switch, Ask composer (placeholder Ask…) not reliably interactable (fill/pressSequentially timeout; Send stayed aria-disabled). Thread still showed Jordan progress; no Jamie-only assistant reply (05-ask-*.png)
5. explain_my_class_average for Jordan Math — MISS. New chat reached empty Ask shell (“Ask a question about this week’s work”) but Send never enabled for the average prompt (06-ask-avg-jordan-math.png)
6. No grade mutation controls on Ask (no Approve/Publish/Save score) — OK
7. Sign out → /sign-in — OK (07-signout.png)

## Dual-path / isolation / read-only

- Dual-path grades read: PARTIAL — Jordan my_children_progress live OK; Jamie isolation Ask turn not completed; Math average Ask turn not completed.
- Sibling isolation in Ask ground: UNPROVEN for Jamie reply (no second tool answer). Home bind did show Jamie chip path before Ask reopen.
- Read-only: OK on exercised surface (no mutation chrome; Jordan progress reply had no write/Approve).

## GAP (case known — not findings)

- GAP: vehicle pick / Ride check-in / leave — no Ask tools; PHYSICAL-ONLY camera. Case PARTIAL/GAP. Not filed as findings.

## FINDINGS

(none — unexpected supported-product breaks not confirmed; remaining misses are incomplete Ask turns after twin switch / composer not sending, not a proven grade-write bug)

## RESULT rationale

PARTIAL: core Jordan my_children_progress Ask tool path green on live :8081; Jamie progress + explain_my_class_average not proven in this run; ride Ask tools GAP per case.

## Teardown

Sign-out only. No case-created DB rows intentionally written. Shared seed left intact.
