import * as FileSystem from "expo-file-system/legacy";
import { defaultQuickPhraseEnvironmentId, defaultQuickPhraseEnvironments } from "./quickPhraseDefaults";
import { ConversationMessage, QuickPhraseEnvironment, SavedPhrase, SignToken } from "../types/sign";

export type PersistedDisplayMode = "translation" | "conversation" | "quickPhrases" | "voice" | "vocabulary" | "debug";
export type PersistedCameraFacing = "front" | "back";

export type PersistedAppState = {
  savedPhrases: SavedPhrase[];
  conversationMessages: ConversationMessage[];
  quickPhraseEnvironments: QuickPhraseEnvironment[];
  currentTokens: SignToken[];
  settings: {
    cameraFacing: PersistedCameraFacing;
    displayMode: PersistedDisplayMode;
    selectedQuickPhraseEnvironmentId: string;
    selectedSpeechVoiceId?: string;
    accessibilityModeEnabled: boolean;
    demoModeEnabled: boolean;
  };
};

type StoredAppStateV1 = {
  version: 1;
  savedPhrases?: StoredSavedPhrase[];
  conversationMessages?: StoredConversationMessage[];
  quickPhraseEnvironments?: QuickPhraseEnvironment[];
  currentTokens?: SignToken[];
  settings?: Partial<PersistedAppState["settings"]>;
};

type StoredSavedPhrase = Omit<SavedPhrase, "createdAt"> & {
  createdAt: string;
};

type StoredConversationMessage = Omit<ConversationMessage, "createdAt"> & {
  createdAt: string;
};

const APP_STATE_PATH = `${FileSystem.documentDirectory ?? ""}asl-conversation-app-state.json`;
const SIGN_TOKENS: SignToken[] = [
  "HELLO",
  "THANK_YOU",
  "HELP",
  "WATER",
  "YES",
  "NO",
  "BATHROOM",
  "DOCTOR",
  "PAIN",
  "STOP",
  "WAIT",
  "WRITE",
  "CALL",
  "WHERE",
  "NOW",
  "PLEASE",
  "FOOD",
  "EAT",
  "MORE",
  "AGAIN",
  "SORRY",
  "GOOD",
  "BAD",
  "NAME",
  "WHAT",
  "WHO",
  "WHY",
  "HOW",
  "WHEN",
  "HOME",
  "SCHOOL",
  "WORK",
  "FAMILY",
  "MOTHER",
  "FATHER",
  "FRIEND",
  "TEACHER",
  "STUDENT",
  "LEARN",
  "UNDERSTAND",
  "SICK",
  "MEDICINE",
  "HOSPITAL",
  "GO",
  "COME",
  "WANT",
  "NEED",
  "LIKE",
  "HAPPY",
  "SAD"
];
const DISPLAY_MODES: PersistedDisplayMode[] = [
  "translation",
  "conversation",
  "quickPhrases",
  "voice",
  "vocabulary",
  "debug"
];
const CAMERA_FACINGS: PersistedCameraFacing[] = ["front", "back"];

export async function loadPersistedAppState(): Promise<PersistedAppState | undefined> {
  if (!FileSystem.documentDirectory) {
    return undefined;
  }

  const fileInfo = await FileSystem.getInfoAsync(APP_STATE_PATH);
  if (!fileInfo.exists) {
    return undefined;
  }

  const rawState = await FileSystem.readAsStringAsync(APP_STATE_PATH);
  const parsedState = JSON.parse(rawState) as StoredAppStateV1;

  if (parsedState.version !== 1) {
    return undefined;
  }

  return normalizePersistedState(parsedState);
}

export async function savePersistedAppState(state: PersistedAppState): Promise<void> {
  if (!FileSystem.documentDirectory) {
    return;
  }

  const storedState: StoredAppStateV1 = {
    version: 1,
    savedPhrases: state.savedPhrases.map((phrase) => ({
      ...phrase,
      createdAt: phrase.createdAt.toISOString()
    })),
    conversationMessages: state.conversationMessages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString()
    })),
    quickPhraseEnvironments: state.quickPhraseEnvironments,
    currentTokens: state.currentTokens,
    settings: state.settings
  };

  await FileSystem.writeAsStringAsync(APP_STATE_PATH, JSON.stringify(storedState));
}

function normalizePersistedState(state: StoredAppStateV1): PersistedAppState {
  const quickPhraseEnvironments = normalizeQuickPhraseEnvironments(state.quickPhraseEnvironments);
  const storedQuickPhraseEnvironmentId = state.settings?.selectedQuickPhraseEnvironmentId;
  const selectedQuickPhraseEnvironmentId = quickPhraseEnvironments.some(
    (environment) => environment.id === storedQuickPhraseEnvironmentId
  )
    ? storedQuickPhraseEnvironmentId ?? defaultQuickPhraseEnvironmentId
    : quickPhraseEnvironments[0]?.id ?? defaultQuickPhraseEnvironmentId;

  return {
    savedPhrases: normalizeSavedPhrases(state.savedPhrases),
    conversationMessages: normalizeConversationMessages(state.conversationMessages),
    quickPhraseEnvironments,
    currentTokens: normalizeTokens(state.currentTokens).slice(-5),
    settings: {
      cameraFacing: isCameraFacing(state.settings?.cameraFacing) ? state.settings.cameraFacing : "front",
      displayMode: isDisplayMode(state.settings?.displayMode) ? state.settings.displayMode : "translation",
      selectedQuickPhraseEnvironmentId,
      selectedSpeechVoiceId:
        typeof state.settings?.selectedSpeechVoiceId === "string" ? state.settings.selectedSpeechVoiceId : undefined,
      accessibilityModeEnabled: state.settings?.accessibilityModeEnabled === true,
      demoModeEnabled: state.settings?.demoModeEnabled !== false
    }
  };
}

function normalizeQuickPhraseEnvironments(
  environments: QuickPhraseEnvironment[] | undefined
): QuickPhraseEnvironment[] {
  const normalized = (environments ?? [])
    .filter((environment) => typeof environment.id === "string" && typeof environment.name === "string")
    .map((environment) => ({
      id: environment.id,
      name: environment.name.trim().slice(0, 28),
      phrases: (environment.phrases ?? [])
        .filter((phrase) => typeof phrase === "string" && phrase.trim().length > 0)
        .map((phrase) => phrase.trim().slice(0, 120))
        .slice(0, 12)
    }))
    .filter((environment) => environment.name.length > 0)
    .slice(0, 10);

  if (normalized.length === 0) {
    return defaultQuickPhraseEnvironments;
  }

  return mergeDefaultQuickPhraseEnvironments(normalized);
}

function mergeDefaultQuickPhraseEnvironments(environments: QuickPhraseEnvironment[]): QuickPhraseEnvironment[] {
  const mergedEnvironments = environments.map((environment) => ({ ...environment }));

  defaultQuickPhraseEnvironments.forEach((defaultEnvironment) => {
    const existingEnvironment = mergedEnvironments.find((environment) => environment.id === defaultEnvironment.id);

    if (!existingEnvironment) {
      mergedEnvironments.push(defaultEnvironment);
      return;
    }

    const existingPhraseTexts = new Set(existingEnvironment.phrases.map((phrase) => phrase.toLowerCase()));
    const missingDefaultPhrases = defaultEnvironment.phrases.filter(
      (phrase) => !existingPhraseTexts.has(phrase.toLowerCase())
    );

    existingEnvironment.phrases = [...existingEnvironment.phrases, ...missingDefaultPhrases].slice(0, 12);
  });

  return mergedEnvironments.slice(0, 10);
}

function normalizeSavedPhrases(phrases: StoredSavedPhrase[] | undefined): SavedPhrase[] {
  return (phrases ?? [])
    .filter((phrase) => typeof phrase.id === "string" && typeof phrase.text === "string")
    .map((phrase) => ({
      id: phrase.id,
      text: phrase.text,
      createdAt: parseDate(phrase.createdAt) ?? new Date()
    }))
    .slice(0, 4);
}

function normalizeConversationMessages(messages: StoredConversationMessage[] | undefined): ConversationMessage[] {
  return (messages ?? [])
    .filter(
      (message) =>
        typeof message.id === "string" &&
        typeof message.text === "string" &&
        (message.speaker === "signer" || message.speaker === "partner")
    )
    .map((message) => ({
      ...message,
      createdAt: parseDate(message.createdAt) ?? new Date()
    }))
    .slice(-20);
}

function normalizeTokens(tokens: SignToken[] | undefined): SignToken[] {
  return (tokens ?? []).filter(isSignToken);
}

function parseDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isSignToken(value: unknown): value is SignToken {
  return SIGN_TOKENS.includes(value as SignToken);
}

function isDisplayMode(value: unknown): value is PersistedDisplayMode {
  return DISPLAY_MODES.includes(value as PersistedDisplayMode);
}

function isCameraFacing(value: unknown): value is PersistedCameraFacing {
  return CAMERA_FACINGS.includes(value as PersistedCameraFacing);
}
