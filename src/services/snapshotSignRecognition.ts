import { getFeatureDistance, ImageFeatureVector } from "./imageFeatures";
import { recognizeMockSign } from "./mockSignRecognition";
import { RecognizedSign, TrainingSample } from "../types/sign";

export type SnapshotRecognitionInput = {
  features: ImageFeatureVector;
  trainingSamples: TrainingSample[];
};

const minimumSamplesPerToken = 2;
const maximumReasonableDistance = 0.72;

// Version B adapter: this uses real snapshot pixels and compares them to labeled examples.
// It is a bridge to a trained sign recognition model, not a full ASL translator.
export async function recognizeSignFromSnapshot({
  features,
  trainingSamples
}: SnapshotRecognitionInput): Promise<RecognizedSign | undefined> {
  if (trainingSamples.length === 0 || !hasEnoughSamples(trainingSamples)) {
    return undefined;
  }

  await waitForModelTiming();

  const nearestSample = trainingSamples
    .map((sample) => ({
      sample,
      distance: getFeatureDistance(features, sample.features)
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  if (!nearestSample || nearestSample.distance > maximumReasonableDistance) {
    return undefined;
  }

  const token = nearestSample.sample.token;
  const confidence = Math.max(0.45, Math.min(0.96, 1 - nearestSample.distance));

  return {
    ...recognizeMockSign(token),
    confidence,
    source: "snapshot"
  };
}

function hasEnoughSamples(trainingSamples: TrainingSample[]) {
  const counts = trainingSamples.reduce<Partial<Record<string, number>>>((totals, sample) => {
    totals[sample.token] = (totals[sample.token] ?? 0) + 1;
    return totals;
  }, {});

  return Object.values(counts).some((count) => (count ?? 0) >= minimumSamplesPerToken);
}

function waitForModelTiming() {
  return new Promise((resolve) => {
    setTimeout(resolve, 450);
  });
}
