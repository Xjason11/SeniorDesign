from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import cv2

from .prepare_msasl import MSASL_TO_TOKEN, _crop_to_box, _download_video
from .sequence_samples import append_sequence_sample, get_sequence_sample_counts
from .sign_model import TOKENS
from .vision import extract_hand_landmarks_from_bgr


def prepare_msasl_sequences(
    dataset_dir: Path,
    split: str,
    max_per_token: int,
    frames_per_clip: int,
    cache_dir: Path,
) -> None:
    rows = _load_filtered_rows(dataset_dir, split)
    selected_counts = {token: 0 for token in TOKENS}

    cache_dir.mkdir(parents=True, exist_ok=True)

    for row in rows:
        token = MSASL_TO_TOKEN[row["text"].lower()]
        if selected_counts[token] >= max_per_token:
            continue

        video_path = _download_video(row, cache_dir)
        if video_path is None:
            continue

        landmark_frames = _extract_clip_landmark_sequence(video_path, row, frames_per_clip)
        if not landmark_frames:
            print(f"skip token={token} no-sequence url={row['url']}")
            continue

        append_sequence_sample(token, landmark_frames)
        selected_counts[token] += 1
        print(f"saved token={token} sequence_frames={len(landmark_frames)} source={video_path.name}")

    print("selected sequence clips:", selected_counts)
    print("total sequence sample counts:", get_sequence_sample_counts())


def _load_filtered_rows(dataset_dir: Path, split: str) -> list[dict[str, Any]]:
    rows = json.loads((dataset_dir / f"MSASL_{split}.json").read_text(encoding="utf-8"))
    return [row for row in rows if row.get("text", "").lower() in MSASL_TO_TOKEN]


def _extract_clip_landmark_sequence(video_path: Path, row: dict[str, Any], frames_per_clip: int) -> list[list[float]]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        return []

    start_time = float(row["start_time"])
    end_time = float(row["end_time"])
    if end_time <= start_time:
        end_time = start_time + 1.0

    landmark_frames: list[list[float]] = []
    for index in range(frames_per_clip):
        ratio = index / max(1, frames_per_clip - 1)
        timestamp_ms = (start_time + ((end_time - start_time) * ratio)) * 1000
        capture.set(cv2.CAP_PROP_POS_MSEC, timestamp_ms)
        ok, frame = capture.read()
        if not ok:
            continue

        cropped = _crop_to_box(frame, row.get("box"))
        landmarks = extract_hand_landmarks_from_bgr(cropped, live_mode=True)
        landmark_frames.append(landmarks)

    capture.release()
    return landmark_frames


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare MS-ASL landmark sequences for the six-sign prototype.")
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path("MS-ASL"),
    )
    parser.add_argument("--split", default="train", choices=["train", "val", "test"])
    parser.add_argument("--max-per-token", type=int, default=24)
    parser.add_argument("--frames-per-clip", type=int, default=8)
    parser.add_argument("--cache-dir", type=Path, default=Path(__file__).resolve().parent / "data" / "msasl_videos")
    args = parser.parse_args()

    prepare_msasl_sequences(
        dataset_dir=args.dataset_dir,
        split=args.split,
        max_per_token=args.max_per_token,
        frames_per_clip=args.frames_per_clip,
        cache_dir=args.cache_dir,
    )


if __name__ == "__main__":
    main()
