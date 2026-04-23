from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .sign_model import LANDMARK_VECTOR_SIZE, SEQUENCE_LENGTH, TOKENS, normalize_landmark_sequence


DATA_DIR = Path(__file__).resolve().parent / "data"
SEQUENCE_SAMPLES_PATH = DATA_DIR / "sequence_landmark_samples.jsonl"


def append_sequence_sample(token: str, landmark_frames: list[list[float]]) -> dict[str, Any]:
    if token not in TOKENS:
        raise ValueError(f"Unsupported token: {token}")

    row = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "token": token,
        "frames": normalize_landmark_sequence(landmark_frames),
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with SEQUENCE_SAMPLES_PATH.open("a", encoding="utf-8") as sample_file:
        sample_file.write(json.dumps(row) + "\n")

    return row


def load_sequence_samples() -> list[dict[str, Any]]:
    if not SEQUENCE_SAMPLES_PATH.exists():
        return []

    rows: list[dict[str, Any]] = []
    with SEQUENCE_SAMPLES_PATH.open("r", encoding="utf-8") as sample_file:
        for line in sample_file:
            if not line.strip():
                continue
            row = json.loads(line)
            frames = row.get("frames", [])
            is_valid = (
                row.get("token") in TOKENS
                and len(frames) == SEQUENCE_LENGTH
                and all(len(frame) == LANDMARK_VECTOR_SIZE for frame in frames)
            )
            if is_valid:
                rows.append(row)

    return rows


def get_sequence_sample_counts() -> dict[str, int]:
    counts = Counter(row["token"] for row in load_sequence_samples())
    return {token: counts.get(token, 0) for token in TOKENS}
