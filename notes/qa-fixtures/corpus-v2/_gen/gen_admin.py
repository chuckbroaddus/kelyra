"""School admin / forms PDFs (enrollment, parent info, roster, syllabi, etc.)."""
from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor, black
from reportlab.lib.units import inch

from common import ROOT, TYPED_BOLD, TYPED_FONT, draw_header, ensure_fonts, new_canvas, save_json
from roster import STUDENTS, display_name


def _fields(c, y, labels):
    for lab in labels:
        c.setFont(TYPED_FONT, 10)
        c.setFillColor(black)
        c.drawString(0.7 * inch, y, lab)
        c.setStrokeColor(HexColor("#999999"))
        c.line(2.4 * inch, y - 2, 7.5 * inch, y - 2)
        y -= 22
    return y


def new_student_enrollment():
    path = ROOT / "admin" / "new-student-enrollment.pdf"
    c = new_canvas(path)
    draw_header(c, "New Student Enrollment Form", "Maple Bend Middle · Synthetic CC0")
    y = 9.5 * inch
    c.setFont(TYPED_FONT, 9)
    c.drawString(0.7 * inch, y, "School year 2026–27 · For office use only (fixture)")
    y -= 28
    y = _fields(
        c,
        y,
        [
            "Student legal name",
            "Preferred name",
            "Date of birth",
            "Grade entering",
            "Home address",
            "City / State / ZIP",
            "Primary guardian",
            "Guardian phone",
            "Guardian email",
            "Emergency contact",
            "Previous school",
            "Allergies / notes",
        ],
    )
    c.setFont(TYPED_FONT, 9)
    c.drawString(0.7 * inch, y - 10, "Signature: ______________________     Date: __________")
    c.save()


def parent_information():
    path = ROOT / "admin" / "parent-information.pdf"
    c = new_canvas(path)
    draw_header(c, "Parent / Guardian Information Sheet", "Synthetic CC0")
    y = 9.5 * inch
    y = _fields(
        c,
        y,
        [
            "Student name",
            "Parent/Guardian 1 name",
            "Relationship",
            "Phone",
            "Email",
            "Parent/Guardian 2 name",
            "Relationship",
            "Phone",
            "Email",
            "Preferred contact method",
            "Languages spoken at home",
            "Pickup authorization notes",
        ],
    )
    c.save()


def class_roster_fom():
    path = ROOT / "admin" / "class-roster-fom.pdf"
    c = new_canvas(path)
    draw_header(c, "Class Roster — Foundations of Math (FoM)", "Period 3 · Synthetic roster")
    y = 9.5 * inch
    c.setFont(TYPED_BOLD, 9)
    c.drawString(0.7 * inch, y, "#")
    c.drawString(1.1 * inch, y, "Student ID")
    c.drawString(2.2 * inch, y, "Last")
    c.drawString(3.8 * inch, y, "First")
    c.drawString(5.2 * inch, y, "Present")
    y -= 14
    c.setFont(TYPED_FONT, 9)
    for i, st in enumerate(STUDENTS, 1):
        c.drawString(0.7 * inch, y, str(i))
        c.drawString(1.1 * inch, y, st["id"])
        c.drawString(2.2 * inch, y, st["last"])
        c.drawString(3.8 * inch, y, st["first"])
        c.rect(5.2 * inch, y - 2, 10, 10, stroke=1, fill=0)
        y -= 13
        if y < 0.6 * inch:
            c.showPage()
            y = 10.2 * inch
    c.save()


def syllabus(name: str, title: str, lines: list[str]):
    path = ROOT / "admin" / name
    c = new_canvas(path)
    draw_header(c, title, "Synthetic CC0 syllabus")
    y = 9.5 * inch
    for line in lines:
        c.setFont(TYPED_BOLD if line.endswith(":") else TYPED_FONT, 10 if line.endswith(":") else 9)
        c.drawString(0.7 * inch, y, line)
        y -= 13
        if y < 0.6 * inch:
            c.showPage()
            y = 10.2 * inch
    c.save()


def lesson_plan_fom():
    path = ROOT / "admin" / "lesson-plan-fom.pdf"
    c = new_canvas(path)
    draw_header(c, "Lesson Plan — Foundations of Math", "Week of Sep 21, 2026 · Synthetic")
    y = 9.5 * inch
    blocks = [
        ("Objective:", "Students solve one-step linear equations and check solutions."),
        ("Standards:", "Local algebra readiness · equations & equality."),
        ("Materials:", "Whiteboard, exit tickets, graph mini-set."),
        ("Warm-up (5m):", "Two mental-math prompts; share strategies."),
        ("Teach (15m):", "Model isolating the variable; think-aloud."),
        ("Practice (20m):", "Pairs complete 6 items; teacher circulates."),
        ("Close (5m):", "Exit ticket: one equation + check."),
        ("Differentiation:", "Sentence stems; extension challenge problem."),
        ("Assessment:", "Exit ticket scored 0–2; notes in gradebook."),
    ]
    for h, b in blocks:
        c.setFont(TYPED_BOLD, 10)
        c.drawString(0.7 * inch, y, h)
        y -= 12
        c.setFont(TYPED_FONT, 9)
        c.drawString(0.9 * inch, y, b)
        y -= 18
    c.save()


def rubric_essay():
    path = ROOT / "admin" / "rubric-essay.pdf"
    c = new_canvas(path)
    draw_header(c, "Essay Rubric — English 8", "Synthetic CC0")
    y = 9.5 * inch
    c.setFont(TYPED_FONT, 9)
    headers = ["Criterion", "4", "3", "2", "1"]
    xs = [0.6, 2.4, 3.6, 4.8, 6.0]
    for x, h in zip(xs, headers):
        c.setFont(TYPED_BOLD, 9)
        c.drawString(x * inch, y, h)
    y -= 16
    rows = [
        ("Claim / Thesis", "Clear & insightful", "Clear", "Vague", "Missing"),
        ("Evidence", "Strong & cited", "Adequate", "Weak", "None"),
        ("Organization", "Purposeful", "Logical", "Uneven", "Disorganized"),
        ("Conventions", "Polished", "Minor errors", "Distracting", "Severe"),
    ]
    for row in rows:
        for x, cell in zip(xs, row):
            c.setFont(TYPED_FONT, 8)
            c.drawString(x * inch, y, cell)
        y -= 28
    c.save()


def curriculum(name: str, title: str, units: list[str]):
    path = ROOT / "admin" / name
    c = new_canvas(path)
    draw_header(c, title, "Synthetic CC0 outline")
    y = 9.5 * inch
    c.setFont(TYPED_FONT, 10)
    for i, u in enumerate(units, 1):
        c.drawString(0.7 * inch, y, f"Unit {i}: {u}")
        y -= 16
    c.save()


def generate_admin():
    ensure_fonts()
    (ROOT / "admin").mkdir(parents=True, exist_ok=True)
    new_student_enrollment()
    parent_information()
    class_roster_fom()
    syllabus(
        "syllabus-fom.pdf",
        "Syllabus — Foundations of Math (FoM)",
        [
            "Teacher: Ms. Jordan Lee (synthetic)",
            "Course description:",
            "  Readiness course bridging upper-elementary arithmetic to Algebra I.",
            "Grading:",
            "  Homework 25% · Quizzes 25% · Tests 35% · Participation 15%",
            "Units:",
            "  1. Integers & absolute value",
            "  2. Expressions & one-step equations",
            "  3. Proportional reasoning",
            "  4. Intro linear graphs",
            "Materials: notebook, pencil, calculator (basic).",
            "Office hours: Tue/Thu 3:15–3:45",
        ],
    )
    syllabus(
        "syllabus-bible.pdf",
        "Syllabus — Bible / Character Study (Elective)",
        [
            "Teacher: Mr. Sam Ortiz (synthetic)",
            "Course description:",
            "  Short public-domain verse study and character reflections.",
            "  Uses only public-domain Bible text (e.g. World English Bible) when quoting.",
            "Grading:",
            "  Memory checks 30% · Reflections 40% · Participation 30%",
            "Units:",
            "  1. Kindness in community",
            "  2. Courage and honesty",
            "  3. Stewardship / care for others",
            "Note: Synthetic school fixture; not denominational curriculum.",
        ],
    )
    lesson_plan_fom()
    rubric_essay()
    curriculum(
        "curriculum-outline-math.pdf",
        "Curriculum Outline — Math Department (sample)",
        [
            "Number sense & operations",
            "Expressions, equations, inequalities",
            "Ratios, rates, percents",
            "Linear relationships & graphs",
            "Data displays & simple stats",
            "Geometry foundations (area/volume intro)",
        ],
    )
    curriculum(
        "curriculum-outline-homeroom.pdf",
        "Curriculum Outline — Homeroom / Advisory",
        [
            "Community agreements & routines",
            "Organization & study habits",
            "Digital citizenship basics",
            "Goal setting & reflection",
            "Peer collaboration skills",
            "School-year portfolio checkpoints",
        ],
    )
    files = sorted(p.name for p in (ROOT / "admin").glob("*.pdf"))
    save_json(
        ROOT / "admin" / "meta.json",
        {
            "license": "CC0-1.0",
            "synthetic": True,
            "files": files,
            "note": "Admin forms for ingest/OCR/QA — not live student records.",
        },
    )
    print(f"[admin] {len(files)} PDFs")


if __name__ == "__main__":
    generate_admin()
