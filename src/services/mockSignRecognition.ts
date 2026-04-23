import { RecognizedSign, SignToken } from "../types/sign";

export const demoSignSequence: SignToken[] = ["HELLO", "HELP", "WATER", "YES", "THANK_YOU"];

const tokenLabels: Record<SignToken, string> = {
  HELLO: "HELLO",
  THANK_YOU: "THANK YOU",
  HELP: "HELP",
  WATER: "WATER",
  YES: "YES",
  NO: "NO"
};

const confidenceByToken: Record<SignToken, number> = {
  HELLO: 0.91,
  THANK_YOU: 0.88,
  HELP: 0.84,
  WATER: 0.86,
  YES: 0.93,
  NO: 0.9
};

export function recognizeMockSign(token: SignToken): RecognizedSign {
  return {
    token,
    label: tokenLabels[token],
    confidence: confidenceByToken[token]
  };
}

export function getNextDemoToken(currentStep: number): SignToken {
  return demoSignSequence[currentStep % demoSignSequence.length];
}

export const availableMockTokens: SignToken[] = [
  "HELLO",
  "THANK_YOU",
  "HELP",
  "WATER",
  "YES",
  "NO"
];
