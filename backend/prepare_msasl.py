from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import cv2
from yt_dlp import YoutubeDL

from .samples import append_sample, get_sample_counts
from .sign_model import TOKENS
from .vision import extract_hand_landmarks_from_bgr


MSASL_TO_TOKEN = {
    "hello": "HELLO",
    "thanks": "THANK_YOU",
    "help": "HELP",
    "water": "WATER",
    "yes": "YES",
    "no": "NO",
}


def prepare_msasl(
    dataset_dir: Path,
    split: str,
    max_per_token: int,
    frames_per_clip: int,
    cache_dir: Path,
) -> None:
    rows = _load_filtered_rows(dataset_dir, split)
    selected_counts = {token: 0 for token in TOKENS}
    saved_counts = {token: 0 for token in TOKENS}

    cache_dir.mkdir(parents=True, exist_ok=True)

    for row in rows:
        token = MSASL_TO_TOKEN[row["text"].lower()]
        if selected_counts[token] >= max_per_token:
            continue

        video_path = _download_video(row, cache_dir)
        if video_path is None:
            continue

        landmarks = _extract_clip_landmarks(video_path, row, frames_per_clip)
        if not landmarks:
            print(f"skip token={token} no-hand url={row['url']}")
            continue

        selected_counts[token] += 1
        for vector in landmarks:
            append_sample(token, vector)
            saved_counts[token] += 1

        print(f"saved token={token} vectors={len(landmarks)} source={video_path.name}")

    print("selected clips:", selected_counts)
    print("saved landmark rows:", saved_counts)
    print("total sample counts:", get_sample_counts())


def _load_filtered_rows(dataset_dir: Path, split: str) -> list[dict[str, Any]]:
    rows = json.loads((dataset_dir / f"MSASL_{split}.json").read_text(encoding="utf-8"))
    return [row for row in rows if row.get("text", "").lower() in MSASL_TO_TOKEN]


def _download_video(row: dict[str, Any], cache_dir: Path) -> Path | None:
    url = row["url"]
    if url.startswith("www."):
        url = f"https://{url}"

    video_id = url.split("v=")[-1].split("&")[0].split("/")[-1]
    output_template = str(cache_dir / f"{video_id}.%(ext)s")

    existing = next(cache_dir.glob(f"{video_id}.*"), None)
    if existing:
        return existing

    options = {
        "format": "best[ext=mp4][height<=720]/best[height<=720]/best",
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with YoutubeDL(options) as downloader:
            info = downloader.extract_info(url, download=True)
            filename = downloader.prepare_filename(info)
    except Exception as error:
        print(f"skip download url={url} error={error}")
        return None

    return Path(filename)


def _extract_clip_landmarks(video_path: Path, row: dict[str, Any], frames_per_clip: int) -> list[list[float]]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        return []

    start_time = float(row["start_time"])
    end_time = float(row["end_time"])
    if end_time <= start_time:
        end_time = start_time + 1.0

    vectors: list[list[float]] = []
    for index in range(frames_per_clip):
        ratio = (index + 1) / (frames_per_clip + 1)
        timestamp_ms = (start_time + ((end_time - start_time) * ratio)) * 1000
        capture.set(cv2.CAP_PROP_POS_MSEC, timestamp_ms)
        ok, frame = capture.read()
        if not ok:
            continue

        cropped = _crop_to_box(frame, row.get("box"))
        landmarks = extract_hand_landmarks_from_bgr(cropped)
        if landmarks:
            vectors.append(landmarks)

    capture.release()
    return vectors


def _crop_to_box(frame, box):
    if not box or len(box) != 4:
        return frame

    height, width = frame.shape[:2]
    y0, x0, y1, x1 = box
    left = max(0, min(width - 1, int(float(x0) * width)))
    right = max(left + 1, min(width, int(float(x1) * width)))
    top = max(0, min(height - 1, int(float(y0) * height)))
    bottom = max(top + 1, min(height, int(float(y1) * height)))
    return frame[top:bottom, left:right]


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare MS-ASL landmark samples for the six-sign prototype.")
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path(r"C:\Users\jcana\Downloads\MS-ASL\MS-ASL"),
    )
    parser.add_argument("--split", default="train", choices=["train", "val", "test"])
    parser.add_argument("--max-per-token", type=int, default=20)
    parser.add_argument("--frames-per-clip", type=int, default=3)
    parser.add_argument("--cache-dir", type=Path, default=Path(__file__).resolve().parent / "data" / "msasl_videos")
    args = parser.parse_args()

    prepare_msasl(
        dataset_dir=args.dataset_dir,
        split=args.split,
        max_per_token=args.max_per_token,
        frames_per_clip=args.frames_per_clip,
        cache_dir=args.cache_dir,
    )


if __name__ == "__main__":
    main()
