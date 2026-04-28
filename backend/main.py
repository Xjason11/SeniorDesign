from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .sequence_samples import append_sequence_sample, get_sequence_sample_counts
from .samples import append_sample, get_sample_counts
from .sign_model import (
    MODEL_PATH,
    SEQUENCE_MODEL_PATH,
    TOKENS,
    TOKEN_LABELS,
    load_classifier,
    load_sequence_classifier,
    predict_sign,
    predict_sign_probabilities,
    predict_sign_sequence,
    predict_sign_sequence_probabilities,
)
from .vision import extract_hand_landmark_sequence, extract_hand_landmarks, extract_hand_landmarks_fast

try:
    import torch
except ImportError:  # pragma: no cover - helps the API explain setup issues.
    torch = None


app = FastAPI(title="ASL Conversation Assistant Model API")
SEQUENCE_MIN_TRACKED_FRAMES = 2
SINGLE_FRAME_WEIGHT = 0.5
SEQUENCE_WEIGHT = 0.5


class RecognitionRequest(BaseModel):
    image_base64: str


class TrainingSampleRequest(BaseModel):
    image_base64: str
    token: str


class SequenceRecognitionRequest(BaseModel):
    frames_base64: list[str]
    live_mode: bool = False


class SequenceTrainingSampleRequest(BaseModel):
    frames_base64: list[str]
    token: str


class PredictionAlternative(BaseModel):
    token: str
    label: str
    confidence: float


class LandmarkPoint(BaseModel):
    hand: int
    index: int
    x: float
    y: float


class RecognitionResponse(BaseModel):
    token: str
    label: str
    confidence: float
    source: str = "model"
    mode: str = "single"
    hand_detected: bool
    landmark_count: int
    single_frame_token: str | None = None
    single_frame_confidence: float | None = None
    sequence_token: str | None = None
    sequence_confidence: float | None = None
    alternatives: list[PredictionAlternative] = []
    landmark_points: list[LandmarkPoint] = []


class TrainingSampleResponse(BaseModel):
    ok: bool
    token: str
    hand_detected: bool
    landmark_count: int
    sample_counts: dict[str, int]


classifier = load_classifier()
classifier_mtime = MODEL_PATH.stat().st_mtime if MODEL_PATH.exists() else None
sequence_classifier = load_sequence_classifier()
sequence_classifier_mtime = SEQUENCE_MODEL_PATH.stat().st_mtime if SEQUENCE_MODEL_PATH.exists() else None


def get_classifier():
    global classifier, classifier_mtime

    if not MODEL_PATH.exists():
        classifier = None
        classifier_mtime = None
        return None

    model_mtime = MODEL_PATH.stat().st_mtime
    if classifier is None or classifier_mtime != model_mtime:
        classifier = load_classifier()
        classifier_mtime = model_mtime

    return classifier


def get_sequence_classifier():
    global sequence_classifier, sequence_classifier_mtime

    if not SEQUENCE_MODEL_PATH.exists():
        sequence_classifier = None
        sequence_classifier_mtime = None
        return None

    model_mtime = SEQUENCE_MODEL_PATH.stat().st_mtime
    if sequence_classifier is None or sequence_classifier_mtime != model_mtime:
        sequence_classifier = load_sequence_classifier()
        sequence_classifier_mtime = model_mtime

    return sequence_classifier


@app.get("/health")
def health():
    gpu = {
        "torch_available": torch is not None,
        "cuda_available": False,
        "device": None,
        "hip": None,
    }

    if torch is not None:
        gpu["cuda_available"] = torch.cuda.is_available()
        gpu["hip"] = getattr(torch.version, "hip", None)
        if torch.cuda.is_available():
            gpu["device"] = torch.cuda.get_device_name(0)

    return {
        "ok": True,
        "gpu": gpu,
        "model": {
            "loaded": get_classifier() is not None,
            "path": str(MODEL_PATH),
        },
        "sequence_model": {
            "loaded": get_sequence_classifier() is not None,
            "path": str(SEQUENCE_MODEL_PATH),
        },
        "sample_counts": get_sample_counts(),
        "sequence_sample_counts": get_sequence_sample_counts(),
    }


@app.post("/recognize", response_model=RecognitionResponse)
def recognize(request: RecognitionRequest):
    return _recognize_from_landmarks(extract_hand_landmarks(request.image_base64))


@app.post("/recognize-live", response_model=RecognitionResponse)
def recognize_live(request: RecognitionRequest):
    try:
        landmarks = extract_hand_landmarks_fast(request.image_base64)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return _recognize_from_landmarks(landmarks)


@app.post("/recognize-sequence", response_model=RecognitionResponse)
def recognize_sequence(request: SequenceRecognitionRequest):
    if not request.frames_base64:
        raise HTTPException(status_code=400, detail="No frames were provided.")

    try:
        landmark_frames = extract_hand_landmark_sequence(request.frames_base64, live_mode=request.live_mode)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return _recognize_from_sequence(landmark_frames)


def _recognize_from_landmarks(landmarks: list[float]):
    hand_detected = len(landmarks) > 0
    model = get_classifier()

    if hand_detected and model is not None:
        scores = predict_sign_probabilities(model, landmarks)
        token, confidence = _top_prediction(scores)
        label = TOKEN_LABELS[token]
        alternatives = _rank_alternatives(scores)
    else:
        token = "HELP"
        label = TOKEN_LABELS[token]
        confidence = 0.58 if hand_detected else 0.35
        alternatives = []

    return RecognitionResponse(
        token=token,
        label=label,
        confidence=confidence,
        hand_detected=hand_detected,
        landmark_count=len(landmarks),
        mode="single",
        single_frame_token=token if hand_detected else None,
        single_frame_confidence=confidence if hand_detected else None,
        alternatives=alternatives,
        landmark_points=_landmark_points(landmarks),
    )


def _recognize_from_sequence(landmark_frames: list[list[float]]):
    detected_frames = [frame for frame in landmark_frames if frame]
    hand_detected = len(detected_frames) > 0
    sequence_model = get_sequence_classifier()
    single_frame_model = get_classifier()

    if hand_detected:
        fallback_landmarks = detected_frames[-1]
        single_frame_scores = (
            predict_sign_probabilities(single_frame_model, fallback_landmarks) if single_frame_model is not None else None
        )
        sequence_scores = (
            predict_sign_sequence_probabilities(sequence_model, landmark_frames) if sequence_model is not None else None
        )

        if single_frame_scores is not None or sequence_scores is not None:
            tracked_frame_ratio = min(1.0, len(detected_frames) / max(1, len(landmark_frames)))
            sequence_reliability = 1.0 if len(detected_frames) >= SEQUENCE_MIN_TRACKED_FRAMES else tracked_frame_ratio * 0.5
            fused_scores: dict[str, float] = {}

            for token in TOKENS:
                single_score = single_frame_scores.get(token, 0.0) if single_frame_scores is not None else 0.0
                sequence_score = sequence_scores.get(token, 0.0) if sequence_scores is not None else 0.0
                fused_scores[token] = (
                    (single_score * SINGLE_FRAME_WEIGHT)
                    + (sequence_score * SEQUENCE_WEIGHT * sequence_reliability)
                )

            token = max(fused_scores, key=fused_scores.get)
            confidence = fused_scores[token]
            single_frame_token = max(single_frame_scores, key=single_frame_scores.get) if single_frame_scores else None
            sequence_token = max(sequence_scores, key=sequence_scores.get) if sequence_scores else None
            return RecognitionResponse(
                token=token,
                label=TOKEN_LABELS[token],
                confidence=confidence,
                hand_detected=True,
                landmark_count=len(detected_frames),
                mode="ensemble",
                single_frame_token=single_frame_token,
                single_frame_confidence=single_frame_scores[single_frame_token] if single_frame_token else None,
                sequence_token=sequence_token,
                sequence_confidence=sequence_scores[sequence_token] if sequence_token else None,
                alternatives=_rank_alternatives(fused_scores),
                landmark_points=_landmark_points(fallback_landmarks),
            )

        return _recognize_from_landmarks(fallback_landmarks)

    return RecognitionResponse(
        token="HELP",
        label=TOKEN_LABELS["HELP"],
        confidence=0.35,
        hand_detected=False,
        landmark_count=0,
        mode="sequence",
    )


def _top_prediction(scores: dict[str, float]) -> tuple[str, float]:
    token = max(scores, key=scores.get)
    return token, scores[token]


def _rank_alternatives(scores: dict[str, float], limit: int = 3) -> list[PredictionAlternative]:
    ranked_tokens = sorted(scores, key=scores.get, reverse=True)[:limit]
    return [
        PredictionAlternative(
            token=token,
            label=TOKEN_LABELS[token],
            confidence=scores[token],
        )
        for token in ranked_tokens
    ]


def _landmark_points(landmarks: list[float]) -> list[LandmarkPoint]:
    points: list[LandmarkPoint] = []
    for landmark_index, index in enumerate(range(0, len(landmarks), 3)):
        if index + 1 >= len(landmarks):
            continue

        points.append(
            LandmarkPoint(
                hand=landmark_index // 21,
                index=landmark_index % 21,
                x=landmarks[index],
                y=landmarks[index + 1],
            )
        )

    return points


@app.post("/samples", response_model=TrainingSampleResponse)
def save_training_sample(request: TrainingSampleRequest):
    try:
        landmarks = extract_hand_landmarks(request.image_base64)
        if not landmarks:
            raise ValueError("No hand landmarks detected.")
        append_sample(request.token, landmarks)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return TrainingSampleResponse(
        ok=True,
        token=request.token,
        hand_detected=True,
        landmark_count=len(landmarks),
        sample_counts=get_sample_counts(),
    )


@app.post("/sequence-samples", response_model=TrainingSampleResponse)
def save_sequence_training_sample(request: SequenceTrainingSampleRequest):
    if not request.frames_base64:
        raise HTTPException(status_code=400, detail="No frames were provided.")

    try:
        landmark_frames = extract_hand_landmark_sequence(request.frames_base64, live_mode=True)
        if not any(landmark_frames):
            raise ValueError("No hand landmarks detected.")
        append_sequence_sample(request.token, landmark_frames)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    detected_frames = len([frame for frame in landmark_frames if frame])
    return TrainingSampleResponse(
        ok=True,
        token=request.token,
        hand_detected=detected_frames > 0,
        landmark_count=detected_frames,
        sample_counts=get_sequence_sample_counts(),
    )
