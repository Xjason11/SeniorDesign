from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from .prepare_msasl import MSASL_TO_TOKEN, _crop_to_box
from .sign_model import TOKENS


def export_msasl_examples(
    dataset_dir: Path,
    cache_dir: Path,
    output_dir: Path,
    examples_per_token: int,
) -> None:
    rows = _load_rows(dataset_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for token in TOKENS:
        token_rows = [row for row in rows if MSASL_TO_TOKEN.get(row.get("text", "").lower()) == token]
        images = []

        for row in token_rows:
            if len(images) >= examples_per_token:
                break

            video_path = _find_cached_video(row, cache_dir)
            if video_path is None:
                continue

            image = _read_middle_frame(video_path, row)
            if image is None:
                continue

            image = cv2.resize(image, (220, 220), interpolation=cv2.INTER_AREA)
            cv2.putText(
                image,
                token.replace("_", " "),
                (10, 24),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.65,
                (255, 255, 255),
                2,
                cv2.LINE_AA,
            )
            images.append(image)

            output_path = output_dir / f"{token}_{len(images):02d}.jpg"
            cv2.imwrite(str(output_path), image)

        if images:
            contact_sheet = _make_contact_sheet(images)
            cv2.imwrite(str(output_dir / f"{token}_contact_sheet.jpg"), contact_sheet)

        print(f"{token}: exported {len(images)} examples")


def _load_rows(dataset_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for split in ["train", "val", "test"]:
        split_path = dataset_dir / f"MSASL_{split}.json"
        if split_path.exists():
            rows.extend(json.loads(split_path.read_text(encoding="utf-8")))
    return rows


def _find_cached_video(row: dict[str, Any], cache_dir: Path) -> Path | None:
    url = row["url"]
    video_id = url.split("v=")[-1].split("&")[0].split("/")[-1]
    return next(cache_dir.glob(f"{video_id}.*"), None)


def _read_middle_frame(video_path: Path, row: dict[str, Any]):
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        return None

    timestamp_ms = ((float(row["start_time"]) + float(row["end_time"])) / 2) * 1000
    capture.set(cv2.CAP_PROP_POS_MSEC, timestamp_ms)
    ok, frame = capture.read()
    capture.release()

    if not ok:
        return None

    return _crop_to_box(frame, row.get("box"))


def _make_contact_sheet(images: list[np.ndarray]) -> np.ndarray:
    columns = min(4, len(images))
    rows = int(np.ceil(len(images) / columns))
    blank = np.zeros_like(images[0])
    padded = [*images, *([blank] * ((rows * columns) - len(images)))]
    row_images = []

    for row_index in range(rows):
        start = row_index * columns
        row_images.append(np.hstack(padded[start : start + columns]))

    return np.vstack(row_images)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export visual MS-ASL examples for each app token.")
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path("MS-ASL"),
    )
    parser.add_argument("--cache-dir", type=Path, default=Path(__file__).resolve().parent / "data" / "msasl_videos")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent / "reports" / "msasl_examples")
    parser.add_argument("--examples-per-token", type=int, default=8)
    args = parser.parse_args()

    export_msasl_examples(
        dataset_dir=args.dataset_dir,
        cache_dir=args.cache_dir,
        output_dir=args.output_dir,
        examples_per_token=args.examples_per_token,
    )


if __name__ == "__main__":
    main()
