import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { availableMockTokens } from "../services/mockSignRecognition";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { RecognizedSign, SignToken } from "../types/sign";

type PredictionFeedbackCardProps = {
  latestSign?: RecognizedSign;
  canSubmitFeedback: boolean;
  isSavingCorrection: boolean;
  onAcceptPrediction: () => void;
  onCorrectPrediction: (token: SignToken) => void;
};

export function PredictionFeedbackCard({
  latestSign,
  canSubmitFeedback,
  isSavingCorrection,
  onAcceptPrediction,
  onCorrectPrediction
}: PredictionFeedbackCardProps) {
  if (!latestSign || latestSign.source !== "model") {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <Text style={styles.title}>Model feedback</Text>
          <Text style={styles.detail}>
            {latestSign.label} - {Math.round(latestSign.confidence * 100)}% -{" "}
            {latestSign.handDetected
              ? latestSign.mode === "sequence"
                ? `${latestSign.landmarkCount ?? 0} tracked frames`
                : `${latestSign.landmarkCount ?? 0} landmarks`
              : "no hand landmarks"}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          disabled={!canSubmitFeedback || isSavingCorrection}
          onPress={onAcceptPrediction}
          style={[styles.acceptButton, (!canSubmitFeedback || isSavingCorrection) && styles.disabled]}
        >
          <Ionicons color={colors.surface} name="checkmark" size={18} />
          <Text style={styles.acceptText}>Yes</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helper}>If this was wrong, choose the correct sign to add this capture to training data.</Text>

      <View style={styles.tokenGrid}>
        {availableMockTokens.map((token) => (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={!canSubmitFeedback || isSavingCorrection}
            key={token}
            onPress={() => onCorrectPrediction(token)}
            style={[styles.tokenButton, (!canSubmitFeedback || isSavingCorrection) && styles.disabled]}
          >
            <Text style={styles.tokenText}>{token.replace("_", " ")}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  copy: {
    flex: 1
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  helper: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  acceptButton: {
    alignItems: "center",
    backgroundColor: colors.success,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md
  },
  acceptText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800"
  },
  disabled: {
    opacity: 0.5
  },
  tokenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tokenButton: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  tokenText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  }
});
