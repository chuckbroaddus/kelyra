#!/usr/bin/env python3
"""DITL CC0 artifact generator (skeleton).
Generates small synthetic CC0 PNG/JPEG for DITL QA fixtures.
Run with: python3.11 generate_ditl_artifacts.py
All output dedicated to CC0 1.0.
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "notes/qa-fixtures/ditl"
os.makedirs(OUT_DIR, exist_ok=True)

def add_cc0_header(draw, width, y=10):
    draw.text((10, y), "CC0 1.0 Universal | Public Domain | Synthetic for Kelyra DITL QA | 2026-09-10", fill="gray")

def make_student_card():
    """Generate ditl-student-card-handwritten-S-01.png"""
    img = Image.new('RGB', (600, 400), 'white')
    draw = ImageDraw.Draw(img)
    # Simple lined paper look + fields filled with synthetic data (Alex Rivera style)
    for i in range(8):
        y = 60 + i*45
        draw.line([(20, y), (580, y)], fill="#ddd", width=1)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
        small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
    except:
        font = ImageFont.load_default()
        small = font
    draw.text((20, 20), "STUDENT INFORMATION CARD (synthetic, CC0)", fill="black", font=font)
    fields = [
        ("Name:", "Alex Rivera"),
        ("Date:", "09/10/2026"),
        ("Address:", "123 Maple St, Austin, TX 78701"),
        ("Phone:", "(512) 555-0142"),
        ("Email:", "alex.rivera@school.edu"),
        ("Birthday:", "03/15/2012"),
    ]
    y = 70
    for label, val in fields:
        draw.text((30, y), label, fill="black", font=small)
        draw.text((150, y), val, fill="#0033cc", font=small)  # "handwritten" blue
        y += 45
    add_cc0_header(draw, 600, 380)
    img.save(os.path.join(OUT_DIR, "ditl-student-card-handwritten-S-01.png"))
    print("Created: ditl-student-card-handwritten-S-01.png")


def make_syllabus_photo():
    """ditl-english-syllabus-photo-T-04.jpg - typed syllabus page photo"""
    img = Image.new('RGB', (800, 1000), '#f8f8f0')
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
    except:
        font = ImageFont.load_default()
        title_font = font
    # Header
    draw.rectangle([20, 20, 780, 80], outline="#333", width=2)
    draw.text((30, 30), "ENGLISH 8 - COURSE SYLLABUS 2026-27", fill="#000", font=title_font)
    # Body text lines (typed look)
    lines = [
        "Teacher: Ms. Jordan Lee  |  Room 214  |  jlee@school.edu",
        "Office Hours: Mon-Thu 3:15-4:00pm",
        "",
        "COURSE DESCRIPTION",
        "This course develops reading, writing, and critical thinking skills through",
        "analysis of literature, nonfiction, and student-led discussions.",
        "",
        "GRADING POLICY",
        "Homework & Classwork: 30%   |   Quizzes: 25%   |   Tests/Projects: 30%   |   Participation: 15%",
        "",
        "UNITS (Fall Semester)",
        "1. Narrative Writing & Personal Essays",
        "2. Poetry Analysis & Performance",
        "3. Argumentative Writing & Debate",
        "4. Novel Study: To Kill a Mockingbird (excerpts, PD)",
        "",
        "MATERIALS NEEDED",
        "- Notebook, pens, charged laptop, independent reading book",
        "",
        "Late work: -10% per day. No exceptions without prior arrangement.",
        "Plagiarism: automatic zero + parent contact.",
    ]
    y = 100
    for line in lines:
        draw.text((40, y), line, fill="#222", font=font)
        y += 28
    add_cc0_header(draw, 800, 970)
    img.save(os.path.join(OUT_DIR, "ditl-english-syllabus-photo-T-04.jpg"), quality=85)
    print("Created: ditl-english-syllabus-photo-T-04.jpg")


def make_science_handwritten():
    """ditl-science-test-handwritten-T-01.png"""
    img = Image.new('RGB', (700, 900), 'white')
    draw = ImageDraw.Draw(img)
    for i in range(12):
        y = 80 + i * 60
        draw.line([(30, y), (670, y)], fill="#e0e0e0", width=1)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 15)
    except:
        font = ImageFont.load_default()
    draw.text((30, 20), "Science Test - Cell Biology (handwritten practice)", fill="#000", font=font)
    content = [
        "Name: Jordan Lee     Date: 09/09/26     Period: 3",
        "",
        "1. Label the parts of the cell (mitochondria, nucleus, membrane):",
        "   [drawing box with labels]",
        "",
        "2. What is the function of the cell wall in plant cells?",
        "   Ans: Provides structure and protection (in blue ink style)",
        "",
        "3. Short answer: Photosynthesis equation",
        "   6CO2 + 6H2O -> C6H12O6 + 6O2",
    ]
    y = 90
    for line in content:
        draw.text((40, y), line, fill="#0033aa", font=font)
        y += 55
    add_cc0_header(draw, 700, 870)
    img.save(os.path.join(OUT_DIR, "ditl-science-test-handwritten-T-01.png"))
    print("Created: ditl-science-test-handwritten-T-01.png")


def make_history_answerkey():
    """ditl-history-answerkey-photo-T-02.png - mixed typed/handwritten key"""
    img = Image.new('RGB', (650, 850), '#fffef5')
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
    except:
        font = ImageFont.load_default()
    draw.text((20, 15), "US History EOC Practice - ANSWER KEY (CC0 synthetic)", fill="#000", font=font)
    key_lines = [
        "1. Correct: B - Louisiana Purchase (1803)",
        "   Teacher note: students often confuse with Florida cession",
        "2. Correct: D - 13th Amendment",
        "3. Short answer rubric: 2pts for mentioning 'manifest destiny'",
        "   Sample student response (handwritten style): 'expansion to Pacific'",
        "4-10: (omitted for brevity in fixture; full in real use)",
        "END OF KEY - CC0 1.0",
    ]
    y = 50
    for line in key_lines:
        draw.text((30, y), line, fill="#222", font=font)
        y += 35
    add_cc0_header(draw, 650, 820)
    img.save(os.path.join(OUT_DIR, "ditl-history-answerkey-photo-T-02.png"))
    print("Created: ditl-history-answerkey-photo-T-02.png")


if __name__ == "__main__":
    make_student_card()
    make_syllabus_photo()
    make_science_handwritten()
    make_history_answerkey()
    print("All image artifacts generated.")