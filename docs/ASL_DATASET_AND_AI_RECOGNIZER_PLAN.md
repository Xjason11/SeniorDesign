# ASL Dataset and AI Recognizer Plan

## Reality Check

The current backend is already machine learning: MediaPipe extracts landmarks, then PyTorch models classify the sign. It is not a general ASL translator. It is a constrained isolated-sign and short-sequence recognizer.

For this project, the realistic Phase 2 goal is:

```text
camera frames -> landmarks -> sequence model -> intent tokens -> editable English message
```

The unrealistic goal for this demo timeline is:

```text
open-ended ASL video -> full ASL grammar understanding -> natural English translation
```

## Dataset Options

### ASL Citizen

- Source: Microsoft Research
- Scale: about 83k videos, 2.7k ASL signs, 52 Deaf or hard-of-hearing signers.
- Best use: isolated sign recognition and dictionary retrieval.
- Why it fits this app: consented data, real-world webcam settings, signer-independent splits, broad vocabulary.
- Caution: Microsoft explicitly frames it as isolated sign recognition, not continuous ASL sentence translation.

### WLASL

- Source: Word-Level American Sign Language dataset.
- Scale: about 21k videos across 2k ASL glosses.
- Best use: isolated word/sign recognition benchmarks.
- Why it fits this app: useful for checking whether target vocabulary signs exist in public ASL video data.
- Caution: scraped data and licensing constraints; not ideal as the ethical centerpiece of a product demo.

### MS-ASL

- Scale: roughly 25k videos and 1k signs in the original dataset.
- Best use: isolated sign recognition experiments.
- Current app status: backend already has MS-ASL preparation scripts.
- Caution: availability is fragile because many original videos were YouTube-hosted.

### Lifeprint / ASL University

- Source: Dr. Bill Vicars / ASL University curriculum reference.
- Best use: choosing practical ASL glosses, checking beginner-friendly phrase structure, and adding English label aliases for dataset imports.
- Current app status: used as a reference layer in `backend/asl_vocabulary_reference.py`.
- Caution: do not scrape lesson videos into the training set. Treat Lifeprint as curriculum guidance, not raw model-training media.

### How2Sign

- Source: CVPR 2021 continuous ASL dataset.
- Scale: more than 80 hours of continuous ASL videos with English transcripts and gloss annotations.
- Best use: research toward continuous sign language recognition/translation.
- Why it matters: this is closer to real translation than isolated sign datasets.
- Caution: far larger, heavier, and more complex than needed for a senior-design demo.

## Recommended Demo Vocabulary

Do not jump to 100 signs immediately. Start with high-frequency, demo-useful intents that can be tested in the app.

### Active Starter Tokens

- `HELLO`
- `THANK_YOU`
- `HELP`
- `WATER`
- `YES`
- `NO`

### Phase 2 Target Tokens

- `FOOD`
- `BATHROOM`
- `DOCTOR`
- `PAIN`
- `STOP`
- `WAIT`
- `REPEAT`
- `WRITE`
- `CALL`
- `WHERE`
- `NOW`
- `PLEASE`

## AI Recognizer Upgrade Path

### Step 1: Keep the Current Classifier Working

The six-token model should remain stable for demos.

### Step 2: Build a Dataset Import Layer

Add import scripts that can map external dataset labels into this app's target tokens.

Example mapping:

```text
TOILET, RESTROOM, BATHROOM -> BATHROOM
PHYSICIAN, DOCTOR -> DOCTOR
HURT, PAIN -> PAIN
PHONE, CALL -> CALL
```

Lifeprint is useful here because it helps pick the ASL glosses and everyday English aliases worth checking across datasets. The actual training samples should still come from dataset video files or user-captured corrections.

### Step 3: Train a Sequence Intent Model

Move from the current flattened MLP sequence model to a temporal model:

- input: 8-16 frames of landmark vectors
- model: GRU/LSTM or small Transformer encoder
- output: target intent token

This is still a classifier, but it is a stronger AI recognizer because it models motion over time rather than one flattened feature vector.

### Step 4: Add Intent + Slot Composition

Use predicted tokens to form messages:

```text
HELP + WATER -> I need help getting water.
WHERE + BATHROOM -> Where is the bathroom?
PAIN + DOCTOR -> I need a doctor because I am in pain.
PLEASE + WRITE -> Please write that down.
```

### Step 5: Optional Continuous Translation Research Track

Only if time allows, evaluate How2Sign-style gloss-to-English translation. This is research-heavy and should not replace the working demo path.

## Implementation Recommendation

For this app, "AI recognizer" should mean:

```text
MediaPipe landmarks + temporal PyTorch model + constrained intent vocabulary
```

That gives a credible AI upgrade while keeping the app reliable enough to demo.
