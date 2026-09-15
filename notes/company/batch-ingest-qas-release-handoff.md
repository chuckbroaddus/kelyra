OBJECTIVE:
IQG Phase 4/6: review QE evidence vs BATCH-v1 stamp. Land release verdict on notes/company/batch-ingest-iqg-release.md (or comment). APPROVED or REJECTED prove-out. No app code. No git.

CONTEXT:
QE t_f921709c DONE. notes/company/batch-ingest-testplan.md — matrix rows are **PENDING**; fixtures absent; 69s run; claimed PASS with P2 SQL blocker. Proveout required EXECUTE + evidence. Dual stamp + proveout.md.

REQUIREMENTS:
- Honest call: plan-only vs executed prove-out
- If incomplete, REJECT prove-out and list what QE must still run
- DITL UPDATE_CASES already tracked t_befb3751
- Unapplied 000004: BLOCKED ON SQL not product miss (already noted)
- No DESIGN STAMP redo unless shipped contradicts

CONSTRAINTS:
No Eng. No SQL apply.

ACCEPTANCE:
Release file with APPROVED|REJECTED + next action for CoS.

RECOMMENDED NEXT ACTION:
If REJECTED, CoS restaffs qa-engineer EXEC. If APPROVED, feature IQG-complete except DITL cases/Chuck SQL.
