# ASL Conversation Assistant

A mobile-only Expo + TypeScript senior design prototype for short everyday ASL-assisted interactions.

The app uses a phone camera preview, a local FastAPI + MediaPipe + PyTorch backend recognizer, phrase assembly, quick phrase screens, conversation transcripts, and text-to-speech. It does not claim full ASL translation accuracy.

## Architecture

- `App.tsx` owns app state for camera capture, recognized signs, translated text, quick phrases, conversation history, and accessibility mode.
- `src/components` contains focused React Native UI components.
- `src/services/modelSignRecognition.ts` calls the local backend model service.
- `src/services/phraseAssembler.ts` turns recent sign tokens into short natural-language phrases.
- `src/services/localAppStorage.ts` persists phrases, settings, transcript history, and quick phrase environments.
- `backend` contains the Windows ROCm/PyTorch FastAPI service for vision inference and backend sample correction.
- `src/types` keeps shared TypeScript types in one place.
- `src/theme` holds shared colors and spacing.

## Setup

Install Node.js first if `node` or `npm` are not available in your terminal.

```bash
npm install
npx expo start
```

On Windows PowerShell, if `npm` or `npx` says running scripts is disabled, use:

```bash
npm.cmd install
npx.cmd expo start
```

To point the mobile app at your backend, create a local `.env` file in the repo root with:

```text
EXPO_PUBLIC_MODEL_API_URL=http://YOUR-PC-LAN-IP:8000
```

Use your own computer's LAN IP when testing from a phone on the same network.

## Backend

The backend runs on your Windows PC and the Expo app calls it over your local network.

```powershell
cd <repo-root>
.\.venv\Scripts\activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Verify the API:

```powershell
Invoke-RestMethod http://localhost:8000/health | ConvertTo-Json -Depth 5
```

When running on a phone, set `EXPO_PUBLIC_MODEL_API_URL` to your PC's LAN IP. For example:

```text
http://192.168.1.25:8000
```

## App Use

1. Start the backend.
2. Open the app in Expo Go.
3. Allow camera permission.
4. Tap `Capture` or enable `Live` recognition.
5. Use recognition feedback to confirm a prediction or correct it into backend training data.
6. Use `Quick phrases` for environment-specific spoken phrases.
7. Use `Conversation` to review, clear, or share the transcript.
8. Use `Speak`, `Save`, and `Clear` for the current translated phrase.

## Training Flow

The old in-app mock recognizer and local snapshot trainer have been removed. Corrections now go through the backend feedback path:

- Capture or live recognition produces a backend model prediction.
- Low-confidence predictions require confirmation before being appended.
- If the prediction is wrong, choose the correct token in `Recognition feedback`.
- The app sends the captured frame sequence and single frame to the backend sample endpoints.
- Retrain the backend model after collecting corrections.

```powershell
python -m backend.train
python -m backend.train_sequence
```

Restart the backend after training so `/recognize` and `/recognize-sequence` load the updated classifiers.

## GitHub Sharing

Keep generated and machine-local folders out of the repo:

- `node_modules/`
- `.expo/`
- `.venv/`
- `backend/data/`
- `backend/models/`
- `backend/reports/`
