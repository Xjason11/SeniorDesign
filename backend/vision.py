from __future__ import annotations

import base64
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions

HAND_LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)
HAND_LANDMARKER_PATH = Path(__file__).resolve().parent / "models" / "hand_landmarker.task"
hand_landmarker: vision.HandLandmarker | None = None

def extract_hand_landmarks(image_base64: str) -> list[float]:
    image_bytes = _decode_base64_image(image_base64)
    np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr_image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

    if bgr_image is None:
        raise ValueError("Could not decode image.")

    return extract_hand_landmarks_from_bgr(bgr_image)


def extract_hand_landmarks_fast(image_base64: str) -> list[float]:
    image_bytes = _decode_base64_image(image_base64)
    np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr_image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

    if bgr_image is None:
        raise ValueError("Could not decode image.")

    return extract_hand_landmarks_from_bgr(bgr_image, live_mode=True)


def extract_hand_landmark_sequence(image_base64_frames: list[str], live_mode: bool = False) -> list[list[float]]:
    landmark_frames: list[list[float]] = []
    for image_base64 in image_base64_frames:
        image_bytes = _decode_base64_image(image_base64)
        np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        bgr_image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)

        if bgr_image is None:
            raise ValueError("Could not decode image.")

        landmark_frames.append(extract_hand_landmarks_from_bgr(bgr_image, live_mode=live_mode))

    return landmark_frames


def extract_hand_landmarks_from_bgr(bgr_image: np.ndarray, live_mode: bool = False) -> list[float]:
    landmarker = get_hand_landmarker()
    if live_mode:
        bgr_image = downscale_for_live_inference(bgr_image)
    rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
    result = landmarker.detect(image)

    if not result.hand_landmarks:
        return []

    values: list[float] = []
    for hand_landmarks in result.hand_landmarks:
        for landmark in hand_landmarks:
            values.extend([landmark.x, landmark.y, landmark.z])

    return values


def downscale_for_live_inference(bgr_image: np.ndarray) -> np.ndarray:
    height, width = bgr_image.shape[:2]
    max_side = max(height, width)
    if max_side <= 384:
        return bgr_image

    scale = 384 / max_side
    resized_width = max(1, int(width * scale))
    resized_height = max(1, int(height * scale))
    return cv2.resize(bgr_image, (resized_width, resized_height), interpolation=cv2.INTER_AREA)


def get_hand_landmarker() -> vision.HandLandmarker:
    global hand_landmarker

    if hand_landmarker is None:
        ensure_hand_landmarker_model()
        options = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(HAND_LANDMARKER_PATH)),
            num_hands=2,
            min_hand_detection_confidence=0.35,
            min_hand_presence_confidence=0.35,
            min_tracking_confidence=0.35,
        )
        hand_landmarker = vision.HandLandmarker.create_from_options(options)

    return hand_landmarker


def ensure_hand_landmarker_model() -> None:
    if HAND_LANDMARKER_PATH.exists():
        return

    HAND_LANDMARKER_PATH.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(HAND_LANDMARKER_URL, HAND_LANDMARKER_PATH)


def _decode_base64_image(image_base64: str) -> bytes:
    payload = image_base64
    if "," in payload:
        payload = payload.split(",", 1)[1]

    try:
        return base64.b64decode(payload, validate=True)
    except ValueError as error:
        raise ValueError("Image payload is not valid base64.") from error
