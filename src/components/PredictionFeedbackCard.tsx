import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  SignTokenCategory,
  signTokenCategories,
  signTokenCategoryLabels
} from "../services/signTokens";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { RecognizedSign, SignToken } from "../types/sign";

type PredictionFeedbackCardProps = {
  latestSign?: RecognizedSign;
  canSubmitFeedback: boolean;
  isSavingCorrection: boolean;
  onAcceptPrediction: () => void;
  onCorrectPrediction: (token: SignToken) => void;
  onSelectStatementSuggestion: (text: string, tokens: SignToken[]) => void;
  statementSuggestions: StatementSuggestion[];
};

export type StatementSuggestion = {
  text: string;
  tokens: SignToken[];
};

export function PredictionFeedbackCard({
  latestSign,
  canSubmitFeedback,
  isSavingCorrection,
  onAcceptPrediction,
  onCorrectPrediction,
  onSelectStatementSuggestion,
  statementSuggestions
}: PredictionFeedbackCardProps) {
  const [selectedCategory, setSelectedCategory] = useState<SignTokenCategory>("starter");

  if (!latestSign || latestSign.source !== "model") {
    return null;
  }

  const isLowConfidence = latestSign.confidence < 0.72;
  const correctionTokens = signTokenCategories[selectedCategory];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <Text style={styles.title}>{isLowConfidence ? `Did you mean ${latestSign.label}?` : "Recognition feedback"}</Text>
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

      <Text style={styles.helper}>
        {isLowConfidence
          ? "Confidence is low. Pick a full statement, confirm the sign, or choose the correct token below."
          : "If this was wrong, choose the correct sign to add this capture to training data."}
      </Text>

      {isLowConfidence && statementSuggestions.length > 0 ? (
        <View style={styles.statementGroup}>
          <Text style={styles.statementLabel}>Did you mean...</Text>
          {statementSuggestions.map((suggestion) => (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              key={`${suggestion.tokens.join("-")}-${suggestion.text}`}
              onPress={() => onSelectStatementSuggestion(suggestion.text, suggestion.tokens)}
              style={styles.statementButton}
            >
              <Text style={styles.statementText}>{suggestion.text}</Text>
              <Ionicons color={colors.primaryDark} name="chatbubble-ellipses-outline" size={17} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.categoryRow}>
        {(Object.keys(signTokenCategories) as SignTokenCategory[]).map((category) => {
          const isSelected = category === selectedCategory;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[styles.categoryButton, isSelected && styles.categoryButtonSelected]}
            >
              <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                {signTokenCategoryLabels[category]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.tokenGrid}>
        {correctionTokens.map((token) => (
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
  statementGroup: {
    gap: spacing.sm
  },
  statementLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  statementButton: {
    alignItems: "center",
    backgroundColor: "#EEF6FF",
    borderColor: "#C9DFF7",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  statementText: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21
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
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  categoryButton: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  categoryText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  categoryTextSelected: {
    color: colors.surface
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
