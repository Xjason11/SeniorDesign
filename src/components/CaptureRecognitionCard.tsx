import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type CaptureRecognitionCardProps = {
  canCapture: boolean;
  isLiveMode: boolean;
  isRecognizing: boolean;
  message: string;
  onCapture: () => void;
  onToggleLiveMode: () => void;
};

export function CaptureRecognitionCard({
  canCapture,
  isLiveMode,
  isRecognizing,
  message,
  onCapture,
  onToggleLiveMode
}: CaptureRecognitionCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>Capture sign</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityState={{ checked: isLiveMode, disabled: !canCapture }}
          activeOpacity={0.85}
          disabled={!canCapture}
          onPress={onToggleLiveMode}
          style={[styles.liveButton, isLiveMode && styles.liveButtonActive, !canCapture && styles.buttonDisabled]}
        >
          <Ionicons color={isLiveMode ? colors.surface : colors.primaryDark} name="radio" size={18} />
          <Text style={[styles.liveButtonText, isLiveMode && styles.liveButtonTextActive]}>
            {isLiveMode ? "Live On" : "Live"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !canCapture || isRecognizing || isLiveMode }}
          activeOpacity={0.85}
          disabled={!canCapture || isRecognizing || isLiveMode}
          onPress={onCapture}
          style={[styles.button, (!canCapture || isRecognizing || isLiveMode) && styles.buttonDisabled]}
        >
          <Ionicons color={colors.surface} name={isRecognizing ? "hourglass" : "scan"} size={20} />
          <Text style={styles.buttonText}>{isRecognizing ? "Reading" : "Capture"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  copy: {
    flex: 1,
    gap: 3
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  liveButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  liveButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  liveButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800"
  },
  liveButtonTextActive: {
    color: colors.surface
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800"
  }
});
