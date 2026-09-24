"""Original synthetic quiz/homework content (CC0)."""
from __future__ import annotations

MATH = {
    "id": "math-quiz-32",
    "title": "Algebra I — Linear Relationships Quiz",
    "subject": "math",
    "period": "P3",
    "questions": [
        {"n": 1, "prompt": "Solve: 2x + 5 = 11", "answer": "x = 3", "type": "short"},
        {"n": 2, "prompt": "Simplify: 3(x − 2) + 4", "answer": "3x − 2", "type": "short"},
        {"n": 3, "prompt": "What is the slope of the line through (0, 1) and (2, 5)?", "answer": "2", "type": "short"},
        {"n": 4, "prompt": "Write the y-intercept of y = −3x + 7.", "answer": "7", "type": "short"},
        {"n": 5, "prompt": "Evaluate 4² − 3·2.", "answer": "10", "type": "short"},
        {"n": 6, "prompt": "Is (2, 3) a solution to x + y = 5? (yes/no)", "answer": "yes", "type": "short"},
        {
            "n": 7,
            "prompt": "The graph shows distance (miles) vs time (hours). About how far after 3 hours?",
            "answer": "60",
            "type": "graph",
            "graph_points": [(0, 0), (1, 20), (2, 40), (3, 60), (4, 80)],
            "graph_title": "Distance vs Time",
        },
        {"n": 8, "prompt": "Solve for y: 5y = 20", "answer": "y = 4", "type": "short"},
    ],
}

SCIENCE = {
    "id": "science-quiz-32",
    "title": "Life Science — Cells & Energy Quiz",
    "subject": "science",
    "period": "P2",
    "questions": [
        {"n": 1, "prompt": "Which organelle is often called the powerhouse of the cell?", "answer": "mitochondria", "type": "short"},
        {"n": 2, "prompt": "Plant cells make food using sunlight in a process called ____.", "answer": "photosynthesis", "type": "short"},
        {"n": 3, "prompt": "True/False: Animal cells have a cell wall.", "answer": "False", "type": "short"},
        {"n": 4, "prompt": "Name the jelly-like material that fills most of a cell.", "answer": "cytoplasm", "type": "short"},
        {
            "n": 5,
            "prompt": "On the plant-cell diagram, label A–D (nucleus, chloroplast, vacuole, cell wall).",
            "answer": "A nucleus; B chloroplast; C vacuole; D cell wall",
            "type": "diagram",
        },
        {"n": 6, "prompt": "What gas do plants release during photosynthesis?", "answer": "oxygen", "type": "short"},
        {"n": 7, "prompt": "DNA is stored mainly in which organelle?", "answer": "nucleus", "type": "short"},
        {"n": 8, "prompt": "One sentence: why do cells need energy?", "answer": "Cells need energy to grow, repair, and carry out life processes.", "type": "short"},
    ],
}

HISTORY = {
    "id": "history-quiz-32",
    "title": "US History — Foundations Mini-Quiz",
    "subject": "history",
    "period": "P4",
    "passage": (
        "In a fictional town called Maple Bend, residents wrote a short charter in 1785. "
        "The charter said leaders must listen to townsfolk before raising taxes, and that "
        "every free adult could speak at the monthly meeting. Historians use Maple Bend as "
        "a classroom model of early self-government — not a real founding document."
    ),
    "questions": [
        {"n": 1, "prompt": "In what year was the (fictional) Maple Bend charter written?", "answer": "1785", "type": "short"},
        {"n": 2, "prompt": "According to the passage, what must leaders do before raising taxes?", "answer": "listen to townsfolk", "type": "short"},
        {"n": 3, "prompt": "Who could speak at the monthly meeting?", "answer": "every free adult", "type": "short"},
        {"n": 4, "prompt": "Is Maple Bend presented as a real founding document? (yes/no)", "answer": "no", "type": "short"},
        {"n": 5, "prompt": "Name one idea the charter models.", "answer": "self-government", "type": "short"},
        {"n": 6, "prompt": "The Declaration of Independence was adopted in what year? (standard fact)", "answer": "1776", "type": "short"},
        {"n": 7, "prompt": "A constitution is best described as a ____ for government.", "answer": "plan / framework", "type": "short"},
        {"n": 8, "prompt": "One sentence: why do historians study local charters?", "answer": "They show how communities practiced self-rule and rights.", "type": "short"},
    ],
}

ENGLISH = {
    "id": "english-quiz-32",
    "title": "English 8 — Reading & Grammar Quiz",
    "subject": "english",
    "period": "P1",
    "passage": (
        "Marisol kept a small notebook in her backpack. Each afternoon she wrote three things "
        "she noticed on the walk home: a cracked sidewalk tile, a dog that always barked twice, "
        "the smell of bread from the corner bakery. One Tuesday the bakery was closed. Marisol "
        "wrote that down too, then added, \"Even missing things are worth noticing.\""
    ),
    "questions": [
        {"n": 1, "prompt": "What does Marisol keep in her backpack?", "answer": "a small notebook", "type": "short"},
        {"n": 2, "prompt": "How many things does she usually write each afternoon?", "answer": "three", "type": "short"},
        {"n": 3, "prompt": "What was different on Tuesday?", "answer": "the bakery was closed", "type": "short"},
        {"n": 4, "prompt": "In the last sentence, \"missing things\" most nearly means ____.", "answer": "things that are absent / not there", "type": "short"},
        {"n": 5, "prompt": "Identify the noun in: \"The bakery smelled wonderful.\" (bakery / smelled / wonderful)", "answer": "bakery", "type": "short"},
        {"n": 6, "prompt": "Rewrite correctly: she walk home slow.", "answer": "She walks home slowly.", "type": "short"},
        {"n": 7, "prompt": "Is the passage fiction or a news report?", "answer": "fiction", "type": "short"},
        {"n": 8, "prompt": "One sentence: what theme does Marisol's note suggest?", "answer": "Paying attention matters, even when something is missing.", "type": "short"},
    ],
}

MATH_HW = {
    "id": "math-hw-12",
    "title": "Algebra I Homework — Equations Practice",
    "subject": "math",
    "questions": [
        {"n": 1, "prompt": "Solve: x + 7 = 15", "answer": "x = 8"},
        {"n": 2, "prompt": "Solve: 3x = 18", "answer": "x = 6"},
        {"n": 3, "prompt": "Solve: 2x − 4 = 10", "answer": "x = 7"},
        {"n": 4, "prompt": "Simplify: 5x + 2x", "answer": "7x"},
        {"n": 5, "prompt": "Evaluate: 2³", "answer": "8"},
        {"n": 6, "prompt": "Slope of horizontal line?", "answer": "0"},
    ],
}

ENGLISH_HW = {
    "id": "english-hw-10",
    "title": "English Homework — Sentence Craft",
    "subject": "english",
    "questions": [
        {"n": 1, "prompt": "Underline the subject: The river flooded the park.", "answer": "river / The river"},
        {"n": 2, "prompt": "Choose: its / it's raining.", "answer": "it's"},
        {"n": 3, "prompt": "Plural of \"leaf\"", "answer": "leaves"},
        {"n": 4, "prompt": "Synonym of \"happy\"", "answer": "glad / joyful / content (any)"},
        {"n": 5, "prompt": "Write one complex sentence about rain.", "answer": "(varies; must have dependent clause)"},
    ],
}

PACKS = {
    "math": MATH,
    "science": SCIENCE,
    "history": HISTORY,
    "english": ENGLISH,
}
