OBJECTIVE:
Disposition DEFECT t_bc4caccc (P2: /capture has Upload class stack but no batch/capture ids in DOM). FIX-NOW / later / not-a-bug. Binding. No app code.

CONTEXT:
IQG: PM auto-dispositions DEFECT cards. QE never uploaded a stack — empty Capture cannot show batch/capture ids. Real EXEC is t_62673215 (click + CDP attach PDF) still running. /dashboard 404 is +not-found not this card.

REQUIREMENTS:
Stamp disposition on the defect (comment or notes). If not-a-bug, say so. Do not send Eng unless the empty-page missing ids is actually a stamp miss.

CONSTRAINTS:
No Eng from this card. No git.

ACCEPTANCE:
FIX-NOW | SCHEDULE | WONTFIX/not-a-bug.

RECOMMENDED NEXT ACTION:
CoS staffs Eng only if FIX-NOW.
