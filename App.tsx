import * as Speech from "expo-speech";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  View
} from "react-native";
import { fromByteArray } from "base64-js";
import { CameraRef, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import { AccessibilityModeCard } from "./src/components/AccessibilityModeCard";
import { AppHeader } from "./src/components/AppHeader";
import { BackendStatusCard } from "./src/components/BackendStatusCard";
import { CameraPanel } from "./src/components/CameraPanel";
import { CaptureRecognitionCard } from "./src/components/CaptureRecognitionCard";
import { ConversationCard } from "./src/components/ConversationCard";
import { ControlBar } from "./src/components/ControlBar";
import { DataManagementCard } from "./src/components/DataManagementCard";
import { DebugScreen } from "./src/components/DebugScreen";
import { DemoModeCard } from "./src/components/DemoModeCard";
import { DisplayMode, DisplayModeSelector } from "./src/components/DisplayModeSelector";
import { LiveDebugStrip } from "./src/components/LiveDebugStrip";
import { Phase2VocabularyCard } from "./src/components/Phase2VocabularyCard";
import { PredictionFeedbackCard, StatementSuggestion } from "./src/components/PredictionFeedbackCard";
import { QuickPhraseScreen } from "./src/components/QuickPhraseScreen";
import { SavedPhrases } from "./src/components/SavedPhrases";
import { TranslationCard } from "./src/components/TranslationCard";
import { VoiceSettingsCard } from "./src/components/VoiceSettingsCard";
import { loadPersistedAppState, savePersistedAppState } from "./src/services/localAppStorage";
import {
  BackendStatus,
  checkBackendStatus,
  recognizeSignSequenceWithModel,
  saveModelSequenceTrainingSample,
  saveModelTrainingSample
} from "./src/services/modelSignRecognition";
import { assemblePhrase } from "./src/services/phraseAssembler";
import {
  defaultQuickPhraseEnvironmentId,
  defaultQuickPhraseEnvironments
} from "./src/services/quickPhraseDefaults";
import { demoSignTokens, isDemoSignToken } from "./src/services/signTokens";
import { colors } from "./src/theme/colors";
import { spacing } from "./src/theme/spacing";
import {
  ConversationMessage,
  QuickPhraseEnvironment,
  RecognizedSign,
  SavedPhrase,
  SignToken
} from "./src/types/sign";

const AUTO_APPEND_CONFIDENCE = 0.72;

type SpeechRecognitionSubscription = {
  remove: () => void;
};

type SpeechRecognitionModule = {
  addListener: (eventName: string, listener: (event: any) => void) => SpeechRecognitionSubscription;
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: {
    addsPunctuation?: boolean;
    continuous?: boolean;
    interimResults?: boolean;
    lang?: string;
    maxAlternatives?: number;
  }) => void;
  stop: () => void;
};

export default function App() {
  const cameraRef = useRef<CameraRef | null>(null);
  const { hasPermission, requestPermission, status } = useCameraPermission();
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("front");
  const cameraDevice = useCameraDevice(cameraFacing);
  const [tokens, setTokens] = useState<SignToken[]>([]);
  const [latestSign, setLatestSign] = useState<RecognizedSign>();
  const [pendingSign, setPendingSign] = useState<RecognizedSign>();
  const [displayMode, setDisplayMode] = useState<DisplayMode>("translation");
  const [editableTranslatedText, setEditableTranslatedText] = useState("");
  const [isDisplayModeOpen, setIsDisplayModeOpen] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([]);
  const [quickPhraseEnvironments, setQuickPhraseEnvironments] = useState<QuickPhraseEnvironment[]>(
    defaultQuickPhraseEnvironments
  );
  const [selectedQuickPhraseEnvironmentId, setSelectedQuickPhraseEnvironmentId] = useState(
    defaultQuickPhraseEnvironmentId
  );
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [recognitionMessage, setRecognitionMessage] = useState(
    "Start the backend, then tap Capture or turn on Live recognition."
  );
  const [recognitionHistory, setRecognitionHistory] = useState<RecognizedSign[]>([]);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>();
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [isAccessibilityModeEnabled, setIsAccessibilityModeEnabled] = useState(false);
  const [isDemoModeEnabled, setIsDemoModeEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const [selectedSpeechVoiceId, setSelectedSpeechVoiceId] = useState<string>();
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isPartnerListening, setIsPartnerListening] = useState(false);
  const [partnerSpeechDraft, setPartnerSpeechDraft] = useState("");
  const [partnerSpeechStatus, setPartnerSpeechStatus] = useState(
    "Tap Listen to use speech input or keyboard dictation."
  );
  const [lastCaptureBase64, setLastCaptureBase64] = useState<string>();
  const [lastCaptureFramesBase64, setLastCaptureFramesBase64] = useState<string[]>([]);
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(false);
  const lastLiveTokenRef = useRef<SignToken | undefined>(undefined);
  const lastLiveAcceptedAtRef = useRef(0);
  const liveNoHandFramesRef = useRef(0);
  const lastPartnerSpeechTranscriptRef = useRef("");
  const partnerSpeechRecognitionRef = useRef<SpeechRecognitionModule | undefined>(undefined);
  const liveLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const translatedText = useMemo(() => assemblePhrase(tokens), [tokens]);
  const phraseVariants = useMemo(
    () => createPhraseVariants(translatedText, tokens),
    [tokens, translatedText]
  );
  const statementSuggestions = useMemo(
    () => createStatementSuggestions(pendingSign, tokens),
    [pendingSign, tokens]
  );

  useEffect(() => {
    void handleRefreshBackendStatus();
    void handleRefreshVoices();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const restoreState = async () => {
      try {
        const persistedState = await loadPersistedAppState();
        if (!persistedState || isCancelled) {
          return;
        }

        setSavedPhrases(persistedState.savedPhrases);
        setConversationMessages(persistedState.conversationMessages);
        setQuickPhraseEnvironments(persistedState.quickPhraseEnvironments);
        setTokens(persistedState.currentTokens);
        setCameraFacing(persistedState.settings.cameraFacing);
        setDisplayMode(persistedState.settings.displayMode);
        setSelectedQuickPhraseEnvironmentId(persistedState.settings.selectedQuickPhraseEnvironmentId);
        setSelectedSpeechVoiceId(persistedState.settings.selectedSpeechVoiceId);
        setIsAccessibilityModeEnabled(persistedState.settings.accessibilityModeEnabled);
        setIsDemoModeEnabled(persistedState.settings.demoModeEnabled);
        setRecognitionMessage("Restored saved phrases, settings, conversation history, and quick phrases.");
      } catch {
        if (!isCancelled) {
          setRecognitionMessage("Local data could not be restored. New captures will still work for this session.");
        }
      } finally {
        if (!isCancelled) {
          setHasLoadedPersistedState(true);
        }
      }
    };

    void restoreState();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedState) {
      return;
    }

    const saveTimer = setTimeout(() => {
      void savePersistedAppState({
        savedPhrases,
        conversationMessages,
        quickPhraseEnvironments,
        currentTokens: tokens,
        settings: {
          cameraFacing,
          displayMode,
          selectedQuickPhraseEnvironmentId,
          selectedSpeechVoiceId,
          accessibilityModeEnabled: isAccessibilityModeEnabled,
          demoModeEnabled: isDemoModeEnabled
        }
      }).catch(() => {
        setRecognitionMessage("Local data could not be saved. The current session is still active.");
      });
    }, 350);

    return () => clearTimeout(saveTimer);
  }, [
    cameraFacing,
    conversationMessages,
    displayMode,
    hasLoadedPersistedState,
    isAccessibilityModeEnabled,
    isDemoModeEnabled,
    quickPhraseEnvironments,
    savedPhrases,
    selectedQuickPhraseEnvironmentId,
    selectedSpeechVoiceId,
    tokens
  ]);

  useEffect(() => {
    setEditableTranslatedText(translatedText);
  }, [translatedText]);

  useEffect(() => {
    let isCancelled = false;
    let subscriptions: SpeechRecognitionSubscription[] = [];

    const loadSpeechRecognition = async () => {
      try {
        const speechRecognition = await import("expo-speech-recognition");
        if (isCancelled) {
          return;
        }

        const module = speechRecognition.ExpoSpeechRecognitionModule as SpeechRecognitionModule;
        partnerSpeechRecognitionRef.current = module;
        setPartnerSpeechStatus("Tap Listen to log spoken partner speech.");

        subscriptions = [
          module.addListener("start", () => {
            setIsPartnerListening(true);
            setPartnerSpeechStatus("Listening for partner speech...");
          }),
          module.addListener("end", () => {
            setIsPartnerListening(false);
            setPartnerSpeechStatus("Tap Listen to log spoken partner speech.");
          }),
          module.addListener("result", (event) => {
            const transcript = event.results?.[0]?.transcript?.trim();
            if (!transcript) {
              return;
            }

            setPartnerSpeechDraft(transcript);
            setPartnerSpeechStatus(event.isFinal ? "Speech captured and logged." : "Listening...");

            if (!event.isFinal || transcript === lastPartnerSpeechTranscriptRef.current) {
              return;
            }

            lastPartnerSpeechTranscriptRef.current = transcript;
            handleAddPartnerMessage(transcript);
            setPartnerSpeechDraft("");
          }),
          module.addListener("error", (event) => {
            setIsPartnerListening(false);
            setPartnerSpeechStatus(
              `Speech input unavailable: ${event.message || event.error}. Type the reply instead.`
            );
          })
        ];
      } catch {
        if (!isCancelled) {
          partnerSpeechRecognitionRef.current = undefined;
          setPartnerSpeechStatus("Tap Listen, then use the keyboard microphone to dictate the partner reply.");
        }
      }
    };

    void loadSpeechRecognition();

    return () => {
      isCancelled = true;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);

  useEffect(() => {
    if (!isLiveMode) {
      if (liveLoopTimeoutRef.current) {
        clearTimeout(liveLoopTimeoutRef.current);
        liveLoopTimeoutRef.current = undefined;
      }
      return;
    }

    setRecognitionMessage(
      "Live recognition is running. Hold a sign steady, then add the candidate you want."
    );

    let isCancelled = false;

    const runLoop = async () => {
      if (isCancelled) {
        return;
      }

      await handleCaptureSign({ liveMode: true });

      if (isCancelled) {
        return;
      }

      liveLoopTimeoutRef.current = setTimeout(() => {
        void runLoop();
      }, isDemoModeEnabled ? 90 : 120);
    };

    void runLoop();

    return () => {
      isCancelled = true;
      if (liveLoopTimeoutRef.current) {
        clearTimeout(liveLoopTimeoutRef.current);
        liveLoopTimeoutRef.current = undefined;
      }
    };
  }, [isDemoModeEnabled, isLiveMode]);

  function handleRecognizedSign(detectedSign: RecognizedSign, options?: { forceAppend?: boolean; liveMode?: boolean }) {
    setLatestSign(detectedSign);
    setRecognitionHistory((history) => [detectedSign, ...history].slice(0, 8));

    if (!options?.forceAppend && !shouldAppendPredictionImmediately(detectedSign, options)) {
      setPendingSign(detectedSign);
      const confidence = Math.round(detectedSign.confidence * 100);
      setRecognitionMessage(
        `Model read ${detectedSign.label} at ${confidence}% confidence. Tap Add to use it, or choose the correct sign.`
      );
      return;
    }

    setPendingSign(undefined);
    addTokenToTranslation(detectedSign.token);
  }

  function getDemoFilteredSign(detectedSign: RecognizedSign): RecognizedSign | undefined {
    if (!isDemoModeEnabled) {
      return detectedSign;
    }

    const demoAlternatives = (detectedSign.alternatives ?? []).filter((alternative) =>
      isDemoSignToken(alternative.token)
    );

    if (isDemoSignToken(detectedSign.token)) {
      return {
        ...detectedSign,
        alternatives: demoAlternatives
      };
    }

    const demoCandidate = demoAlternatives.find((alternative) => alternative.confidence >= 0.45);
    if (demoCandidate) {
      return {
        ...detectedSign,
        alternatives: demoAlternatives,
        confidence: demoCandidate.confidence,
        label: demoCandidate.label,
        token: demoCandidate.token
      };
    }

    if (isDemoSignToken(detectedSign.sequenceToken) && (detectedSign.sequenceConfidence ?? 0) >= 0.45) {
      return {
        ...detectedSign,
        alternatives: demoAlternatives,
        confidence: detectedSign.sequenceConfidence ?? detectedSign.confidence,
        label: detectedSign.sequenceToken.replace("_", " "),
        token: detectedSign.sequenceToken
      };
    }

    if (isDemoSignToken(detectedSign.singleFrameToken) && (detectedSign.singleFrameConfidence ?? 0) >= 0.45) {
      return {
        ...detectedSign,
        alternatives: demoAlternatives,
        confidence: detectedSign.singleFrameConfidence ?? detectedSign.confidence,
        label: detectedSign.singleFrameToken.replace("_", " "),
        token: detectedSign.singleFrameToken
      };
    }

    return undefined;
  }

  function shouldAppendPredictionImmediately(detectedSign: RecognizedSign, options?: { liveMode?: boolean }) {
    return detectedSign.source === "manual" || options?.liveMode === true;
  }

  function addTokenToTranslation(token: SignToken) {
    setTokens((currentTokens) => {
      if (currentTokens[currentTokens.length - 1] === token) {
        return currentTokens;
      }

      return [...currentTokens, token].slice(-5);
    });
  }

  function handleAddPartnerMessage(text: string) {
    const message: ConversationMessage = {
      createdAt: new Date(),
      id: `${Date.now()}-partner`,
      speaker: "partner",
      text
    };

    setConversationMessages((messages) => [
      ...messages,
      message
    ].slice(-20));
  }

  async function handleStartPartnerListening() {
    try {
      const speechRecognition = partnerSpeechRecognitionRef.current;
      if (!speechRecognition) {
        setPartnerSpeechStatus("Keyboard dictation ready. Tap the keyboard microphone, then Send.");
        return;
      }

      const isAvailable = speechRecognition.isRecognitionAvailable();
      if (!isAvailable) {
        setPartnerSpeechStatus("Speech recognition is not available on this device. Type the reply instead.");
        return;
      }

      const permission = await speechRecognition.requestPermissionsAsync();
      if (!permission.granted) {
        setPartnerSpeechStatus("Microphone or speech permission was not granted. Type the reply instead.");
        return;
      }

      lastPartnerSpeechTranscriptRef.current = "";
      setPartnerSpeechDraft("");
      speechRecognition.start({
        addsPunctuation: true,
        continuous: false,
        interimResults: true,
        lang: "en-US",
        maxAlternatives: 1
      });
    } catch {
      setIsPartnerListening(false);
      setPartnerSpeechStatus("Speech input could not start. Type the reply instead.");
    }
  }

  function handleStopPartnerListening() {
    partnerSpeechRecognitionRef.current?.stop();
    setIsPartnerListening(false);
  }

  function handleAddSignerPhrase(text: string, source: ConversationMessage["source"] = "manual") {
    const message: ConversationMessage = {
      confidence: 1,
      createdAt: new Date(),
      id: `${Date.now()}-phrase`,
      source,
      speaker: "signer",
      text
    };

    setConversationMessages((messages) => [...messages, message].slice(-20));
  }

  function handleQuickPhrase(text: string) {
    speakText(text);
    handleAddSignerPhrase(text);
    setRecognitionMessage("Quick phrase spoken and added to the conversation transcript.");
  }

  function handleCustomTtsText(text: string) {
    speakText(text);
    handleAddSignerPhrase(text);
    setRecognitionMessage("Typed message spoken and added to the conversation transcript.");
  }

  function speakText(text: string, voiceId = selectedSpeechVoiceId) {
    Speech.stop();
    Speech.speak(text, {
      language: "en-US",
      pitch: 1,
      rate: isAccessibilityModeEnabled ? 0.82 : 0.92,
      voice: voiceId
    });
  }

  function handleAddQuickPhraseEnvironment(name: string) {
    const id = `${Date.now()}-${slugify(name)}`;
    const environment: QuickPhraseEnvironment = {
      id,
      name: name.trim().slice(0, 28),
      phrases: []
    };

    setQuickPhraseEnvironments((environments) => [...environments, environment].slice(0, 10));
    setSelectedQuickPhraseEnvironmentId(id);
  }

  function handleAddQuickPhrase(environmentId: string, phrase: string) {
    setQuickPhraseEnvironments((environments) =>
      environments.map((environment) => {
        if (environment.id !== environmentId) {
          return environment;
        }

        return {
          ...environment,
          phrases: [phrase.trim().slice(0, 120), ...environment.phrases].slice(0, 12)
        };
      })
    );
  }

  function handleMoveQuickPhrase(environmentId: string, phraseIndex: number, direction: "up" | "down") {
    setQuickPhraseEnvironments((environments) =>
      environments.map((environment) => {
        if (environment.id !== environmentId) {
          return environment;
        }

        const nextIndex = direction === "up" ? phraseIndex - 1 : phraseIndex + 1;
        if (nextIndex < 0 || nextIndex >= environment.phrases.length) {
          return environment;
        }

        const phrases = [...environment.phrases];
        const currentPhrase = phrases[phraseIndex];
        phrases[phraseIndex] = phrases[nextIndex];
        phrases[nextIndex] = currentPhrase;

        return {
          ...environment,
          phrases
        };
      })
    );
  }

  function handleDeleteQuickPhraseEnvironment(environmentId: string) {
    setQuickPhraseEnvironments((environments) => {
      const nextEnvironments = environments.filter((environment) => environment.id !== environmentId);
      if (selectedQuickPhraseEnvironmentId === environmentId) {
        setSelectedQuickPhraseEnvironmentId(nextEnvironments[0]?.id ?? defaultQuickPhraseEnvironmentId);
      }

      return nextEnvironments.length > 0 ? nextEnvironments : defaultQuickPhraseEnvironments;
    });
  }

  function handleDeleteQuickPhrase(environmentId: string, phraseIndex: number) {
    setQuickPhraseEnvironments((environments) =>
      environments.map((environment) => {
        if (environment.id !== environmentId) {
          return environment;
        }

        return {
          ...environment,
          phrases: environment.phrases.filter((_, index) => index !== phraseIndex)
        };
      })
    );
  }

  async function handleShareConversation() {
    if (conversationMessages.length === 0) {
      return;
    }

    const transcript = conversationMessages
      .map((message) => {
        const time = message.createdAt.toLocaleString([], {
          dateStyle: "short",
          timeStyle: "short"
        });
        const speaker = message.speaker === "signer" ? "Signed" : "Partner";
        const confidence = message.confidence !== undefined ? ` (${Math.round(message.confidence * 100)}%)` : "";
        return `[${time}] ${speaker}${confidence}: ${message.text}`;
      })
      .join("\n");

    await Share.share({
      message: transcript,
      title: "ASL conversation transcript"
    });
  }

  async function handleRefreshBackendStatus() {
    setIsCheckingBackend(true);
    try {
      setBackendStatus(await checkBackendStatus());
    } finally {
      setIsCheckingBackend(false);
    }
  }

  async function handleRefreshVoices() {
    setIsLoadingVoices(true);
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const englishVoices = voices
        .filter((voice) => voice.language.toLowerCase().startsWith("en"))
        .sort((firstVoice, secondVoice) => {
          if (firstVoice.quality !== secondVoice.quality) {
            return firstVoice.quality === Speech.VoiceQuality.Enhanced ? -1 : 1;
          }

          return firstVoice.name.localeCompare(secondVoice.name);
        });
      setAvailableVoices(englishVoices);

      if (selectedSpeechVoiceId && !englishVoices.some((voice) => voice.identifier === selectedSpeechVoiceId)) {
        setSelectedSpeechVoiceId(undefined);
      }
    } catch {
      setRecognitionMessage("Available voices could not be loaded. Device default voice will still work.");
    } finally {
      setIsLoadingVoices(false);
    }
  }

  function handlePreviewVoice(voiceId?: string) {
    speakText("This is the voice I will use.", voiceId);
  }

  function handleClearTranscript() {
    setConversationMessages([]);
    setRecognitionMessage("Conversation transcript cleared.");
  }

  function handleClearSavedPhrases() {
    setSavedPhrases([]);
    setRecognitionMessage("Saved phrases cleared.");
  }

  function handleResetQuickPhrases() {
    setQuickPhraseEnvironments(defaultQuickPhraseEnvironments);
    setSelectedQuickPhraseEnvironmentId(defaultQuickPhraseEnvironmentId);
    setRecognitionMessage("Quick phrases reset to the preloaded environments.");
  }

  function handleFlipCamera() {
    setCameraFacing((currentFacing) => (currentFacing === "front" ? "back" : "front"));
    setRecognitionMessage("Camera flipped. Keep training and capture examples using consistent framing.");
  }

  async function handleCaptureSign(options?: { liveMode?: boolean }) {
    if (!cameraRef.current || isRecognizing) {
      return;
    }

    setIsRecognizing(true);
    if (!options?.liveMode) {
      setRecognitionMessage("Capturing frame and running sign recognition...");
    }

    try {
      const allowedTokens = isDemoModeEnabled ? demoSignTokens : undefined;
      const photo = await takeFeatureSequence(options);
      setLastCaptureBase64(photo.base64);
      setLastCaptureFramesBase64(photo.framesBase64);
      let modelSign: RecognizedSign | undefined;
      let modelErrorMessage: string | undefined;

      try {
        modelSign = await recognizeSignSequenceWithModel(photo.framesBase64, {
          allowedTokens,
          liveMode: Boolean(options?.liveMode)
        });
      } catch (error) {
        modelErrorMessage = formatErrorMessage(error);
      }
      const recognizedSign = modelSign;

      if (!recognizedSign) {
        if (modelErrorMessage) {
          setRecognitionMessage(`Model request failed: ${modelErrorMessage}`);
          return;
        }
        if (!options?.liveMode) {
          setRecognitionMessage("No confident backend model match yet. Check framing, lighting, and backend status.");
        } else {
          liveNoHandFramesRef.current += 1;
          if (liveNoHandFramesRef.current === 1 || liveNoHandFramesRef.current % 10 === 0) {
            setRecognitionMessage("Looking for a confident sequence prediction. Keep your full hand steady in frame.");
          }
        }
        return;
      }

      liveNoHandFramesRef.current = 0;

      if (options?.liveMode && shouldIgnoreLivePrediction(recognizedSign.token)) {
        return;
      }

      if (options?.liveMode) {
        rememberLivePrediction(recognizedSign.token);
      }

      const demoFilteredSign = getDemoFilteredSign(recognizedSign);
      if (!demoFilteredSign) {
        if (!options?.liveMode) {
          setRecognitionMessage("No confident sign match yet. Hold your hand steady and try again.");
        }
        return;
      }

      handleRecognizedSign(demoFilteredSign, { liveMode: options?.liveMode });
      if (options?.liveMode) {
        setRecognitionMessage(`Live recognition: ${demoFilteredSign.label}.`);
      } else {
        setRecognitionMessage(`Capture candidate: ${demoFilteredSign.label}. Tap Add to include it.`);
      }
    } catch {
      if (!options?.liveMode) {
        setRecognitionMessage("Capture failed. Check camera permission and try again.");
      }
    } finally {
      setIsRecognizing(false);
    }
  }

  function rememberLivePrediction(token: SignToken) {
    lastLiveTokenRef.current = token;
    lastLiveAcceptedAtRef.current = Date.now();
  }

  function shouldIgnoreLivePrediction(token: SignToken) {
    if (isDemoModeEnabled) {
      return false;
    }

    return lastLiveTokenRef.current === token && Date.now() - lastLiveAcceptedAtRef.current < 900;
  }

  async function takeFeatureSequence(options?: { liveMode?: boolean }) {
    const framesBase64 = await captureFrameSequence(
      options?.liveMode ? 5 : 8,
      options?.liveMode ? 70 : 90,
      options
    );
    const base64 = framesBase64[framesBase64.length - 1];

    return {
      base64,
      framesBase64
    };
  }

  async function captureFrameSequence(
    frameCount: number,
    intervalMs: number,
    options?: { liveMode?: boolean }
  ): Promise<string[]> {
    const frames: string[] = [];

    for (let index = 0; index < frameCount; index += 1) {
      frames.push(await captureFrameBase64(options));
      if (index < frameCount - 1) {
        await wait(intervalMs);
      }
    }

    return frames;
  }

  async function captureFrameBase64(options?: { liveMode?: boolean }) {
    if (!cameraRef.current) {
      throw new Error("Camera is not ready.");
    }

    const snapshot = await cameraRef.current.takeSnapshot();
    const encodedSnapshot = await snapshot.toEncodedImageDataAsync("jpg", 70);
    const base64 = fromByteArray(new Uint8Array(encodedSnapshot.buffer));

    return base64;
  }

  function handleSpeak() {
    const text = editableTranslatedText.trim();
    if (!text) {
      return;
    }

    speakText(text);
    handleAddSignerPhrase(text, latestSign?.source ?? "manual");
  }

  function handleClear() {
    Speech.stop();
    setTokens([]);
    setEditableTranslatedText("");
    setLatestSign(undefined);
    setPendingSign(undefined);
    setIsLiveMode(false);
    setLastCaptureBase64(undefined);
    setLastCaptureFramesBase64([]);
    lastLiveTokenRef.current = undefined;
    lastLiveAcceptedAtRef.current = 0;
    liveNoHandFramesRef.current = 0;
    if (liveLoopTimeoutRef.current) {
      clearTimeout(liveLoopTimeoutRef.current);
      liveLoopTimeoutRef.current = undefined;
    }
    setRecognitionMessage("Start the backend, then tap Capture or turn on Live recognition.");
  }

  function handleSave() {
    const text = editableTranslatedText.trim();
    if (!text) {
      return;
    }

    const savedPhrase: SavedPhrase = {
      id: `${Date.now()}`,
      text,
      createdAt: new Date()
    };

    setSavedPhrases((phrases) => [savedPhrase, ...phrases].slice(0, 4));
  }

  function handleAcceptPrediction() {
    if (!pendingSign) {
      return;
    }

    addTokenToTranslation(pendingSign.token);
    setPendingSign(undefined);
    setRecognitionMessage(`Added ${pendingSign.label} to the translation.`);
  }

  function handleIgnorePrediction() {
    if (!pendingSign) {
      return;
    }

    const ignoredLabel = pendingSign.label;
    setPendingSign(undefined);
    setRecognitionMessage(`Ignored ${ignoredLabel}. Keep signing for the next prediction.`);
  }

  function handleSelectStatementSuggestion(text: string, suggestionTokens: SignToken[]) {
    setTokens(suggestionTokens.slice(-5));
    setEditableTranslatedText(text);
    setPendingSign(undefined);
    setRecognitionMessage("Statement selected. Edit it if needed, then speak or save it.");
  }

  async function handleCorrectPrediction(token: SignToken) {
    if (isDemoModeEnabled && !isDemoSignToken(token)) {
      setRecognitionMessage("That sign is not in the active recognition set.");
      return;
    }

    if ((!lastCaptureBase64 && lastCaptureFramesBase64.length === 0) || isSavingCorrection) {
      return;
    }

    setIsSavingCorrection(true);
    addTokenToTranslation(token);
    setPendingSign(undefined);
    setRecognitionMessage(`Added ${token.replace("_", " ")}. Saving correction for future training...`);

    try {
      const [savedSequence, savedSingle] = await Promise.all([
        lastCaptureFramesBase64.length > 0
          ? saveModelSequenceTrainingSample(lastCaptureFramesBase64, token).catch(() => false)
          : Promise.resolve(false),
        lastCaptureBase64 ? saveModelTrainingSample(lastCaptureBase64, token).catch(() => false) : Promise.resolve(false)
      ]);
      const saved = savedSequence || savedSingle;
      if (saved) {
        setRecognitionMessage(`Added ${token.replace("_", " ")} and saved the correction. Retrain the backend to apply it.`);
        return;
      }

      setRecognitionMessage(`Added ${token.replace("_", " ")}. Correction was not saved because no usable hand landmarks were detected.`);
    } catch {
      setRecognitionMessage(`Added ${token.replace("_", " ")}. Correction save failed; check that the backend is still running.`);
    } finally {
      setIsSavingCorrection(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, isAccessibilityModeEnabled && styles.accessibleSafeArea]}>
      <StatusBar style={isAccessibilityModeEnabled ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        style={styles.keyboardAvoider}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
        <AppHeader />
        <AccessibilityModeCard
          isEnabled={isAccessibilityModeEnabled}
          onToggle={() => setIsAccessibilityModeEnabled((enabled) => !enabled)}
        />
        <DemoModeCard
          isEnabled={isDemoModeEnabled}
          onToggle={() => {
            setIsDemoModeEnabled((enabled) => !enabled);
            setTokens([]);
            setLatestSign(undefined);
            setPendingSign(undefined);
          }}
        />
        <BackendStatusCard
          isChecking={isCheckingBackend}
          onRefresh={handleRefreshBackendStatus}
          status={backendStatus}
        />
        <CameraPanel
          cameraRef={cameraRef}
          device={cameraDevice}
          facing={cameraFacing}
          hasPermission={hasPermission}
          isDeviceReady={cameraDevice !== undefined}
          isPermissionReady={status !== "not-determined" || hasPermission}
          landmarkPoints={latestSign?.landmarkPoints}
          onFlipCamera={handleFlipCamera}
          onRequestPermission={requestPermission}
        />
        <CaptureRecognitionCard
          canCapture={hasPermission && cameraDevice !== undefined}
          isLiveMode={isLiveMode}
          isRecognizing={isRecognizing}
          message={recognitionMessage}
          onCapture={handleCaptureSign}
          onToggleLiveMode={() => setIsLiveMode((enabled) => !enabled)}
        />
        {displayMode === "debug" ? (
          <LiveDebugStrip latestSign={latestSign?.source === "model" ? latestSign : undefined} />
        ) : null}
        <PredictionFeedbackCard
          allowedTokens={isDemoModeEnabled ? demoSignTokens : undefined}
          canSubmitFeedback={Boolean(lastCaptureBase64) || lastCaptureFramesBase64.length > 0}
          isSavingCorrection={isSavingCorrection}
          latestSign={pendingSign}
          onAcceptPrediction={handleAcceptPrediction}
          onCorrectPrediction={handleCorrectPrediction}
          onIgnorePrediction={handleIgnorePrediction}
          onSelectStatementSuggestion={handleSelectStatementSuggestion}
          statementSuggestions={statementSuggestions}
        />
        <DisplayModeSelector
          isOpen={isDisplayModeOpen}
          mode={displayMode}
          onSelectMode={(mode) => {
            setDisplayMode(mode);
            setIsDisplayModeOpen(false);
          }}
          onToggleOpen={() => setIsDisplayModeOpen((isOpen) => !isOpen)}
        />
        {displayMode === "translation" ? (
          <TranslationCard
            editableText={editableTranslatedText}
            latestSign={latestSign}
            onChangeEditableText={setEditableTranslatedText}
            onSelectVariant={setEditableTranslatedText}
            phraseVariants={phraseVariants}
            tokens={tokens}
            translatedText={translatedText}
          />
        ) : displayMode === "quickPhrases" ? (
          <QuickPhraseScreen
            environments={quickPhraseEnvironments}
            isAccessibilityModeEnabled={isAccessibilityModeEnabled}
            onAddEnvironment={handleAddQuickPhraseEnvironment}
            onAddPhrase={handleAddQuickPhrase}
            onDeleteEnvironment={handleDeleteQuickPhraseEnvironment}
            onDeletePhrase={handleDeleteQuickPhrase}
            onMovePhrase={handleMoveQuickPhrase}
            onSelectEnvironment={setSelectedQuickPhraseEnvironmentId}
            onSpeakCustomText={handleCustomTtsText}
            onSpeakPhrase={handleQuickPhrase}
            selectedEnvironmentId={selectedQuickPhraseEnvironmentId}
          />
        ) : displayMode === "voice" ? (
          <VoiceSettingsCard
            isLoading={isLoadingVoices}
            onPreviewVoice={handlePreviewVoice}
            onRefreshVoices={handleRefreshVoices}
            onSelectVoice={setSelectedSpeechVoiceId}
            selectedVoiceId={selectedSpeechVoiceId}
            voices={availableVoices}
          />
        ) : displayMode === "vocabulary" ? (
          <Phase2VocabularyCard
            isDemoModeEnabled={isDemoModeEnabled}
            onToggleDemoMode={() => {
              setIsDemoModeEnabled((enabled) => !enabled);
              setTokens([]);
              setLatestSign(undefined);
              setPendingSign(undefined);
            }}
          />
        ) : displayMode === "conversation" ? (
          <ConversationCard
            canUseSignedMessage={editableTranslatedText.trim().length > 0}
            editableSignedText={editableTranslatedText}
            interimTranscript={partnerSpeechDraft}
            isListening={isPartnerListening}
            latestSign={latestSign}
            messages={conversationMessages}
            onAddPartnerMessage={handleAddPartnerMessage}
            onChangeSignedText={setEditableTranslatedText}
            onClearConversation={() => setConversationMessages([])}
            onClearSignedMessage={handleClear}
            onSaveSignedMessage={handleSave}
            onSelectVariant={setEditableTranslatedText}
            onSelectQuickPhraseEnvironment={setSelectedQuickPhraseEnvironmentId}
            onSpeakSignedMessage={handleSpeak}
            onSpeakQuickPhrase={handleQuickPhrase}
            onStartListening={handleStartPartnerListening}
            onStopListening={handleStopPartnerListening}
            onShareConversation={handleShareConversation}
            phraseVariants={phraseVariants}
            quickPhraseEnvironments={quickPhraseEnvironments}
            selectedQuickPhraseEnvironmentId={selectedQuickPhraseEnvironmentId}
            speechStatus={partnerSpeechStatus}
            tokens={tokens}
            translatedText={translatedText}
          />
        ) : (
          <DebugScreen backendStatus={backendStatus} recognitionHistory={recognitionHistory} />
        )}
        {displayMode !== "conversation" ? (
          <>
            <ControlBar
              canUseOutput={editableTranslatedText.trim().length > 0}
              onClear={handleClear}
              onSave={handleSave}
              onSpeak={handleSpeak}
            />
            <DataManagementCard
              onClearSavedPhrases={handleClearSavedPhrases}
              onClearTranscript={handleClearTranscript}
              onResetQuickPhrases={handleResetQuickPhrases}
            />
            <SavedPhrases phrases={savedPhrases} />
          </>
        ) : null}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  accessibleSafeArea: {
    backgroundColor: colors.cameraDark
  },
  keyboardAvoider: {
    flex: 1
  },
  scroll: {
    flex: 1
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xl
  },
  bottomSpacer: {
    height: spacing.xl
  }
});

function wait(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createPhraseVariants(text: string, tokens: SignToken[]) {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return [];
  }

  const tokenVariants = getSignedPhraseVariants(tokens);
  if (tokenVariants.length > 0) {
    return tokenVariants.filter((variant) => variant !== trimmedText).slice(0, 3);
  }

  const withoutPeriod = trimmedText.replace(/[.?!]+$/g, "");
  const variants = [
    `Please ${lowercaseFirstLetter(withoutPeriod)}.`,
    `${withoutPeriod}. Thank you.`,
    `Can you help me with this: ${lowercaseFirstLetter(withoutPeriod)}?`
  ];

  return Array.from(new Set(variants)).filter((variant) => variant !== trimmedText).slice(0, 3);
}

function createStatementSuggestions(latestSign: RecognizedSign | undefined, tokens: SignToken[]): StatementSuggestion[] {
  if (!latestSign || latestSign.source !== "model" || latestSign.confidence >= AUTO_APPEND_CONFIDENCE) {
    return [];
  }

  const candidateTokens = [
    ...(latestSign.alternatives ?? []).map((alternative) => alternative.token),
    latestSign.token,
    latestSign.sequenceToken,
    latestSign.singleFrameToken
  ].filter((token, index, allTokens): token is SignToken => Boolean(token) && allTokens.indexOf(token) === index);

  const suggestions: StatementSuggestion[] = [];
  candidateTokens.forEach((token) => {
    const suggestionTokens = [...tokens, token].slice(-3);
    addStatementSuggestion(suggestions, {
      text: assemblePhrase(suggestionTokens),
      tokens: suggestionTokens
    });

    getTokenStatementSuggestions(token).forEach((text) => {
      addStatementSuggestion(suggestions, {
        text,
        tokens: [token]
      });
    });
  });

  return suggestions.slice(0, 4);
}

function addStatementSuggestion(suggestions: StatementSuggestion[], suggestion: StatementSuggestion) {
  if (!suggestion.text.trim()) {
    return;
  }

  if (suggestions.some((currentSuggestion) => currentSuggestion.text === suggestion.text)) {
    return;
  }

  suggestions.push(suggestion);
}

function getSignedPhraseVariants(tokens: SignToken[]): string[] {
  if (tokens.length === 0) {
    return [];
  }

  const recentTokens = tokens.slice(-3);
  const phraseKey = recentTokens.join("_");
  const exactVariants = signedPhraseVariantPatterns[phraseKey];
  if (exactVariants) {
    return exactVariants;
  }

  const latestToken = recentTokens[recentTokens.length - 1];
  return signedTokenVariants[latestToken] ?? [];
}

const signedPhraseVariantPatterns: Partial<Record<string, string[]>> = {
  AGAIN_PLEASE: ["Could you say that again, please?", "Please repeat that.", "Can you repeat that for me?"],
  CALL_DOCTOR: ["Please call a doctor.", "Can you call a doctor for me?", "I need someone to call a doctor."],
  CALL_HELP: ["Please call someone for help.", "Can you call someone to help me?", "I need help making a call."],
  EAT_NOW: ["I need to eat now.", "Can I eat now?", "I would like to eat now."],
  FOOD_PLEASE: ["May I have some food, please?", "Could I have food, please?", "I need food, please."],
  HELLO_HELP: ["Hello. Can you help me?", "Hi, I need some help.", "Hello, could you help me?"],
  HELLO_WATER: ["Hello, may I have some water?", "Hi, could I have water?", "Hello. Can you help me get water?"],
  HELP_BATHROOM: ["Can you help me find the bathroom?", "I need help getting to the bathroom.", "Where is the bathroom?"],
  HELP_DOCTOR: ["Can you help me get a doctor?", "I need help finding a doctor.", "Please help me call a doctor."],
  HELP_NOW: ["I need help now.", "Can you help me right now?", "Please help me now."],
  HELP_WATER: ["Can you help me get water?", "I need help getting some water.", "Could I have some water, please?"],
  MORE_FOOD: ["Could I have more food?", "More food, please.", "I would like more food."],
  MORE_WATER: ["Could I have more water?", "More water, please.", "I would like more water."],
  NO_THANK_YOU: ["No, thank you.", "No thanks.", "I am okay, thank you."],
  PAIN_DOCTOR: ["I am in pain and need a doctor.", "Can I see a doctor? I am in pain.", "Please get a doctor. I am in pain."],
  PLEASE_WAIT: ["Please wait.", "Can you wait a moment?", "Please give me a moment."],
  PLEASE_WRITE: ["Please write that down.", "Can you write that for me?", "Could you write it down, please?"],
  SICK_DOCTOR: ["I feel sick and need a doctor.", "Can I see a doctor? I feel sick.", "Please get a doctor. I feel sick."],
  STOP_NOW: ["Please stop now.", "Stop now, please.", "I need you to stop right now."],
  WATER_PLEASE: ["May I have some water, please?", "Could I have water, please?", "I need water, please."],
  WHAT_NAME: ["What is your name?", "Can you tell me your name?", "What should I call you?"],
  WHERE_BATHROOM: ["Where is the bathroom?", "Can you show me where the bathroom is?", "I need to find the bathroom."],
  WHERE_HOME: ["Where is home?", "Can you help me get home?", "I need to go home."],
  WHERE_HOSPITAL: ["Where is the hospital?", "Can you show me where the hospital is?", "I need to find the hospital."],
  WHERE_SCHOOL: ["Where is the school?", "Can you show me where the school is?", "I need to find the school."],
  WHERE_WORK: ["Where is work?", "Can you show me where work is?", "I need to get to work."],
  YES_THANK_YOU: ["Yes, thank you.", "Yes, please. Thank you.", "That works, thank you."]
};

const signedTokenVariants: Record<SignToken, string[]> = {
  AGAIN: ["Can you say that again?", "Please repeat that.", "Could you repeat that for me?"],
  BAD: ["That is bad.", "I do not feel good about that.", "Something is wrong."],
  BATHROOM: ["I need the bathroom.", "Where is the bathroom?", "Can you help me find the bathroom?"],
  CALL: ["Please call someone.", "Can you make a call for me?", "I need someone to call for help."],
  COME: ["Please come here.", "Can you come over here?", "I need you to come here."],
  DOCTOR: ["I need a doctor.", "Can I see a doctor?", "Please get a doctor."],
  EAT: ["I need to eat.", "Can I have something to eat?", "I would like to eat."],
  FAMILY: ["I need my family.", "Can you contact my family?", "My family can help me."],
  FATHER: ["I need my father.", "Can you contact my father?", "My father can help me."],
  FOOD: ["I need food.", "May I have some food?", "Can I have something to eat?"],
  FRIEND: ["I need my friend.", "Can you contact my friend?", "My friend can help me."],
  GO: ["I need to go.", "Can we go now?", "Please help me go."],
  GOOD: ["That is good.", "I am good.", "This is okay."],
  HAPPY: ["I am happy.", "That makes me happy.", "I feel happy."],
  HELLO: ["Hello.", "Hello, how are you?", "Hello. Can you help me?"],
  HELP: ["I need help.", "Can you help me?", "Please help me."],
  HOME: ["I need to go home.", "Can you help me get home?", "I want to go home."],
  HOSPITAL: ["I need a hospital.", "Can you take me to the hospital?", "Where is the hospital?"],
  HOW: ["How do I do that?", "How does this work?", "Can you show me how?"],
  LEARN: ["I am learning.", "Can you help me learn this?", "I want to learn."],
  LIKE: ["I like that.", "I would like that.", "That works for me."],
  MEDICINE: ["I need medicine.", "Where is my medicine?", "Can you help me with my medicine?"],
  MORE: ["More, please.", "Can I have more?", "I would like more."],
  MOTHER: ["I need my mother.", "Can you contact my mother?", "My mother can help me."],
  NAME: ["What is your name?", "Can you tell me your name?", "My name is..."],
  NEED: ["I need that.", "Can you help me with that?", "I need something."],
  NO: ["No.", "No, thank you.", "I do not want that."],
  NOW: ["I need it now.", "Can we do that now?", "Right now, please."],
  PAIN: ["I am in pain.", "Something hurts.", "I need help with pain."],
  PLEASE: ["Please.", "Can you help me, please?", "Please help me with this."],
  SAD: ["I am sad.", "I feel sad.", "That makes me sad."],
  SCHOOL: ["I am at school.", "I need to go to school.", "Can you help me with school?"],
  SICK: ["I feel sick.", "I think I am sick.", "I need help because I feel sick."],
  SORRY: ["I am sorry.", "Sorry about that.", "Please forgive me."],
  STOP: ["Please stop.", "Stop, please.", "I need you to stop."],
  STUDENT: ["I am a student.", "The student needs help.", "Can you help the student?"],
  TEACHER: ["I need the teacher.", "Can you get the teacher?", "The teacher can help me."],
  THANK_YOU: ["Thank you.", "Thank you so much.", "I appreciate it."],
  UNDERSTAND: ["I understand.", "I do not understand.", "Can you explain that again?"],
  WAIT: ["Please wait.", "Can you wait a moment?", "Please give me a moment."],
  WANT: ["I want that.", "I would like that.", "Can I have that?"],
  WATER: ["May I have some water?", "I need water.", "Can you help me get water?"],
  WHAT: ["What is that?", "What do you mean?", "Can you explain that?"],
  WHEN: ["When is it?", "When will that happen?", "Can you tell me when?"],
  WHERE: ["Where is it?", "Can you show me where it is?", "I need help finding it."],
  WHO: ["Who is that?", "Who can help me?", "Can you tell me who that is?"],
  WHY: ["Why?", "Why is that happening?", "Can you explain why?"],
  WORK: ["I am at work.", "I need to go to work.", "Can you help me with work?"],
  WRITE: ["Please write that down.", "Can you write that for me?", "Could you write it down, please?"],
  YES: ["Yes.", "Yes, please.", "Yes, that is right."]
};

function getTokenStatementSuggestions(token: SignToken): string[] {
  return signedTokenVariants[token] ?? [assemblePhrase([token])];
}

function lowercaseFirstLetter(value: string) {
  if (!value) {
    return value;
  }

  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}
