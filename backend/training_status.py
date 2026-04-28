from __future__ import annotations

import re
from pathlib import Path


DEFAULT_LOG_PATH = Path(__file__).resolve().parent / "train_asl_citizen_topup.out.log"


def main() -> None:
    log_path = DEFAULT_LOG_PATH
    if not log_path.exists():
        print(f"No training log found at {log_path}")
        return

    log_text = log_path.read_text(encoding="utf-8", errors="ignore")
    print(_format_status(log_text))


def _format_status(log_text: str) -> str:
    if "saved sequence model to" in log_text:
        return _progress_bar(1.0, "Done") + "\nSequence model saved."

    epoch_matches = [int(match) for match in re.findall(r"epoch=(\d+)", log_text)]
    if epoch_matches:
        latest_epoch = max(epoch_matches)
        progress = 0.65 + (min(latest_epoch, 300) / 300 * 0.35)
        return "\n".join(
            [
                _progress_bar(progress, f"Training sequence model epoch {latest_epoch}/300"),
                _latest_epoch_line(log_text),
            ]
        )

    if "Training sequence classifier with ASL Citizen top-up" in log_text:
        return _progress_bar(0.65, "Starting sequence model training")

    split_progress = {
        "train": 0.15,
        "val": 0.35,
        "test": 0.55,
    }
    current_split = "train"
    for split in ("train", "val", "test"):
        if f"Preparing ASL Citizen sequence samples split={split}" in log_text:
            current_split = split

    saved_count = log_text.count("saved token=")
    split_bonus = min(0.12, saved_count / 1200)
    progress = min(0.64, split_progress[current_split] + split_bonus)
    return _progress_bar(progress, f"Importing ASL Citizen split={current_split}, saved sequences={saved_count}")


def _latest_epoch_line(log_text: str) -> str:
    lines = [line for line in log_text.splitlines() if line.startswith("epoch=")]
    return lines[-1] if lines else ""


def _progress_bar(progress: float, label: str) -> str:
    progress = max(0.0, min(1.0, progress))
    width = 30
    filled = round(progress * width)
    bar = "#" * filled + "-" * (width - filled)
    return f"[{bar}] {progress * 100:5.1f}%  {label}"


if __name__ == "__main__":
    main()
