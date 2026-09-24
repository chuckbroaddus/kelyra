"""Short research-paper samples: typed + handwritten-draft style."""
from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor, black
from reportlab.lib.units import inch

from common import (
    ROOT,
    TYPED_BOLD,
    TYPED_FONT,
    draw_header,
    ensure_fonts,
    new_canvas,
    pdf_page_to_phone_jpg,
    save_json,
    student_style,
    write_hand,
)


TYPED_BODY = """The Fictional Town Garden Project

Alex Rivera
Homeroom 8A · September 2026

Introduction
Many schools plant small gardens to teach science and community care. This short paper
explains a made-up project at Maple Bend Middle School. All details are synthetic.

Methods
Students measured plant height once a week for six weeks. They watered on Mondays and
Thursdays and recorded weather in a shared notebook.

Results
Bean plants grew faster than lettuce in the sunny corner plot. The shaded plot grew more
slowly but needed less water.

Discussion
A garden can connect math (measurement), science (life cycles), and writing (field notes).
Teachers should plan for weekends when plants still need care.

Conclusion
Even a small plot can support cross-subject learning when roles are clear.

References (synthetic)
Maple Bend Middle Curriculum Outline (fictional), 2026.
"""


def typed_paper():
    out = ROOT / "papers"
    out.mkdir(parents=True, exist_ok=True)
    path = out / "typed-research-sample.pdf"
    c = new_canvas(path)
    draw_header(c, "Sample Research Paper (Typed)", "CC0 synthetic · ~1 page")
    y = 9.6 * inch
    for line in TYPED_BODY.splitlines():
        if not line.strip():
            y -= 8
            continue
        if line in ("Introduction", "Methods", "Results", "Discussion", "Conclusion", "References (synthetic)") or line.startswith("The Fictional"):
            c.setFont(TYPED_BOLD, 11 if line.startswith("The Fictional") else 10)
        elif line.startswith("Alex Rivera") or line.startswith("Homeroom"):
            c.setFont(TYPED_FONT, 9)
        else:
            c.setFont(TYPED_FONT, 9)
        # wrap
        words = line.split()
        buf = ""
        for w in words:
            trial = (buf + " " + w).strip()
            if c.stringWidth(trial, c._fontname, c._fontsize) > 7.1 * inch:
                c.setFillColor(black)
                c.drawString(0.7 * inch, y, buf)
                y -= 12
                buf = w
            else:
                buf = trial
        if buf:
            c.drawString(0.7 * inch, y, buf)
            y -= 12
        if y < 0.7 * inch:
            c.showPage()
            y = 10.2 * inch
    c.save()
    return path


def handwritten_draft():
    out = ROOT / "papers"
    path = out / "handwritten-draft.pdf"
    c = new_canvas(path)
    style = student_style(42)
    draw_header(c, "Research Draft (Handwriting Simulated)", "CC0 · messy draft with scratch-outs")
    y = 9.5 * inch
    lines = [
        "Draft — Garden Project",
        "I think gardens help kids learn science.",
        "We measured beans every friday — wait, Monday.",
        "The sunny plot grew faster (I think??).",
        "Need to add numbers from the notebook.",
        "Also ask Ms. Lee about weekend watering.",
        "Conclusion later...",
    ]
    for i, line in enumerate(lines):
        scratch = i in (2, 3)
        write_hand(c, line, 0.75 * inch, y, style, size_override=13, scratch=scratch)
        y -= 28
    c.setFont(TYPED_FONT, 8)
    c.setFillColor(HexColor("#666666"))
    c.drawString(0.6 * inch, 0.5 * inch, "Simulated handwriting draft — not a real student manuscript.")
    c.save()
    # also a phone-style JPG of the draft
    jpg = out / "handwritten-draft-phone.jpg"
    pdf_page_to_phone_jpg(path, 0, jpg, seed=99, quality=72)
    return path, jpg


def generate_papers():
    ensure_fonts()
    t = typed_paper()
    h, j = handwritten_draft()
    save_json(
        ROOT / "papers" / "meta.json",
        {
            "license": "CC0-1.0",
            "synthetic": True,
            "files": [t.name, h.name, j.name],
            "handwriting": "simulated on handwritten-draft.*",
        },
    )
    print(f"[papers] {t.name}, {h.name}, {j.name}")


if __name__ == "__main__":
    generate_papers()
