export type SignToken =
  | "HELLO"
  | "THANK_YOU"
  | "HELP"
  | "WATER"
  | "YES"
  | "NO"
  | "BATHROOM"
  | "DOCTOR"
  | "PAIN"
  | "STOP"
  | "WAIT"
  | "WRITE"
  | "CALL"
  | "WHERE"
  | "NOW"
  | "PLEASE"
  | "FOOD"
  | "EAT"
  | "MORE"
  | "AGAIN"
  | "SORRY"
  | "GOOD"
  | "BAD"
  | "NAME"
  | "WHAT"
  | "WHO"
  | "WHY"
  | "HOW"
  | "WHEN"
  | "HOME"
  | "SCHOOL"
  | "WORK"
  | "FAMILY"
  | "MOTHER"
  | "FATHER"
  | "FRIEND"
  | "TEACHER"
  | "STUDENT"
  | "LEARN"
  | "UNDERSTAND"
  | "SICK"
  | "MEDICINE"
  | "HOSPITAL"
  | "GO"
  | "COME"
  | "WANT"
  | "NEED"
  | "LIKE"
  | "HAPPY"
  | "SAD";

export type PredictionAlternative = {
  token: SignToken;
  label: string;
  confidence: number;
};

export type LandmarkPoint = {
  hand?: number;
  index?: number;
  x: number;
  y: number;
};

export type RecognizedSign = {
  token: SignToken;
  label: string;
  confidence: number;
  alternatives?: PredictionAlternative[];
  source?: "manual" | "model";
  mode?: "single" | "sequence" | "ensemble";
  handDetected?: boolean;
  landmarkPoints?: LandmarkPoint[];
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

export type QuickPhraseEnvironment = {
  id: string;
  name: string;
  phrases: string[];
};
