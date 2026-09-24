"""Synthetic 32-student roster (CC0). Unique first+last pairs."""
from __future__ import annotations

STUDENTS = [
    {"id": "S01", "first": "Alex", "last": "Rivera"},
    {"id": "S02", "first": "Jordan", "last": "Chen"},
    {"id": "S03", "first": "Sam", "last": "Patel"},
    {"id": "S04", "first": "Casey", "last": "Nguyen"},
    {"id": "S05", "first": "Riley", "last": "Brooks"},
    {"id": "S06", "first": "Morgan", "last": "Kim"},
    {"id": "S07", "first": "Taylor", "last": "Garcia"},
    {"id": "S08", "first": "Avery", "last": "Walsh"},
    {"id": "S09", "first": "Quinn", "last": "Hassan"},
    {"id": "S10", "first": "Reese", "last": "Okoro"},
    {"id": "S11", "first": "Cameron", "last": "Lopez"},
    {"id": "S12", "first": "Jamie", "last": "Singh"},
    {"id": "S13", "first": "Drew", "last": "Martinez"},
    {"id": "S14", "first": "Parker", "last": "Andersen"},
    {"id": "S15", "first": "Blake", "last": "Torres"},
    {"id": "S16", "first": "Skyler", "last": "Bennett"},
    {"id": "S17", "first": "Finley", "last": "Cruz"},
    {"id": "S18", "first": "Harper", "last": "Diaz"},
    {"id": "S19", "first": "Emerson", "last": "Foster"},
    {"id": "S20", "first": "Rowan", "last": "Hughes"},
    {"id": "S21", "first": "Sawyer", "last": "Ibrahim"},
    {"id": "S22", "first": "Phoenix", "last": "Jenkins"},
    {"id": "S23", "first": "Dakota", "last": "Kowalski"},
    {"id": "S24", "first": "Hayden", "last": "Lee"},
    {"id": "S25", "first": "Logan", "last": "Morales"},
    {"id": "S26", "first": "Peyton", "last": "Nakamura"},
    {"id": "S27", "first": "Charlie", "last": "Owens"},
    {"id": "S28", "first": "Elliot", "last": "Perez"},
    {"id": "S29", "first": "Parker", "last": "Quinn"},  # distinct last from S14
    {"id": "S30", "first": "Remy", "last": "Santos"},
    {"id": "S31", "first": "Kai", "last": "Thompson"},
    {"id": "S32", "first": "Nova", "last": "Vargas"},
]

# Fix accidental duplicate first+last: S14 Parker Andersen, S29 Parker Quinn — OK unique pairs
assert len({(s["first"], s["last"]) for s in STUDENTS}) == 32
assert len({s["id"] for s in STUDENTS}) == 32


def display_name(s: dict) -> str:
    return f"{s['first']} {s['last']}"


def roster_json(period: str = "P3", grade: str = "8") -> dict:
    return {
        "license": "CC0-1.0",
        "synthetic": True,
        "note": "All names are synthetic fixtures for Kelyra QA. Not real students.",
        "period": period,
        "grade": grade,
        "count": len(STUDENTS),
        "students": [
            {
                "id": s["id"],
                "first_name": s["first"],
                "last_name": s["last"],
                "display_name": display_name(s),
            }
            for s in STUDENTS
        ],
    }
