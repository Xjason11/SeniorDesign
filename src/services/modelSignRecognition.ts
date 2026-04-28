import { RecognizedSign } from "../types/sign";

const modelApiUrl = "http://192.168.0.21:8000";

type ModelRecognitionResponse = {
  token: RecognizedSign["token"];
  label: string;
  confidence: number;
  alternatives?: {
    token: RecognizedSign["token"];
    label: string;
    confidence: number;
  }[];
  source?: RecognizedSign["source"];
  mode?: RecognizedSign["mode"];
  hand_detected?: boolean;
  landmark_points?: {
    hand?: number;
    index?: number;
    x: number;
    y: number;
  }[];
  landmark_count?: number;
  single_frame_token?: RecognizedSign["token"];
  single_frame_confidence?: number;
  sequence_token?: RecognizedSign["token"];
  sequence_confidence?: number;
};

type BackendHealthResponse = {
  ok?: boolean;
  model?: {
    loaded?: boolean;
  };
  sequence_model?: {
    loaded?: boolean;
  };
  sample_counts?: Partial<Record<RecognizedSign["token"], number>>;
  sequence_sample_counts?: Partial<Record<RecognizedSign["token"], number>>;
};

export type BackendStatus = {
  checkedAt: Date;
  isConnected: boolean;
  modelLoaded: boolean;
  sampleCounts: Partial<Record<RecognizedSign["token"], number>>;
  sequenceModelLoaded: boolean;
  sequenceSampleCounts: Partial<Record<RecognizedSign["token"], number>>;
};

export async function checkBackendStatus(): Promise<BackendStatus> {
  let response: Response;
  try {
    response = await fetch(`${modelApiUrl}/health`);
  } catch {
    return {
      checkedAt: new Date(),
      isConnected: false,
      modelLoaded: false,
      sampleCounts: {},
      sequenceModelLoaded: false,
      sequenceSampleCounts: {}
    };
  }

  if (!response.ok) {
    return {
      checkedAt: new Date(),
      isConnected: false,
      modelLoaded: false,
      sampleCounts: {},
      sequenceModelLoaded: false,
      sequenceSampleCounts: {}
    };
  }

  const result = (await response.json()) as BackendHealthResponse;

  return {
    checkedAt: new Date(),
    isConnected: result.ok === true,
    modelLoaded: result.model?.loaded === true,
    sampleCounts: result.sample_counts ?? {},
    sequenceModelLoaded: result.sequence_model?.loaded === true,
    sequenceSampleCounts: result.sequence_sample_counts ?? {}
  };
}

export async function recognizeSignWithModel(
  base64Image: string,
  options?: { liveMode?: boolean }
): Promise<RecognizedSign | undefined> {
  const endpoint = options?.liveMode ? "recognize-live" : "recognize";
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`${modelApiUrl}/${endpoint}`, {
      body: JSON.stringify({ image_base64: base64Image }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  } catch (error) {
    throw new Error(`Could not reach ${modelApiUrl}/${endpoint}: ${getErrorMessage(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status} for ${endpoint}.`);
  }

  const result = (await response.json()) as ModelRecognitionResponse;

  if (!result.token || result.confidence < 0.4) {
    return undefined;
  }

  return {
    alternatives: result.alternatives,
    confidence: result.confidence,
    handDetected: Boolean(result.hand_detected),
    label: result.label,
    landmarkPoints: result.landmark_points,
    latencyMs: Date.now() - startedAt,
    landmarkCount: result.landmark_count ?? 0,
    mode: result.mode ?? "single",
    sequenceConfidence: result.sequence_confidence,
    sequenceToken: result.sequence_token,
    singleFrameConfidence: result.single_frame_confidence,
    singleFrameToken: result.single_frame_token,
    source: "model",
    token: result.token
  };
}


export async function recognizeSignSequenceWithModel(
  framesBase64: string[],
  options?: { liveMode?: boolean }
): Promise<RecognizedSign | undefined> {
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`${modelApiUrl}/recognize-sequence`, {
      body: JSON.stringify({ frames_base64: framesBase64, live_mode: Boolean(options?.liveMode) }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  } catch (error) {
    throw new Error(`Could not reach ${modelApiUrl}/recognize-sequence: ${getErrorMessage(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status} for recognize-sequence.`);
  }

  const result = (await response.json()) as ModelRecognitionResponse;

  if (!result.token || result.confidence < 0.4) {
    return undefined;
  }

  return {
    alternatives: result.alternatives,
    confidence: result.confidence,
    handDetected: Boolean(result.hand_detected),
    label: result.label,
    landmarkPoints: result.landmark_points,
    latencyMs: Date.now() - startedAt,
    landmarkCount: result.landmark_count ?? 0,
    mode: result.mode ?? "sequence",
    sequenceConfidence: result.sequence_confidence,
    sequenceToken: result.sequence_token,
    singleFrameConfidence: result.single_frame_confidence,
    singleFrameToken: result.single_frame_token,
    source: "model",
    token: result.token
  };
}

export async function saveModelTrainingSample(base64Image: string, token: RecognizedSign["token"]): Promise<boolean> {
  const response = await fetch(`${modelApiUrl}/samples`, {
    body: JSON.stringify({ image_base64: base64Image, token }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return response.ok;
}


export async function saveModelSequenceTrainingSample(
  framesBase64: string[],
  token: RecognizedSign["token"]
): Promise<boolean> {
  const response = await fetch(`${modelApiUrl}/sequence-samples`, {
    body: JSON.stringify({ frames_base64: framesBase64, token }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return response.ok;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}
