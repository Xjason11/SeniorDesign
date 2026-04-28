import { SignToken } from "../types/sign";

const tokenText: Record<SignToken, string> = {
  HELLO: "Hello.",
  THANK_YOU: "Thank you.",
  HELP: "I need help.",
  WATER: "May I have water?",
  YES: "Yes.",
  NO: "No.",
  BATHROOM: "I need the bathroom.",
  DOCTOR: "I need a doctor.",
  PAIN: "I am in pain.",
  STOP: "Please stop.",
  WAIT: "Please wait.",
  WRITE: "Please write that down.",
  CALL: "Please call someone.",
  WHERE: "Where is it?",
  NOW: "Now.",
  PLEASE: "Please.",
  FOOD: "I need food.",
  EAT: "I need to eat.",
  MORE: "More, please.",
  AGAIN: "Please repeat that.",
  SORRY: "Sorry.",
  GOOD: "Good.",
  BAD: "Bad.",
  NAME: "What is your name?",
  WHAT: "What?",
  WHO: "Who?",
  WHY: "Why?",
  HOW: "How?",
  WHEN: "When?",
  HOME: "I need to go home.",
  SCHOOL: "I am at school.",
  WORK: "I am at work.",
  FAMILY: "My family.",
  MOTHER: "My mother.",
  FATHER: "My father.",
  FRIEND: "My friend.",
  TEACHER: "Teacher.",
  STUDENT: "Student.",
  LEARN: "I am learning.",
  UNDERSTAND: "I understand.",
  SICK: "I feel sick.",
  MEDICINE: "I need medicine.",
  HOSPITAL: "I need a hospital.",
  GO: "Go.",
  COME: "Come here.",
  WANT: "I want that.",
  NEED: "I need that.",
  LIKE: "I like that.",
  HAPPY: "I am happy.",
  SAD: "I am sad."
};

const phrasePatterns: Partial<Record<string, string>> = {
  "HELLO_HELP": "Hello, I need help.",
  "HELP_WATER": "I need help getting water.",
  "YES_THANK_YOU": "Yes, thank you.",
  "NO_THANK_YOU": "No, thank you.",
  "HELLO_WATER": "Hello, may I have water?",
  "WHERE_BATHROOM": "Where is the bathroom?",
  "HELP_BATHROOM": "I need help finding the bathroom.",
  "HELP_DOCTOR": "I need help getting a doctor.",
  "PAIN_DOCTOR": "I am in pain and need a doctor.",
  "CALL_DOCTOR": "Please call a doctor.",
  "CALL_HELP": "Please call someone for help.",
  "PLEASE_WRITE": "Please write that down.",
  "PLEASE_WAIT": "Please wait.",
  "STOP_NOW": "Please stop now.",
  "HELP_NOW": "I need help now.",
  "WATER_PLEASE": "May I have water, please?",
  "FOOD_PLEASE": "May I have food, please?",
  "EAT_NOW": "I need to eat now.",
  "MORE_WATER": "More water, please.",
  "MORE_FOOD": "More food, please.",
  "AGAIN_PLEASE": "Please repeat that.",
  "SORRY_AGAIN": "Sorry, please repeat that.",
  "WHAT_NAME": "What is your name?",
  "WHO_TEACHER": "Who is the teacher?",
  "WHERE_HOME": "Where is home?",
  "WHERE_SCHOOL": "Where is the school?",
  "WHERE_WORK": "Where is work?",
  "WHERE_HOSPITAL": "Where is the hospital?",
  "NEED_MEDICINE": "I need medicine.",
  "SICK_DOCTOR": "I feel sick and need a doctor.",
  "NEED_DOCTOR": "I need a doctor.",
  "WANT_FOOD": "I want food.",
  "WANT_WATER": "I want water.",
  "I_LIKE": "I like that."
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

  const composedPhrase = composeIntentPhrase(recentTokens);
  if (composedPhrase) {
    return composedPhrase;
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

function composeIntentPhrase(tokens: SignToken[]): string | undefined {
  const tokenSet = new Set(tokens);
  const hasNeed = tokenSet.has("HELP");
  const hasPlease = tokenSet.has("PLEASE");
  const suffix = tokenSet.has("NOW") ? " now" : "";

  if (tokenSet.has("WHERE")) {
    const place = findFirst(tokens, ["BATHROOM", "DOCTOR", "HOME", "SCHOOL", "WORK", "HOSPITAL"]);
    if (place === "BATHROOM") {
      return "Where is the bathroom?";
    }
    if (place === "DOCTOR") {
      return "Where is the doctor?";
    }
    if (place === "HOME") {
      return "Where is home?";
    }
    if (place === "SCHOOL") {
      return "Where is the school?";
    }
    if (place === "WORK") {
      return "Where is work?";
    }
    if (place === "HOSPITAL") {
      return "Where is the hospital?";
    }
  }

  if ((tokenSet.has("PAIN") || tokenSet.has("SICK")) && tokenSet.has("DOCTOR")) {
    return `I am in pain and need a doctor${suffix}.`;
  }

  if (hasNeed || tokenSet.has("NEED") || tokenSet.has("WANT")) {
    const verb = tokenSet.has("WANT") ? "want" : "need";
    const object = findFirst(tokens, ["WATER", "FOOD", "BATHROOM", "DOCTOR", "MEDICINE", "HOSPITAL", "CALL"]);
    if (object === "WATER") {
      return `I ${verb} water${suffix}.`;
    }
    if (object === "FOOD") {
      return `I ${verb} food${suffix}.`;
    }
    if (object === "BATHROOM") {
      return `I ${verb} the bathroom${suffix}.`;
    }
    if (object === "DOCTOR") {
      return `I ${verb} a doctor${suffix}.`;
    }
    if (object === "MEDICINE") {
      return `I ${verb} medicine${suffix}.`;
    }
    if (object === "HOSPITAL") {
      return `I ${verb} a hospital${suffix}.`;
    }
    if (object === "CALL") {
      return `I need someone to call for help${suffix}.`;
    }
  }

  if (hasPlease) {
    const action = findFirst(tokens, ["WRITE", "WAIT", "STOP", "CALL", "AGAIN", "MORE"]);
    if (action === "WRITE") {
      return "Please write that down.";
    }
    if (action === "WAIT") {
      return "Please wait.";
    }
    if (action === "STOP") {
      return "Please stop.";
    }
    if (action === "CALL") {
      return "Please call someone.";
    }
    if (action === "AGAIN") {
      return "Please repeat that.";
    }
    if (action === "MORE") {
      return "More, please.";
    }
  }

  if (tokenSet.has("MORE")) {
    const object = findFirst(tokens, ["WATER", "FOOD", "MEDICINE"]);
    if (object === "WATER") {
      return "More water, please.";
    }
    if (object === "FOOD") {
      return "More food, please.";
    }
    if (object === "MEDICINE") {
      return "More medicine, please.";
    }
  }

  return undefined;
}

function findFirst(tokens: SignToken[], candidates: SignToken[]) {
  return candidates.find((candidate) => tokens.includes(candidate));
}
