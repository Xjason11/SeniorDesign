import { NativeModules } from "react-native";
import { RecognizedSign } from "../types/sign";

const defaultModelApiUrl = process.env.EXPO_PUBLIC_MODEL_API_URL ?? "http://192.168.0.21:8000";
const backendPort = "8000";
const backendProbeTimeoutMs = 1200;
let activeModelApiUrl = defaultModelApiUrl;

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
  backendUrl?: string;
  checkedAt: Date;
  isConnected: boolean;
  modelLoaded: boolean;
  sampleCounts: Partial<Record<RecognizedSign["token"], number>>;
  sequenceModelLoaded: boolean;
  sequenceSampleCounts: Partial<Record<RecognizedSign["token"], number>>;
};

export async function checkBackendStatus(): Promise<BackendStatus> {
  const backendUrl = await resolveModelApiUrl();
  let response: Response;
  try {
    response = await fetchWithTimeout(`${backendUrl}/health`, undefined, backendProbeTimeoutMs);
  } catch {
    return {
      backendUrl,
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
      backendUrl,
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
    backendUrl,
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
  options?: { allowedTokens?: readonly RecognizedSign["token"][]; liveMode?: boolean }
): Promise<RecognizedSign | undefined> {
  const endpoint = options?.liveMode ? "recognize-live" : "recognize";
  const startedAt = Date.now();
  const backendUrl = await resolveModelApiUrl();
  let response: Response;
  try {
    response = await fetch(`${backendUrl}/${endpoint}`, {
      body: JSON.stringify({
        allowed_tokens: options?.allowedTokens,
        image_base64: base64Image
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  } catch (error) {
    activeModelApiUrl = defaultModelApiUrl;
    throw new Error(`Could not reach ${backendUrl}/${endpoint}: ${getErrorMessage(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status} for ${endpoint}.`);
  }

  const result = (await response.json()) as ModelRecognitionResponse;

  if (options?.liveMode && result.hand_detected !== true) {
    return undefined;
  }

  const minimumConfidence = options?.allowedTokens ? 0.12 : 0.4;
  if (!result.token || result.confidence < minimumConfidence) {
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
  options?: { allowedTokens?: readonly RecognizedSign["token"][]; liveMode?: boolean }
): Promise<RecognizedSign | undefined> {
  const startedAt = Date.now();
  const backendUrl = await resolveModelApiUrl();
  let response: Response;
  try {
    response = await fetch(`${backendUrl}/recognize-sequence`, {
      body: JSON.stringify({
        allowed_tokens: options?.allowedTokens,
        frames_base64: framesBase64,
        live_mode: Boolean(options?.liveMode)
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  } catch (error) {
    activeModelApiUrl = defaultModelApiUrl;
    throw new Error(`Could not reach ${backendUrl}/recognize-sequence: ${getErrorMessage(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status} for recognize-sequence.`);
  }

  const result = (await response.json()) as ModelRecognitionResponse;

  if (options?.liveMode && result.hand_detected !== true) {
    return undefined;
  }

  const minimumConfidence = options?.allowedTokens ? 0.12 : 0.4;
  if (!result.token || result.confidence < minimumConfidence) {
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
  const backendUrl = await resolveModelApiUrl();
  const response = await fetch(`${backendUrl}/samples`, {
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
  const backendUrl = await resolveModelApiUrl();
  const response = await fetch(`${backendUrl}/sequence-samples`, {
    body: JSON.stringify({ frames_base64: framesBase64, token }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return response.ok;
}

async function resolveModelApiUrl() {
  const candidates = getModelApiUrlCandidates();
  const currentUrl = activeModelApiUrl;

  if (await canReachBackend(currentUrl)) {
    return currentUrl;
  }

  for (const candidate of candidates) {
    if (candidate === currentUrl) {
      continue;
    }

    if (await canReachBackend(candidate)) {
      activeModelApiUrl = candidate;
      return candidate;
    }
  }

  return currentUrl;
}

async function canReachBackend(url: string) {
  try {
    const response = await fetchWithTimeout(`${url}/health`, undefined, backendProbeTimeoutMs);
    return response.ok;
  } catch {
    return false;
  }
}

function getModelApiUrlCandidates() {
  const candidates = new Set<string>([activeModelApiUrl, defaultModelApiUrl]);
  const metroHost = getMetroHost();
  const configuredHost = getHostFromUrl(defaultModelApiUrl);

  if (metroHost) {
    candidates.add(`http://${metroHost}:${backendPort}`);
  }

  if (configuredHost) {
    getCommonLanHosts(configuredHost).forEach((host) => candidates.add(`http://${host}:${backendPort}`));
  }

  return Array.from(candidates);
}

function getCommonLanHosts(host: string) {
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(Number(part)))) {
    return [];
  }

  const prefix = parts.slice(0, 3).join(".");
  const likelyHostSuffixes = ["21", "1", "2", "10", "20", "50", "100", "101", "150", "200"];

  return likelyHostSuffixes.map((suffix) => `${prefix}.${suffix}`);
}

function getMetroHost() {
  const scriptUrl = NativeModules.SourceCode?.scriptURL;
  if (typeof scriptUrl !== "string") {
    return undefined;
  }

  return getHostFromUrl(scriptUrl);
}

function getHostFromUrl(url: string) {
  const match = /^https?:\/\/([^:/]+)(?::\d+)?/.exec(url);
  return match?.[1];
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}
