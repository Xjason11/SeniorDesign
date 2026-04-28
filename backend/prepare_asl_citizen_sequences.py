from __future__ import annotations

import argparse
import csv
from pathlib import Path

import cv2

from .asl_vocabulary_reference import get_dataset_label_to_token
from .sequence_samples import append_sequence_sample, get_sequence_sample_counts
from .sign_model import TOKENS
from .vision import extract_hand_landmarks_from_bgr


ASL_CITIZEN_TO_TOKEN = get_dataset_label_to_token()


def prepare_asl_citizen_sequences(
    dataset_dir: Path,
    split: str,
    target_per_token: int,
    frames_per_clip: int,
    dry_run: bool = False,
) -> None:
    rows = _load_filtered_rows(dataset_dir, split)
    current_counts = get_sequence_sample_counts()
    selected_counts = {token: 0 for token in TOKENS}
    saved_counts = {token: 0 for token in TOKENS}
    videos_dir = dataset_dir / "videos"

    for row in rows:
        token = ASL_CITIZEN_TO_TOKEN[_normalize_gloss(row["Gloss"])]
        if current_counts.get(token, 0) + saved_counts[token] >= target_per_token:
            continue

        selected_counts[token] += 1
        video_path = videos_dir / row["Video file"]
        if dry_run:
            continue

        landmark_frames = _extract_even_landmark_sequence(video_path, frames_per_clip)
        if not landmark_frames:
            print(f"skip token={token} no-sequence file={video_path.name}")
            continue

        append_sequence_sample(token, landmark_frames)
        saved_counts[token] += 1
        print(f"saved token={token} sequence_frames={len(landmark_frames)} source={video_path.name}")

    print("selected ASL Citizen clips:", selected_counts)
    if not dry_run:
        print("saved ASL Citizen sequences:", saved_counts)
        print("total sequence sample counts:", get_sequence_sample_counts())


def _load_filtered_rows(dataset_dir: Path, split: str) -> list[dict[str, str]]:
    split_path = dataset_dir / "splits" / f"{split}.csv"
    with split_path.open("r", encoding="utf-8-sig", newline="") as split_file:
        rows = list(csv.DictReader(split_file))

    return [row for row in rows if _normalize_gloss(row.get("Gloss", "")) in ASL_CITIZEN_TO_TOKEN]


def _normalize_gloss(gloss: str) -> str:
    return (
        gloss.strip()
        .lower()
        .replace("-", " ")
        .replace("_", " ")
    )


def _extract_even_landmark_sequence(video_path: Path, frames_per_clip: int) -> list[list[float]]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        return []

    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_count <= 0:
        capture.release()
        return []

    landmark_frames: list[list[float]] = []
    for index in range(frames_per_clip):
        ratio = index / max(1, frames_per_clip - 1)
        frame_index = min(frame_count - 1, round(ratio * (frame_count - 1)))
        capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ok, frame = capture.read()
        if not ok:
            continue

        landmarks = extract_hand_landmarks_from_bgr(frame, live_mode=True)
        landmark_frames.append(landmarks)

    capture.release()
    return landmark_frames if any(landmark_frames) else []


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare ASL Citizen landmark sequences for app tokens.")
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path.home() / "Downloads" / "ASL_Citizen" / "ASL_Citizen",
    )
    parser.add_argument("--split", default="train", choices=["train", "val", "test"])
    parser.add_argument("--target-per-token", type=int, default=100)
    parser.add_argument("--frames-per-clip", type=int, default=8)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    prepare_asl_citizen_sequences(
        dataset_dir=args.dataset_dir,
        split=args.split,
        target_per_token=args.target_per_token,
        frames_per_clip=args.frames_per_clip,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
