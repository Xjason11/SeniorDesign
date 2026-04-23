import { SignToken } from "../types/sign";

const tokenText: Record<SignToken, string> = {
  HELLO: "Hello.",
  THANK_YOU: "Thank you.",
  HELP: "I need help.",
  WATER: "May I have water?",
  YES: "Yes.",
  NO: "No."
};

const phrasePatterns: Partial<Record<string, string>> = {
  "HELLO_HELP": "Hello, I need help.",
  "HELP_WATER": "I need help getting water.",
  "YES_THANK_YOU": "Yes, thank you.",
  "NO_THANK_YOU": "No, thank you.",
  "HELLO_WATER": "Hello, may I have water?"
};

export function assemblePhrase(tokens: SignToken[]): string {
  if (tokens.length === 0) {
    return "";
  }

  const recentTokens = tokens.slice(-3);
  const bestPattern = findPattern(recentTokens);

  if (bestPattern) {
    return bestPattern;
  }

  return tokens.map((token) => tokenText[token]).join(" ");
}

function findPattern(tokens: SignToken[]): string | undefined {
  for (let size = tokens.length; size > 1; size -= 1) {
    const key = tokens.slice(-size).join("_");
    if (phrasePatterns[key]) {
      return phrasePatterns[key];
    }
  }

  return undefined;
}
