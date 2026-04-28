from __future__ import annotations

from pathlib import Path

from .prepare_msasl import prepare_msasl
from .prepare_msasl_sequences import prepare_msasl_sequences
from .train import train
from .train_sequence import train_sequence


def main() -> None:
    dataset_dir = Path.home() / "Downloads" / "MS-ASL" / "MS-ASL"
    cache_dir = Path(__file__).resolve().parent / "data" / "msasl_videos"

    if not dataset_dir.exists():
        raise SystemExit(f"MS-ASL dataset metadata not found at {dataset_dir}")

    for split in ("train", "val", "test"):
        print(f"Preparing single-frame MS-ASL samples split={split}", flush=True)
        prepare_msasl(
            dataset_dir=dataset_dir,
            split=split,
            max_per_token=80,
            frames_per_clip=4,
            cache_dir=cache_dir,
        )

        print(f"Preparing sequence MS-ASL samples split={split}", flush=True)
        prepare_msasl_sequences(
            dataset_dir=dataset_dir,
            split=split,
            max_per_token=80,
            frames_per_clip=8,
            cache_dir=cache_dir,
        )

    print("Training expanded single-frame classifier", flush=True)
    train(epochs=300, batch_size=24, learning_rate=0.001)

    print("Training expanded sequence classifier", flush=True)
    train_sequence(epochs=300, batch_size=16, learning_rate=0.001)


if __name__ == "__main__":
    main()
