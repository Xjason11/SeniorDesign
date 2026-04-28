from __future__ import annotations

from pathlib import Path

from .prepare_asl_citizen_sequences import prepare_asl_citizen_sequences
from .remove_synthetic_sequence_samples import remove_synthetic_sequence_samples
from .sequence_samples import get_sequence_sample_counts
from .sign_model import TOKENS
from .train_sequence import train_sequence


def main() -> None:
    dataset_dir = Path.home() / "Downloads" / "ASL_Citizen" / "ASL_Citizen"
    if not dataset_dir.exists():
        raise SystemExit(f"ASL Citizen dataset not found at {dataset_dir}")

    print("Removing synthetic sequence augmentation rows", flush=True)
    remove_synthetic_sequence_samples()

    for split in ("train", "val", "test"):
        print(f"Preparing ASL Citizen sequence samples split={split}", flush=True)
        prepare_asl_citizen_sequences(
            dataset_dir=dataset_dir,
            split=split,
            target_per_token=120,
            frames_per_clip=8,
            dry_run=False,
        )

    counts = get_sequence_sample_counts()
    print("sequence counts after ASL Citizen top-up:", counts, flush=True)
    print("tokens below 100:", [(token, counts.get(token, 0)) for token in TOKENS if counts.get(token, 0) < 100], flush=True)

    print("Training sequence classifier with ASL Citizen top-up", flush=True)
    train_sequence(epochs=300, batch_size=16, learning_rate=0.001)


if __name__ == "__main__":
    main()
