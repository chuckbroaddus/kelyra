OBJECTIVE:
Correct B-SR-A-01 only. Replace polluted UUID list with SQL capture 1228977f-7098-4dd3-9375-06c5d9f1bb21 (student_id null, status=unassigned, input_source=batch) on batch 6f05a42e-d328-4819-9ad8-ba2df14be963. Patch testplan. Do not PASS other matrix rows. No app code. No git. No click.

CONTEXT:
QAS t_baa60469 REJECTED harvest. c8ba779e and ffa242bb are batches not captures.

REQUIREMENTS:
Read-only SQL verify. Result B-SR-A-01 PASS only for that one capture.

CONSTRAINTS:
No Eng. Children: no ask_user_question.

ACCEPTANCE:
Testplan list matches SQL.

RECOMMENDED NEXT ACTION:
QAS restamp.
