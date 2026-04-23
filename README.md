# ASL Conversation Assistant

A mobile-only Expo + TypeScript senior design prototype for short everyday ASL-assisted interactions.

This app is intentionally scoped as a demo-friendly communication assistant. It uses a phone camera preview, a mock sign recognition pipeline, simple phrase assembly, and text-to-speech. It does not claim full ASL translation accuracy.

## Proposed Architecture

- `App.tsx` owns simple local state for detected signs, translated text, demo mode, and saved phrases.
- `src/components` contains small presentational React Native components.
- `src/services/mockSignRecognition.ts` simulates the sign recognition layer for conference demos.
- `src/services/snapshotSignRecognition.ts` is the Version B adapter for camera snapshot recognition.
- `src/services/modelSignRecognition.ts` calls the local ROCm-backed FastAPI model service when it is running.
- `src/services/imageFeatures.ts` extracts a tiny image signature from captured snapshots.
- `backend` contains the Windows ROCm/PyTorch FastAPI service for the first real vision pipeline.
- `src/services/phraseAssembler.ts` turns sign tokens into short natural-language phrases.
- `src/types` keeps shared TypeScript types in one place.
- `src/theme` holds shared colors and spacing.

## Folder Tree

```text
.
|-- App.tsx
|-- README.md
|-- app.json
|-- babel.config.js
|-- backend
|   |-- README.md
|   |-- __init__.py
|   |-- main.py
|   |-- sign_model.py
|   |-- train.py
|   |-- train_sequence.py
|   `-- vision.py
|-- package.json
|-- tsconfig.json
`-- src
    |-- components
    |   |-- AppHeader.tsx
    |   |-- CameraPanel.tsx
    |   |-- CaptureRecognitionCard.tsx
    |   |-- ControlBar.tsx
    |   |-- DemoControls.tsx
    |   |-- LiveDebugStrip.tsx
    |   |-- PredictionFeedbackCard.tsx
    |   |-- SavedPhrases.tsx
    |   |-- TrainingControls.tsx
    |   `-- TranslationCard.tsx
    |-- services
    |   |-- imageFeatures.ts
    |   |-- modelSignRecognition.ts
    |   |-- mockSignRecognition.ts
    |   |-- phraseAssembler.ts
    |   `-- snapshotSignRecognition.ts
    |-- theme
    |   |-- colors.ts
    |   `-- spacing.ts
    `-- types
        `-- sign.ts
```

## Setup Commands

Install Node.js first if `node` or `npm` are not available in your terminal.

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go on your phone.

On Windows PowerShell, if `npm` or `npx` says running scripts is disabled, use:

```bash
npm.cmd install
npx.cmd expo start
```

If Expo says port `8081` is already in use, run:

```bash
npx.cmd expo start --port 8082
```

If Expo asks to align dependency versions, run:

```bash
npx.cmd expo install expo-camera expo-speech
```

To point the mobile app at your backend, create a local `.env` file in the repo root with:

```text
EXPO_PUBLIC_MODEL_API_URL=http://YOUR-PC-LAN-IP:8000
```

Use your own computer's LAN IP when testing from a phone on the same network.

## ROCm Backend

The backend runs on your Windows PC and the Expo app calls it over your local network.

```powershell
cd <repo-root>
.\.venv\Scripts\activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

If you are setting the backend up from scratch on another machine:

```powershell
cd <repo-root>
py -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

`torch` may need a machine-specific install depending on whether the target machine is CPU-only, NVIDIA CUDA, or AMD/ROCm. Use the install command from the official PyTorch selector for that machine if the default `pip install -r backend\requirements.txt` is not sufficient.

Verify ROCm/PyTorch:

```powershell
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

Verify the API:

```powershell
Invoke-RestMethod http://localhost:8000/health | ConvertTo-Json -Depth 5
```

When running on a phone, set `EXPO_PUBLIC_MODEL_API_URL` to your PC's LAN IP. For example:

```text
http://192.168.1.25:8000
```

To collect a real landmark dataset, start the backend, open the app, choose a token in `Train snapshot recognizer`, and tap `Add` while holding that sign clearly in frame. Each successful backend capture is saved to:

```text
backend/data/landmark_samples.jsonl
```

Collect roughly `20-30` samples per starter token, then train:

```powershell
python -m backend.train
```

The model is saved to:

```text
backend/models/sign_classifier.pt
```

Restart the backend after training so `/recognize` uses the saved classifier.

You can also seed the backend dataset from an extracted `MS-ASL` folder:

```powershell
python -m backend.prepare_msasl --max-per-token 20 --frames-per-clip 3
python -m backend.train
```

MS-ASL stores `THANK_YOU` as the gloss `thanks`, and the importer maps that into this app's `THANK_YOU` token.

To export visual examples of what the MS-ASL-backed model was trained from:

```powershell
python -m backend.visualize_msasl
```

The contact sheets are written to:

```text
backend/reports/msasl_examples
```

## How to Use the Demo

1. Open the app in Expo Go.
2. Allow camera permission.
3. Use the camera flip button when you want to switch between the front and back camera.
4. In `Train snapshot recognizer`, pick a token such as `WATER`.
5. Hold the sign steady in the camera and tap `Add` at least 2 times for that token.
6. Use `Undo Last` or `Delete WATER` if you captured a mistaken training example.
7. Add examples for more signs using the same framing and lighting.
8. Tap `Capture` to call the ROCm backend first. If the backend is unavailable, the app falls back to the in-session snapshot matcher.
9. Use `Model feedback` to confirm a prediction with `Yes`, or choose the correct token if the model was wrong.
10. Retrain with `python -m backend.train` after collecting corrections.
11. Tap sign token buttons like `HELLO`, `HELP`, or `WATER` when you want a reliable manual demo fallback.
12. Use `Demo` to automatically cycle through a reliable conference sequence.
13. Tap `Speak` to read the translated text aloud.
14. Tap `Save` to keep recent phrases in local app state.
15. Tap `Clear` to reset the current interaction.

## Data Flow

1. The camera preview displays the live phone camera.
2. Training captures are converted into simple image feature vectors and stored in local app state.
3. A new capture is sent to the local FastAPI backend if it is running.
4. The backend uses MediaPipe to extract hand landmarks and has ROCm/PyTorch available for model inference.
5. Until `backend/models/sign_classifier.pt` exists, the backend returns a placeholder `HELP` response so the app-to-model loop can be tested.
6. If the backend is unavailable, the snapshot adapter compares the capture to labeled examples and emits a `SignToken`, such as `HELP`.
7. `App.tsx` stores the token in local state.
8. `phraseAssembler.ts` maps recent tokens into a natural phrase.
9. The translated text appears on screen.
10. `expo-speech` speaks the translated text when the user taps `Speak`.
11. The `Save` button stores recent phrases in memory for the current app session.

## What Is Real vs Mocked

Real in this version:

- Expo React Native mobile app
- TypeScript structure
- Camera permission request
- Live camera preview
- Front/back camera toggle
- Text output
- Text-to-speech
- Clear and save controls
- Real camera snapshot capture for the Version B recognition path
- Simple image-based nearest-example recognition after in-session training captures
- Training sample delete controls for mistakes
- Local FastAPI backend health endpoint
- Windows ROCm/PyTorch backend environment
- MediaPipe hand-landmark extraction on backend snapshots
- App-to-backend snapshot request path
- Demo-friendly mobile UI

Mocked in this version:

- Production-grade sign recognition model
- Persistent training dataset
- Live video frame classification
- Trained six-token landmark classifier
- Phrase interpretation from visual input

## Next Steps

1. Collect a tiny controlled dataset for the starter signs: `HELLO`, `THANK YOU`, `HELP`, `WATER`, `YES`, and `NO`.
2. Replace the image-signature classifier in `snapshotSignRecognition.ts` with hand landmarks or a trained image model.
3. Start with still-frame or short-window classification instead of full ASL grammar.
4. Add persistent sample storage only after the recognition flow is useful.
5. Run a small hallway usability test and tune the phrase set for the most common public-facing interactions.

## GitHub Sharing

Before pushing this project to GitHub, keep the generated and machine-local folders out of the repo:

- `node_modules/`
- `.expo/`
- `.venv/`
- `backend/data/`
- `backend/models/`
- `backend/reports/`

After Git is installed, these are the shortest commands to publish from this folder:

```powershell
cd <repo-root>
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/SeniorDesign.git
git push -u origin main
```

If you create the GitHub repository through the website first, leave it empty when prompted so these commands work cleanly.
