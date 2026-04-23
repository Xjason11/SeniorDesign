# ASL Model Backend

FastAPI backend for the first real vision pipeline.

## Run

```powershell
cd <repo-root>
.\.venv\Scripts\activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

If you are setting this backend up from scratch:

```powershell
cd <repo-root>
py -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Open:

```text
http://localhost:8000/health
```

The app must call your PC's LAN IP, not `localhost`, when running on a phone.

## Collect Samples

1. Start this backend.
2. Start the Expo app.
3. Pick a token in `Train snapshot recognizer`.
4. Hold the sign clearly in frame and tap `Add`.
5. Capture several examples per token.

The backend stores landmark vectors in:

```text
backend/data/landmark_samples.jsonl
```

Good first target:

```text
20-30 samples each for HELLO, THANK_YOU, HELP, WATER, YES, and NO
```

## Prepare MS-ASL

If the MS-ASL metadata is in Downloads, seed this backend dataset with:

```powershell
python -m backend.prepare_msasl --max-per-token 20 --frames-per-clip 3
```

This downloads the referenced videos, samples frames from each annotated clip, extracts landmarks, and appends rows to `backend/data/landmark_samples.jsonl`.

`thanks` in MS-ASL is mapped to this app's `THANK_YOU` token.

## Visualize Examples

```powershell
python -m backend.visualize_msasl
```

This writes per-token contact sheets to:

```text
backend/reports/msasl_examples
```

## Train

```powershell
cd <repo-root>
.\.venv\Scripts\activate
python -m backend.train
```

The trained model is saved to:

```text
backend/models/sign_classifier.pt
```

Restart the backend after training. `/recognize` will load the model automatically.
