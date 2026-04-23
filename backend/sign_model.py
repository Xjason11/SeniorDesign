from __future__ import annotations

import os
from pathlib import Path

MIOPEN_CACHE_DIR = Path(__file__).resolve().parent / "models" / "miopen-cache"
MIOPEN_CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MIOPEN_CUSTOM_CACHE_DIR", str(MIOPEN_CACHE_DIR))
os.environ.setdefault("MIOPEN_USER_DB_PATH", str(MIOPEN_CACHE_DIR))

import torch
from torch import nn


TOKENS = ["HELLO", "THANK_YOU", "HELP", "WATER", "YES", "NO"]
TOKEN_LABELS = {
    "HELLO": "HELLO",
    "THANK_YOU": "THANK YOU",
    "HELP": "HELP",
    "WATER": "WATER",
    "YES": "YES",
    "NO": "NO",
}
LANDMARK_VECTOR_SIZE = 126
MODEL_PATH = Path(__file__).resolve().parent / "models" / "sign_classifier.pt"
SEQUENCE_MODEL_PATH = Path(__file__).resolve().parent / "models" / "sign_sequence_classifier.pt"
SEQUENCE_LENGTH = 8


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


def normalize_landmark_sequence(
    landmark_frames: list[list[float]],
    sequence_length: int = SEQUENCE_LENGTH,
) -> list[list[float]]:
    frames = [normalize_landmark_vector(frame) for frame in landmark_frames if frame]
    if len(frames) > sequence_length:
        frames = frames[-sequence_length:]

    padding = [[0.0] * LANDMARK_VECTOR_SIZE for _ in range(max(0, sequence_length - len(frames)))]
    return [*padding, *frames]


def get_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_classifier() -> SignClassifier | None:
    if not MODEL_PATH.exists():
        return None

    device = get_device()
    model = SignClassifier().to(device)
    payload = torch.load(MODEL_PATH, map_location=device)
    model.load_state_dict(payload["model_state"])
    model.eval()
    return model


def load_sequence_classifier() -> SignSequenceClassifier | None:
    if not SEQUENCE_MODEL_PATH.exists():
        return None

    device = get_device()
    model = SignSequenceClassifier().to(device)
    payload = torch.load(SEQUENCE_MODEL_PATH, map_location=device)
    model.load_state_dict(payload["model_state"])
    model.eval()
    return model


def predict_sign(model: SignClassifier, landmarks: list[float]) -> tuple[str, float]:
    probabilities = predict_sign_probabilities(model, landmarks)
    token = max(probabilities, key=probabilities.get)
    return token, probabilities[token]


def predict_sign_probabilities(model: SignClassifier, landmarks: list[float]) -> dict[str, float]:
    device = get_device()
    values = torch.tensor([normalize_landmark_vector(landmarks)], dtype=torch.float32, device=device)

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
        [normalize_landmark_sequence(landmark_frames)],
        dtype=torch.float32,
        device=device,
    )

    with torch.no_grad():
        probabilities = torch.softmax(model(values), dim=1)[0].tolist()

    return {token: float(probabilities[index]) for index, token in enumerate(TOKENS)}
