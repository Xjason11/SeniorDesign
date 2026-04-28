from __future__ import annotations

import argparse
import json
import random
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .sequence_samples import SEQUENCE_SAMPLES_PATH, load_sequence_samples
from .sign_model import LANDMARK_VECTOR_SIZE, SEQUENCE_LENGTH, TOKENS


def augment_sequence_samples(target_per_token: int = 100, seed: int = 42) -> None:
    random.seed(seed)
    rows = load_sequence_samples()
    rows_by_token = {token: [row for row in rows if row["token"] == token] for token in TOKENS}
    counts = Counter(row["token"] for row in rows)

    augmented_rows: list[dict[str, Any]] = []
    for token in TOKENS:
      token_rows = rows_by_token[token]
      if not token_rows:
          print(f"skip token={token} no source sequences")
          continue

      needed = max(0, target_per_token - counts[token])
      for index in range(needed):
          source_row = token_rows[index % len(token_rows)]
          augmented_rows.append(
              {
                  "created_at": datetime.now(timezone.utc).isoformat(),
                  "token": token,
                  "frames": _augment_frames(source_row["frames"]),
                  "source": "synthetic-sequence-augmentation",
              }
          )

      if needed:
          print(f"augmented token={token} added={needed} total={counts[token] + needed}")

    if not augmented_rows:
        print("No sequence augmentation needed.")
        return

    SEQUENCE_SAMPLES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SEQUENCE_SAMPLES_PATH.open("a", encoding="utf-8") as sample_file:
        for row in augmented_rows:
            sample_file.write(json.dumps(row) + "\n")

    print(f"added augmented sequence samples: {len(augmented_rows)}")


def _augment_frames(frames: list[list[float]]) -> list[list[float]]:
    shifted_frames = _shift_frames(frames)
    return [_jitter_frame(frame) for frame in shifted_frames]


def _shift_frames(frames: list[list[float]]) -> list[list[float]]:
    if random.random() < 0.5:
        return frames

    zero_frame = [0.0] * LANDMARK_VECTOR_SIZE
    if random.random() < 0.5:
        return [*frames[1:], frames[-1] if frames else zero_frame][:SEQUENCE_LENGTH]

    return [frames[0] if frames else zero_frame, *frames[:-1]][-SEQUENCE_LENGTH:]


def _jitter_frame(frame: list[float]) -> list[float]:
    if len(frame) != LANDMARK_VECTOR_SIZE:
        return frame

    scale = random.uniform(0.985, 1.015)
    return [
        0.0 if value == 0.0 else (value * scale) + random.uniform(-0.006, 0.006)
        for value in frame
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Top up sequence landmark samples with light augmentation.")
    parser.add_argument("--target-per-token", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    augment_sequence_samples(target_per_token=args.target_per_token, seed=args.seed)


if __name__ == "__main__":
    main()
