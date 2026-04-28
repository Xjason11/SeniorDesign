from __future__ import annotations

import argparse
import json
from pathlib import Path

from .sequence_samples import SEQUENCE_SAMPLES_PATH


def remove_synthetic_sequence_samples() -> None:
    if not SEQUENCE_SAMPLES_PATH.exists():
        print("No sequence sample file found.")
        return

    backup_path = SEQUENCE_SAMPLES_PATH.with_suffix(".jsonl.before_synthetic_cleanup")
    if not backup_path.exists():
        backup_path.write_text(SEQUENCE_SAMPLES_PATH.read_text(encoding="utf-8"), encoding="utf-8")

    kept_lines: list[str] = []
    removed_count = 0
    with SEQUENCE_SAMPLES_PATH.open("r", encoding="utf-8") as sample_file:
        for line in sample_file:
            if not line.strip():
                continue

            row = json.loads(line)
            if row.get("source") == "synthetic-sequence-augmentation":
                removed_count += 1
                continue

            kept_lines.append(json.dumps(row) + "\n")

    SEQUENCE_SAMPLES_PATH.write_text("".join(kept_lines), encoding="utf-8")
    print(f"removed synthetic sequence samples: {removed_count}")
    print(f"backup: {backup_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Remove synthetic sequence augmentation rows.")
    parser.parse_args()
    remove_synthetic_sequence_samples()


if __name__ == "__main__":
    main()
