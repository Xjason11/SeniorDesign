import * as Speech from "expo-speech";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { fromByteArray } from "base64-js";
import { CameraRef, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import { AppHeader } from "./src/components/AppHeader";
import { CameraPanel } from "./src/components/CameraPanel";
import { CaptureRecognitionCard } from "./src/components/CaptureRecognitionCard";
import { ControlBar } from "./src/components/ControlBar";
import { DemoControls } from "./src/components/DemoControls";
import { LiveDebugStrip } from "./src/components/LiveDebugStrip";
import { PredictionFeedbackCard } from "./src/components/PredictionFeedbackCard";
import { SavedPhrases } from "./src/components/SavedPhrases";
import { TrainingControls } from "./src/components/TrainingControls";
import { TranslationCard } from "./src/components/TranslationCard";
import { extractImageFeatures } from "./src/services/imageFeatures";
import {
  recognizeSignSequenceWithModel,
  recognizeSignWithModel,
  saveModelSequenceTrainingSample,
  saveModelTrainingSample
} from "./src/services/modelSignRecognition";
import { getNextDemoToken, recognizeMockSign } from "./src/services/mockSignRecognition";
import { assemblePhrase } from "./src/services/phraseAssembler";
import { recognizeSignFromSnapshot } from "./src/services/snapshotSignRecognition";
import { colors } from "./src/theme/colors";
import { spacing } from "./src/theme/spacing";
import { RecognizedSign, SavedPhrase, SignToken, TrainingSample } from "./src/types/sign";

export default function App() {
  const cameraRef = useRef<CameraRef | null>(null);
  const { hasPermission, requestPermission, status } = useCameraPermission();
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("front");
  const cameraDevice = useCameraDevice(cameraFacing);
  const [tokens, setTokens] = useState<SignToken[]>([]);
  const [latestSign, setLatestSign] = useState<RecognizedSign>();
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [recognitionMessage, setRecognitionMessage] = useState(
    "Train at least 2 examples for one sign, then tap Capture to classify a new snapshot."
  );
  const [selectedTrainingToken, setSelectedTrainingToken] = useState<SignToken>("HELLO");
  const [trainingSamples, setTrainingSamples] = useState<TrainingSample[]>([]);
  const [lastCaptureBase64, setLastCaptureBase64] = useState<string>();
  const [lastCaptureFramesBase64, setLastCaptureFramesBase64] = useState<string[]>([]);
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);
  const lastLiveTokenRef = useRef<SignToken | undefined>(undefined);
  const lastLiveAcceptedAtRef = useRef(0);
  const liveLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const translatedText = useMemo(() => assemblePhrase(tokens), [tokens]);
  const sampleCountByToken = useMemo(() => getSampleCounts(trainingSamples), [trainingSamples]);

  useEffect(() => {
    if (!isDemoMode) {
      return;
    }

    const timer = setInterval(() => {
      const token = getNextDemoToken(demoStep);
      handleDetectedToken(token, "demo");
      setDemoStep((step) => step + 1);
    }, 2400);

    return () => clearInterval(timer);
  }, [demoStep, isDemoMode]);

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
  }, [isLiveMode, trainingSamples]);

  function handleDetectedToken(token: SignToken, source: RecognizedSign["source"] = "manual") {
    const detectedSign = {
      ...recognizeMockSign(token),
      source
    };
    handleRecognizedSign(detectedSign);
  }

  function handleRecognizedSign(detectedSign: RecognizedSign) {
    setLatestSign(detectedSign);
    setTokens((currentTokens) => [...currentTokens, detectedSign.token].slice(-5));
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
      const recognizedSign =
        modelSign ??
        (await recognizeSignFromSnapshot({
          features: photo.features,
          trainingSamples
        }));

      if (!recognizedSign) {
        if (modelErrorMessage) {
          setRecognitionMessage(`Model request failed: ${modelErrorMessage}`);
          return;
        }
        if (!options?.liveMode) {
          setRecognitionMessage(
            "No confident sign match yet. Add more labeled examples with the same camera framing and lighting."
          );
        }
        return;
      }

      if (options?.liveMode && shouldIgnoreLivePrediction(recognizedSign.token)) {
        return;
      }

      handleRecognizedSign(recognizedSign);
      if (options?.liveMode) {
        rememberLivePrediction(recognizedSign.token);
        setRecognitionMessage(`Live recognition: ${recognizedSign.label} using ${recognizedSign.source}.`);
      } else {
        setRecognitionMessage(`Captured frame recognized as ${recognizedSign.label} using ${recognizedSign.source}.`);
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

  async function handleTrainCapture() {
    if (!cameraRef.current || isRecognizing) {
      return;
    }

    setIsRecognizing(true);
    setRecognitionMessage(`Capturing labeled ${selectedTrainingToken.replace("_", " ")} example...`);

    try {
      const photo = await takeFeatureSequence();
      setLastCaptureBase64(photo.base64);
      setLastCaptureFramesBase64(photo.framesBase64);
      const sample: TrainingSample = {
        id: `${Date.now()}`,
        token: selectedTrainingToken,
        features: photo.features
      };
      const [savedSequenceToBackend, savedSingleToBackend] = await Promise.all([
        saveModelSequenceTrainingSample(photo.framesBase64, selectedTrainingToken).catch(() => false),
        saveModelTrainingSample(photo.base64, selectedTrainingToken).catch(() => false)
      ]);
      const savedToBackend = savedSequenceToBackend || savedSingleToBackend;

      setTrainingSamples((samples) => [...samples, sample].slice(-60));
      setRecognitionMessage(
        savedToBackend
          ? `Added ${selectedTrainingToken.replace("_", " ")} sample to the backend datasets.`
          : `Added ${selectedTrainingToken.replace("_", " ")} local example. Backend did not save the sample.`
      );
    } catch {
      setRecognitionMessage("Training capture failed. Check camera permission and try again.");
    } finally {
      setIsRecognizing(false);
    }
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
      features: extractImageFeatures(base64),
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
    if (!translatedText) {
      return;
    }

    Speech.stop();
    Speech.speak(translatedText, {
      language: "en-US",
      pitch: 1,
      rate: 0.92
    });
  }

  function handleClear() {
    Speech.stop();
    setTokens([]);
    setLatestSign(undefined);
    setDemoStep(0);
    setIsLiveMode(false);
    setLastCaptureBase64(undefined);
    setLastCaptureFramesBase64([]);
    lastLiveTokenRef.current = undefined;
    lastLiveAcceptedAtRef.current = 0;
    if (liveLoopTimeoutRef.current) {
      clearTimeout(liveLoopTimeoutRef.current);
      liveLoopTimeoutRef.current = undefined;
    }
    setRecognitionMessage("Train at least 2 examples for one sign, then tap Capture to classify a new snapshot.");
  }

  function handleSave() {
    if (!translatedText) {
      return;
    }

    const savedPhrase: SavedPhrase = {
      id: `${Date.now()}`,
      text: translatedText,
      createdAt: new Date()
    };

    setSavedPhrases((phrases) => [savedPhrase, ...phrases].slice(0, 4));
  }

  function handleDeleteLastTrainingSample() {
    setTrainingSamples((samples) => {
      const sampleIndex = findLastSampleIndex(samples, selectedTrainingToken);

      if (sampleIndex === -1) {
        return samples;
      }

      return samples.filter((_, index) => index !== sampleIndex);
    });
    setRecognitionMessage(`Removed the newest ${selectedTrainingToken.replace("_", " ")} training example.`);
  }

  function handleDeleteSelectedTrainingSamples() {
    setTrainingSamples((samples) => samples.filter((sample) => sample.token !== selectedTrainingToken));
    setRecognitionMessage(`Deleted all ${selectedTrainingToken.replace("_", " ")} training examples.`);
  }

  function handleAcceptPrediction() {
    if (!latestSign) {
      return;
    }

    setRecognitionMessage(`Confirmed ${latestSign.label}.`);
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />
        <CameraPanel
          cameraRef={cameraRef}
          facing={cameraFacing}
          hasPermission={hasPermission}
          isDeviceReady={cameraDevice !== undefined}
          isPermissionReady={status !== "not-determined" || hasPermission}
          onFlipCamera={handleFlipCamera}
          onRequestPermission={requestPermission}
        />
        <CaptureRecognitionCard
          canCapture={hasPermission && cameraDevice !== undefined}
          isLiveMode={isLiveMode}
          isRecognizing={isRecognizing}
          message={recognitionMessage}
          onCapture={handleCaptureSign}
          onToggleLiveMode={() => {
            setIsDemoMode(false);
            setIsLiveMode((enabled) => !enabled);
          }}
        />
        <LiveDebugStrip latestSign={latestSign?.source === "model" ? latestSign : undefined} />
        <PredictionFeedbackCard
          canSubmitFeedback={Boolean(lastCaptureBase64) || lastCaptureFramesBase64.length > 0}
          isSavingCorrection={isSavingCorrection}
          latestSign={latestSign}
          onAcceptPrediction={handleAcceptPrediction}
          onCorrectPrediction={handleCorrectPrediction}
        />
        <TranslationCard latestSign={latestSign} tokens={tokens} translatedText={translatedText} />
        <ControlBar
          canUseOutput={translatedText.length > 0}
          onClear={handleClear}
          onSave={handleSave}
          onSpeak={handleSpeak}
        />
        <DemoControls
          isDemoMode={isDemoMode}
          onDetectToken={handleDetectedToken}
          onToggleDemoMode={() => setIsDemoMode((enabled) => !enabled)}
        />
        <TrainingControls
          canCapture={hasPermission && cameraDevice !== undefined}
          isRecognizing={isRecognizing}
          onDeleteLastSample={handleDeleteLastTrainingSample}
          onDeleteSelectedSamples={handleDeleteSelectedTrainingSamples}
          onSelectToken={setSelectedTrainingToken}
          onTrainCapture={handleTrainCapture}
          sampleCountByToken={sampleCountByToken}
          selectedToken={selectedTrainingToken}
          totalSamples={trainingSamples.length}
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

function findLastSampleIndex(samples: TrainingSample[], token: SignToken): number {
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    if (samples[index].token === token) {
      return index;
    }
  }

  return -1;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: spacing.md,
    padding: spacing.md
  },
  bottomSpacer: {
    height: spacing.md
  }
});

function getSampleCounts(samples: TrainingSample[]): Record<SignToken, number> {
  return {
    HELLO: samples.filter((sample) => sample.token === "HELLO").length,
    THANK_YOU: samples.filter((sample) => sample.token === "THANK_YOU").length,
    HELP: samples.filter((sample) => sample.token === "HELP").length,
    WATER: samples.filter((sample) => sample.token === "WATER").length,
    YES: samples.filter((sample) => sample.token === "YES").length,
    NO: samples.filter((sample) => sample.token === "NO").length
  };
}

function wait(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
