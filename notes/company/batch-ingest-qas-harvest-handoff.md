OBJECTIVE:
Restamp BATCH-v1 after QE harvest t_d5ab650e. APPROVED or REJECTED on notes/company/batch-ingest-iqg-release.md. No app code. No git.

CONTEXT:
CEO Confirm live: batch 6f05a42e-d328-4819-9ad8-ba2df14be963 done, teacher_confirmed_split=true.
ONE capture from SQL: 1228977f-7098-4dd3-9375-06c5d9f1bb21 student_id null status=unassigned input_source=batch.
QE testplan lists 5 “captures” that are NOT that id — includes abandoned batch c8ba779e and split_review batch ffa242bb. B-CE-A-01 batch id is correct. B-SR-A-01 overclaim.

REQUIREMENTS:
Honest vs proveout. If harvest polluted, REJECT B-SR-A-01 or require QE correction. Remaining matrix rows still empty (NA/I4/I5/phone/dual/size/cam). Do not APPROVE whole stamp if only batch id is clean.

CONSTRAINTS:
No Eng.

ACCEPTANCE:
Updated stamp.

RECOMMENDED NEXT ACTION:
CoS restaff QE only if you REJECT harvest.
