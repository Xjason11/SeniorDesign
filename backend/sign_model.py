from __future__ import annotations

import os
from pathlib import Path

MIOPEN_CACHE_DIR = Path(__file__).resolve().parent / "models" / "miopen-cache"
MIOPEN_CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MIOPEN_CUSTOM_CACHE_DIR", str(MIOPEN_CACHE_DIR))
os.environ.setdefault("MIOPEN_USER_DB_PATH", str(MIOPEN_CACHE_DIR))

import torch
from torch import nn


TOKENS = [
    "HELLO",
    "THANK_YOU",
    "HELP",
    "WATER",
    "YES",
    "NO",
    "BATHROOM",
    "DOCTOR",
    "PAIN",
    "STOP",
    "WAIT",
    "WRITE",
    "CALL",
    "WHERE",
    "NOW",
    "PLEASE",
    "FOOD",
    "EAT",
    "MORE",
    "AGAIN",
    "SORRY",
    "GOOD",
    "BAD",
    "NAME",
    "WHAT",
    "WHO",
    "WHY",
    "HOW",
    "WHEN",
    "HOME",
    "SCHOOL",
    "WORK",
    "FAMILY",
    "MOTHER",
    "FATHER",
    "FRIEND",
    "TEACHER",
    "STUDENT",
    "LEARN",
    "UNDERSTAND",
    "SICK",
    "MEDICINE",
    "HOSPITAL",
    "GO",
    "COME",
    "WANT",
    "NEED",
    "LIKE",
    "HAPPY",
    "SAD",
]
TOKEN_LABELS = {
    "HELLO": "HELLO",
    "THANK_YOU": "THANK YOU",
    "HELP": "HELP",
    "WATER": "WATER",
    "YES": "YES",
    "NO": "NO",
    "BATHROOM": "BATHROOM",
    "DOCTOR": "DOCTOR",
    "PAIN": "PAIN",
    "STOP": "STOP",
    "WAIT": "WAIT",
    "WRITE": "WRITE",
    "CALL": "CALL",
    "WHERE": "WHERE",
    "NOW": "NOW",
    "PLEASE": "PLEASE",
    "FOOD": "FOOD",
    "EAT": "EAT",
    "MORE": "MORE",
    "AGAIN": "AGAIN",
    "SORRY": "SORRY",
    "GOOD": "GOOD",
    "BAD": "BAD",
    "NAME": "NAME",
    "WHAT": "WHAT",
    "WHO": "WHO",
    "WHY": "WHY",
    "HOW": "HOW",
    "WHEN": "WHEN",
    "HOME": "HOME",
    "SCHOOL": "SCHOOL",
    "WORK": "WORK",
    "FAMILY": "FAMILY",
    "MOTHER": "MOTHER",
    "FATHER": "FATHER",
    "FRIEND": "FRIEND",
    "TEACHER": "TEACHER",
    "STUDENT": "STUDENT",
    "LEARN": "LEARN",
    "UNDERSTAND": "UNDERSTAND",
    "SICK": "SICK",
    "MEDICINE": "MEDICINE",
    "HOSPITAL": "HOSPITAL",
    "GO": "GO",
    "COME": "COME",
    "WANT": "WANT",
    "NEED": "NEED",
    "LIKE": "LIKE",
    "HAPPY": "HAPPY",
    "SAD": "SAD",
}
LANDMARK_VECTOR_SIZE = 126
MODEL_PATH = Path(__file__).resolve().parent / "models" / "sign_classifier.pt"
SEQUENCE_MODEL_PATH = Path(__file__).resolve().parent / "models" / "sign_sequence_classifier.pt"
SEQUENCE_LENGTH = 8
HAND_LANDMARK_SIZE = 63
DEPTH_WEIGHT = 0.25


class SignClassifier(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(LANDMARK_VECTOR_SIZE, 96),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(96, 48),
            nn.ReLU(),
            nn.Linear(48, len(TOKENS)),
        )

    def forward(self, values: torch.Tensor) -> torch.Tensor:
        return self.network(values)


class SignSequenceClassifier(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Flatten(),
            nn.Linear(SEQUENCE_LENGTH * LANDMARK_VECTOR_SIZE, 256),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, len(TOKENS)),
        )

    def forward(self, values: torch.Tensor) -> torch.Tensor:
        return self.network(values)


def normalize_landmark_vector(landmarks: list[float]) -> list[float]:
    values = landmarks[:LANDMARK_VECTOR_SIZE]
    if len(values) < LANDMARK_VECTOR_SIZE:
        values = [*values, *([0.0] * (LANDMARK_VECTOR_SIZE - len(values)))]
    return values


def normalize_model_landmark_vector(landmarks: list[float]) -> list[float]:
    values = normalize_landmark_vector(landmarks)
    return [
        *normalize_hand_landmarks(values[:HAND_LANDMARK_SIZE]),
        *normalize_hand_landmarks(values[HAND_LANDMARK_SIZE:LANDMARK_VECTOR_SIZE]),
    ]


def normalize_landmark_sequence(
    landmark_frames: list[list[float]],
    sequence_length: int = SEQUENCE_LENGTH,
) -> list[list[float]]:
    frames = [normalize_landmark_vector(frame) for frame in landmark_frames if frame]
    if len(frames) > sequence_length:
        frames = frames[-sequence_length:]

    padding = [[0.0] * LANDMARK_VECTOR_SIZE for _ in range(max(0, sequence_length - len(frames)))]
    return [*padding, *frames]


def normalize_model_landmark_sequence(
    landmark_frames: list[list[float]],
    sequence_length: int = SEQUENCE_LENGTH,
) -> list[list[float]]:
    return [
        normalize_model_landmark_vector(frame)
        for frame in normalize_landmark_sequence(landmark_frames, sequence_length)
    ]


def normalize_hand_landmarks(hand_values: list[float]) -> list[float]:
    if len(hand_values) != HAND_LANDMARK_SIZE or not any(hand_values):
        return [0.0] * HAND_LANDMARK_SIZE

    wrist_x, wrist_y, wrist_z = hand_values[:3]
    scale = max(
        0.05,
        _xy_distance(hand_values, 0, 5),
        _xy_distance(hand_values, 0, 9),
        _xy_distance(hand_values, 0, 17),
    )

    normalized: list[float] = []
    for index in range(0, HAND_LANDMARK_SIZE, 3):
        x, y, z = hand_values[index : index + 3]
        normalized.extend(
            [
                (x - wrist_x) / scale,
                (y - wrist_y) / scale,
                ((z - wrist_z) / scale) * DEPTH_WEIGHT,
            ]
        )

    return normalized


def _xy_distance(hand_values: list[float], first_landmark: int, second_landmark: int) -> float:
    first_index = first_landmark * 3
    second_index = second_landmark * 3
    first_x, first_y = hand_values[first_index : first_index + 2]
    second_x, second_y = hand_values[second_index : second_index + 2]
    return ((first_x - second_x) ** 2 + (first_y - second_y) ** 2) ** 0.5


def get_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_classifier() -> SignClassifier | None:
    if not MODEL_PATH.exists():
        return None

    device = get_device()
    model = SignClassifier().to(device)
    payload = torch.load(MODEL_PATH, map_location=device)
    if payload.get("tokens") != TOKENS:
        return None
    model.load_state_dict(payload["model_state"])
    model.eval()
    return model


def load_sequence_classifier() -> SignSequenceClassifier | None:
    if not SEQUENCE_MODEL_PATH.exists():
        return None

    device = get_device()
    model = SignSequenceClassifier().to(device)
    payload = torch.load(SEQUENCE_MODEL_PATH, map_location=device)
    if payload.get("tokens") != TOKENS:
        return None
    model.load_state_dict(payload["model_state"])
    model.eval()
    return model


def predict_sign(model: SignClassifier, landmarks: list[float]) -> tuple[str, float]:
    probabilities = predict_sign_probabilities(model, landmarks)
    token = max(probabilities, key=probabilities.get)
    return token, probabilities[token]


def predict_sign_probabilities(model: SignClassifier, landmarks: list[float]) -> dict[str, float]:
    device = get_device()
    values = torch.tensor([normalize_model_landmark_vector(landmarks)], dtype=torch.float32, device=device)

    with torch.no_grad():
        probabilities = torch.softmax(model(values), dim=1)[0].tolist()

    return {token: float(probabilities[index]) for index, token in enumerate(TOKENS)}


def predict_sign_sequence(model: SignSequenceClassifier, landmark_frames: list[list[float]]) -> tuple[str, float]:
    probabilities = predict_sign_sequence_probabilities(model, landmark_frames)
    token = max(probabilities, key=probabilities.get)
    return token, probabilities[token]


def predict_sign_sequence_probabilities(
    model: SignSequenceClassifier, landmark_frames: list[list[float]]
) -> dict[str, float]:
    device = get_device()
    values = torch.tensor(
        [normalize_model_landmark_sequence(landmark_frames)],
        dtype=torch.float32,
        device=device,
    )

    with torch.no_grad():
        probabilities = torch.softmax(model(values), dim=1)[0].tolist()

    return {token: float(probabilities[index]) for index, token in enumerate(TOKENS)}
