"""Assessment worksheets with diagrams/graphs."""
from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import black, HexColor
from reportlab.lib.units import inch

from common import (
    ROOT,
    TYPED_BOLD,
    TYPED_FONT,
    draw_header,
    draw_line_graph,
    draw_plant_cell,
    ensure_fonts,
    new_canvas,
    save_json,
)


def math_graph_worksheet():
    out = ROOT / "worksheets" / "math-graph-assessment"
    out.mkdir(parents=True, exist_ok=True)
    path = out / "worksheet.pdf"
    c = new_canvas(path)
    draw_header(c, "Math Assessment Worksheet — Interpreting Graphs", "CC0 synthetic · single-student blank")
    y = 9.5 * inch
    c.setFont(TYPED_FONT, 10)
    c.drawString(0.6 * inch, y, "1. The graph shows temperature (°F) over a school day.")
    draw_line_graph(
        c,
        0.8 * inch,
        y - 2.0 * inch,
        4.5 * inch,
        1.7 * inch,
        [(8, 58), (10, 64), (12, 72), (14, 75), (16, 70)],
        "Temperature vs Time (hour)",
    )
    y -= 2.3 * inch
    prompts = [
        "a) About what temperature at 12:00?",
        "b) Between which hours did temperature rise fastest?",
        "c) Did temperature ever decrease? Explain.",
        "2. Sketch a graph of a bike slowing to a stop (speed vs time) in the box below.",
    ]
    for p in prompts:
        c.setFont(TYPED_FONT, 10)
        c.drawString(0.6 * inch, y, p)
        y -= 18
        c.setStrokeColor(HexColor("#cccccc"))
        c.line(0.8 * inch, y, 7.5 * inch, y)
        y -= 20
    c.setStrokeColor(HexColor("#333333"))
    c.rect(0.8 * inch, 1.2 * inch, 4.5 * inch, 2.0 * inch, stroke=1, fill=0)
    c.setFont(TYPED_FONT, 8)
    c.drawString(0.85 * inch, 3.1 * inch, "Sketch box")
    c.save()
    key = out / "answer-key.pdf"
    c = new_canvas(key)
    draw_header(c, "ANSWER KEY — Math Graph Assessment")
    c.setFont(TYPED_FONT, 11)
    y = 9.6 * inch
    for line in [
        "1a) about 72°F",
        "1b) roughly 10–12 (steepest rise)",
        "1c) yes — after 14:00 temperature falls",
        "2) decreasing curve / line toward speed=0 (accept reasonable sketches)",
    ]:
        c.drawString(0.6 * inch, y, line)
        y -= 16
    c.save()
    save_json(
        out / "meta.json",
        {
            "id": "math-graph-assessment",
            "license": "CC0-1.0",
            "synthetic": True,
            "has_graph": True,
            "files": ["worksheet.pdf", "answer-key.pdf"],
        },
    )
    print("[ws] math-graph-assessment")


def science_diagram_worksheet():
    out = ROOT / "worksheets" / "science-diagram-assessment"
    out.mkdir(parents=True, exist_ok=True)
    path = out / "worksheet.pdf"
    c = new_canvas(path)
    draw_header(c, "Science Assessment Worksheet — Plant Cell Labels", "CC0 synthetic · single-student blank")
    c.setFont(TYPED_FONT, 10)
    c.drawString(0.6 * inch, 9.5 * inch, "Label structures A–D. Then answer the questions.")
    draw_plant_cell(c, 1.5 * inch, 6.6 * inch, 4.2 * inch, 2.4 * inch)
    y = 6.2 * inch
    for p in [
        "1. Which labeled part stores water and helps support the cell?",
        "2. Which part captures light energy?",
        "3. Why do plant cells have a wall while animal cells do not? (1–2 sentences)",
    ]:
        c.setFont(TYPED_FONT, 10)
        c.setFillColor(black)
        c.drawString(0.6 * inch, y, p)
        y -= 14
        c.setStrokeColor(HexColor("#cccccc"))
        for _ in range(2):
            c.line(0.8 * inch, y, 7.5 * inch, y)
            y -= 16
        y -= 8
    c.save()
    key = out / "answer-key.pdf"
    c = new_canvas(key)
    draw_header(c, "ANSWER KEY — Science Diagram Assessment")
    c.setFont(TYPED_FONT, 11)
    y = 9.6 * inch
    for line in [
        "Labels: A nucleus; B chloroplast; C vacuole; D cell wall",
        "1. vacuole (C)",
        "2. chloroplast (B)",
        "3. Cell walls provide rigid support/protection for plants; animals rely on other structures.",
    ]:
        c.drawString(0.6 * inch, y, line)
        y -= 16
    c.save()
    save_json(
        out / "meta.json",
        {
            "id": "science-diagram-assessment",
            "license": "CC0-1.0",
            "synthetic": True,
            "has_diagram": True,
            "files": ["worksheet.pdf", "answer-key.pdf"],
        },
    )
    print("[ws] science-diagram-assessment")


def generate_worksheets():
    ensure_fonts()
    math_graph_worksheet()
    science_diagram_worksheet()


if __name__ == "__main__":
    generate_worksheets()
