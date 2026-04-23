from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .sign_model import LANDMARK_VECTOR_SIZE, TOKENS, normalize_landmark_vector


DATA_DIR = Path(__file__).resolve().parent / "data"
SAMPLES_PATH = DATA_DIR / "landmark_samples.jsonl"


def append_sample(token: str, landmarks: list[float]) -> dict[str, Any]:
    if token not in TOKENS:
        raise ValueError(f"Unsupported token: {token}")

    row = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "token": token,
        "landmarks": normalize_landmark_vector(landmarks),
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with SAMPLES_PATH.open("a", encoding="utf-8") as sample_file:
        sample_file.write(json.dumps(row) + "\n")

    return row


def load_samples() -> list[dict[str, Any]]:
    if not SAMPLES_PATH.exists():
        return []

    rows: list[dict[str, Any]] = []
    with SAMPLES_PATH.open("r", encoding="utf-8") as sample_file:
        for line in sample_file:
            if not line.strip():
                continue
            row = json.loads(line)
            if row.get("token") in TOKENS and len(row.get("landmarks", [])) == LANDMARK_VECTOR_SIZE:
                rows.append(row)

    return rows


def get_sample_counts() -> dict[str, int]:
    counts = Counter(row["token"] for row in load_samples())
    return {token: counts.get(token, 0) for token in TOKENS}
