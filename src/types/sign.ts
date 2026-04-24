export type SignToken = "HELLO" | "THANK_YOU" | "HELP" | "WATER" | "YES" | "NO";

export type RecognizedSign = {
  token: SignToken;
  label: string;
  confidence: number;
  source?: "manual" | "demo" | "snapshot" | "model";
  mode?: "single" | "sequence" | "ensemble";
  handDetected?: boolean;
  landmarkCount?: number;
  latencyMs?: number;
  singleFrameToken?: SignToken;
  singleFrameConfidence?: number;
  sequenceToken?: SignToken;
  sequenceConfidence?: number;
};

export type SavedPhrase = {
  id: string;
  text: string;
  createdAt: Date;
};

export type ConversationMessage = {
  id: string;
  speaker: "signer" | "partner";
  text: string;
  createdAt: Date;
  confidence?: number;
  source?: RecognizedSign["source"];
};

export type TrainingSample = {
  id: string;
  token: SignToken;
  features: number[];
};
