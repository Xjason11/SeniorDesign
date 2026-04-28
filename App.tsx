import * as Speech from "expo-speech";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, ScrollView, Share, StyleSheet, View } from "react-native";
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
  recognizeSignWithModel,
  saveModelSequenceTrainingSample,
  saveModelTrainingSample
} from "./src/services/modelSignRecognition";
import { assemblePhrase } from "./src/services/phraseAssembler";
import {
  defaultQuickPhraseEnvironmentId,
  defaultQuickPhraseEnvironments
} from "./src/services/quickPhraseDefaults";
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
  const lastPartnerSpeechTranscriptRef = useRef("");
  const partnerSpeechRecognitionRef = useRef<SpeechRecognitionModule | undefined>(undefined);
  const liveLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const translatedText = useMemo(() => assemblePhrase(tokens), [tokens]);
  const phraseVariants = useMemo(() => createPhraseVariants(translatedText), [translatedText]);
  const statementSuggestions = useMemo(
    () => createStatementSuggestions(latestSign, tokens),
    [latestSign, tokens]
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
          accessibilityModeEnabled: isAccessibilityModeEnabled
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

    setRecognitionMessage("Live recognition is running. Hold one of the six starter signs steady in frame.");

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
      }, 220);
    };

    void runLoop();

    return () => {
      isCancelled = true;
      if (liveLoopTimeoutRef.current) {
        clearTimeout(liveLoopTimeoutRef.current);
        liveLoopTimeoutRef.current = undefined;
      }
    };
  }, [isLiveMode]);

  function handleRecognizedSign(detectedSign: RecognizedSign, options?: { forceAppend?: boolean }) {
    setLatestSign(detectedSign);
    setRecognitionHistory((history) => [detectedSign, ...history].slice(0, 8));

    if (!options?.forceAppend && !shouldAutoAppendPrediction(detectedSign)) {
      setRecognitionMessage(
        `${detectedSign.label} is only ${Math.round(
          detectedSign.confidence * 100
        )}% confident. Confirm it or choose the correct sign before it is added.`
      );
      return;
    }

    setTokens((currentTokens) => [...currentTokens, detectedSign.token].slice(-5));
  }

  function shouldAutoAppendPrediction(detectedSign: RecognizedSign) {
    return detectedSign.source === "manual" || detectedSign.confidence >= AUTO_APPEND_CONFIDENCE;
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
      const photo = await takeFeatureSequence(options);
      setLastCaptureBase64(photo.base64);
      setLastCaptureFramesBase64(photo.framesBase64);
      let modelSign: RecognizedSign | undefined;
      let modelErrorMessage: string | undefined;

      try {
        modelSign =
          (await recognizeSignSequenceWithModel(photo.framesBase64, { liveMode: options?.liveMode })) ??
          (await recognizeSignWithModel(photo.base64, { liveMode: options?.liveMode }));
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
        }
        return;
      }

      if (options?.liveMode && shouldIgnoreLivePrediction(recognizedSign.token)) {
        return;
      }

      handleRecognizedSign(recognizedSign);
      if (options?.liveMode) {
        if (shouldAutoAppendPrediction(recognizedSign)) {
          rememberLivePrediction(recognizedSign.token);
          setRecognitionMessage(`Live recognition: ${recognizedSign.label} using ${recognizedSign.source}.`);
        }
      } else {
        if (shouldAutoAppendPrediction(recognizedSign)) {
          setRecognitionMessage(`Captured frame recognized as ${recognizedSign.label} using ${recognizedSign.source}.`);
        }
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
    const encodedSnapshot = await snapshot.toEncodedImageDataAsync("jpg", options?.liveMode ? 45 : 65);
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
    setIsLiveMode(false);
    setLastCaptureBase64(undefined);
    setLastCaptureFramesBase64([]);
    lastLiveTokenRef.current = undefined;
    lastLiveAcceptedAtRef.current = 0;
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
    if (!latestSign) {
      return;
    }

    setTokens((currentTokens) => {
      if (currentTokens[currentTokens.length - 1] === latestSign.token) {
        return currentTokens;
      }

      return [...currentTokens, latestSign.token].slice(-5);
    });
    setRecognitionMessage(`Confirmed ${latestSign.label}.`);
  }

  function handleSelectStatementSuggestion(text: string, suggestionTokens: SignToken[]) {
    setTokens(suggestionTokens.slice(-5));
    setEditableTranslatedText(text);
    setRecognitionMessage("Statement selected. Edit it if needed, then speak or save it.");
  }

  async function handleCorrectPrediction(token: SignToken) {
    if ((!lastCaptureBase64 && lastCaptureFramesBase64.length === 0) || isSavingCorrection) {
      return;
    }

    setIsSavingCorrection(true);
    setRecognitionMessage(`Saving correction as ${token.replace("_", " ")}...`);

    try {
      const [savedSequence, savedSingle] = await Promise.all([
        lastCaptureFramesBase64.length > 0
          ? saveModelSequenceTrainingSample(lastCaptureFramesBase64, token).catch(() => false)
          : Promise.resolve(false),
        lastCaptureBase64 ? saveModelTrainingSample(lastCaptureBase64, token).catch(() => false) : Promise.resolve(false)
      ]);
      const saved = savedSequence || savedSingle;
      if (saved) {
        setRecognitionMessage(`Correction saved as ${token.replace("_", " ")}. Retrain the backend to apply it.`);
        return;
      }

      setRecognitionMessage("Correction was not saved. The backend did not detect usable hand landmarks.");
    } catch {
      setRecognitionMessage("Correction failed. Check that the backend is still running.");
    } finally {
      setIsSavingCorrection(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, isAccessibilityModeEnabled && styles.accessibleSafeArea]}>
      <StatusBar style={isAccessibilityModeEnabled ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />
        <AccessibilityModeCard
          isEnabled={isAccessibilityModeEnabled}
          onToggle={() => setIsAccessibilityModeEnabled((enabled) => !enabled)}
        />
        <BackendStatusCard
          isChecking={isCheckingBackend}
          onRefresh={handleRefreshBackendStatus}
          status={backendStatus}
        />
        <CameraPanel
          cameraRef={cameraRef}
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
        {displayMode === "conversation" ? (
          <ConversationCard
            interimTranscript={partnerSpeechDraft}
            isCompact
            isListening={isPartnerListening}
            messages={conversationMessages}
            onAddPartnerMessage={handleAddPartnerMessage}
            onClearConversation={() => setConversationMessages([])}
            onStartListening={handleStartPartnerListening}
            onStopListening={handleStopPartnerListening}
            onShareConversation={handleShareConversation}
            speechStatus={partnerSpeechStatus}
          />
        ) : null}
        <LiveDebugStrip latestSign={latestSign?.source === "model" ? latestSign : undefined} />
        <PredictionFeedbackCard
          canSubmitFeedback={Boolean(lastCaptureBase64) || lastCaptureFramesBase64.length > 0}
          isSavingCorrection={isSavingCorrection}
          latestSign={latestSign}
          onAcceptPrediction={handleAcceptPrediction}
          onCorrectPrediction={handleCorrectPrediction}
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
          <Phase2VocabularyCard />
        ) : displayMode === "conversation" ? (
          <TranslationCard
            editableText={editableTranslatedText}
            latestSign={latestSign}
            onChangeEditableText={setEditableTranslatedText}
            onSelectVariant={setEditableTranslatedText}
            phraseVariants={phraseVariants}
            tokens={tokens}
            translatedText={translatedText}
          />
        ) : (
          <DebugScreen backendStatus={backendStatus} recognitionHistory={recognitionHistory} />
        )}
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
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  content: {
    gap: spacing.md,
    padding: spacing.md
  },
  bottomSpacer: {
    height: spacing.md
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

function createPhraseVariants(text: string) {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return [];
  }

  const withoutPeriod = trimmedText.replace(/[.?!]+$/g, "");
  const variants = [
    trimmedText,
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

function getTokenStatementSuggestions(token: SignToken): string[] {
  const suggestions: Partial<Record<SignToken, string[]>> = {
    AGAIN: ["Please repeat that.", "Can you say that again?"],
    BATHROOM: ["Where is the bathroom?", "I need the bathroom."],
    CALL: ["Please call someone.", "I need someone to call for help."],
    DOCTOR: ["I need a doctor.", "Where is the doctor?"],
    FOOD: ["I need food.", "May I have food, please?"],
    HELP: ["I need help.", "Please help me."],
    HOSPITAL: ["I need a hospital.", "Where is the hospital?"],
    MEDICINE: ["I need medicine.", "Where is my medicine?"],
    PAIN: ["I am in pain.", "I am in pain and need a doctor."],
    SICK: ["I feel sick.", "I feel sick and need a doctor."],
    WATER: ["May I have water?", "I need water."],
    WHERE: ["Where is it?", "Can you show me where it is?"],
    WRITE: ["Please write that down.", "Can you write that for me?"]
  };

  return suggestions[token] ?? [assemblePhrase([token])];
}

function lowercaseFirstLetter(value: string) {
  if (!value) {
    return value;
  }

  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}
