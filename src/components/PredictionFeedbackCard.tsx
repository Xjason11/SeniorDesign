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
  allowedTokens?: readonly SignToken[];
  canSubmitFeedback: boolean;
  isSavingCorrection: boolean;
  onAcceptPrediction: () => void;
  onCorrectPrediction: (token: SignToken) => void;
  onIgnorePrediction: () => void;
  onSelectStatementSuggestion: (text: string, tokens: SignToken[]) => void;
  statementSuggestions: StatementSuggestion[];
};

export type StatementSuggestion = {
  text: string;
  tokens: SignToken[];
};

export function PredictionFeedbackCard({
  latestSign,
  allowedTokens,
  canSubmitFeedback,
  isSavingCorrection,
  onAcceptPrediction,
  onCorrectPrediction,
  onIgnorePrediction,
  onSelectStatementSuggestion,
  statementSuggestions
}: PredictionFeedbackCardProps) {
  const [selectedCategory, setSelectedCategory] = useState<SignTokenCategory>("starter");

  if (!latestSign || latestSign.source !== "model") {
    return null;
  }

  const isLowConfidence = latestSign.confidence < 0.72;
  const allowedTokenSet = allowedTokens ? new Set<SignToken>(allowedTokens) : undefined;
  const visibleCategories = (Object.keys(signTokenCategories) as SignTokenCategory[]).filter((category) =>
    signTokenCategories[category].some((token) => !allowedTokenSet || allowedTokenSet.has(token))
  );
  const fallbackCategory = visibleCategories[0] ?? "starter";
  const activeCategory = visibleCategories.includes(selectedCategory) ? selectedCategory : fallbackCategory;
  const correctionTokens = signTokenCategories[activeCategory].filter((token) => !allowedTokenSet || allowedTokenSet.has(token));
  const modelAlternatives = (latestSign.alternatives ?? [])
    .filter((alternative) => alternative.token !== latestSign.token)
    .filter((alternative) => !allowedTokenSet || allowedTokenSet.has(alternative.token))
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <View style={styles.promptBanner}>
        <View style={styles.promptIcon}>
          <Ionicons color={colors.surface} name="hand-left" size={26} />
        </View>
        <View style={styles.promptCopy}>
          <Text style={styles.promptEyebrow}>Received sign</Text>
          <Text style={styles.promptTitle}>{latestSign.label}</Text>
          <Text style={styles.promptDetail}>Waiting for you to add or ignore this prediction.</Text>
        </View>
      </View>

      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <Text style={styles.title}>{isLowConfidence ? "Check this prediction" : "Use this sign?"}</Text>
          <Text style={styles.detail}>
            {latestSign.label} - {Math.round(latestSign.confidence * 100)}% -{" "}
            {latestSign.handDetected
              ? latestSign.mode === "sequence"
                ? `${latestSign.landmarkCount ?? 0} tracked frames`
                : `${latestSign.landmarkCount ?? 0} landmarks`
              : "no hand landmarks"}
          </Text>
        </View>
      </View>

      <View style={styles.primaryActions}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          disabled={!canSubmitFeedback || isSavingCorrection}
          onPress={onAcceptPrediction}
          style={[styles.acceptButton, (!canSubmitFeedback || isSavingCorrection) && styles.disabled]}
        >
          <Ionicons color={colors.surface} name="checkmark-circle" size={22} />
          <Text style={styles.acceptText}>Add to phrase</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          disabled={isSavingCorrection}
          onPress={onIgnorePrediction}
          style={[styles.ignoreButton, isSavingCorrection && styles.disabled]}
        >
          <Ionicons color={colors.primaryDark} name="close-circle-outline" size={22} />
          <Text style={styles.ignoreText}>Ignore</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helper}>
        {isLowConfidence
          ? "Confidence is low. You can still add it, ignore it, pick a full statement, or choose the correct sign below."
          : "Nothing is added until you choose Add. Ignore keeps the current phrase unchanged."}
      </Text>

      {isLowConfidence && statementSuggestions.length > 0 ? (
        <View style={styles.statementGroup}>
          <Text style={styles.statementLabel}>Suggested statements</Text>
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

      {modelAlternatives.length > 0 ? (
        <View style={styles.statementGroup}>
          <Text style={styles.statementLabel}>Nearby guesses</Text>
          <View style={styles.alternativeRow}>
            {modelAlternatives.map((alternative) => (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.85}
                disabled={!canSubmitFeedback || isSavingCorrection}
                key={alternative.token}
                onPress={() => onCorrectPrediction(alternative.token)}
                style={[styles.alternativeButton, (!canSubmitFeedback || isSavingCorrection) && styles.disabled]}
              >
                <Text style={styles.alternativeText}>{alternative.token.replace("_", " ")}</Text>
                <Text style={styles.alternativeConfidence}>{Math.round(alternative.confidence * 100)}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.correctionGroup}>
        <Text style={styles.statementLabel}>Choose a different sign</Text>
        <View style={styles.categoryRow}>
          {visibleCategories.map((category) => {
            const isSelected = category === activeCategory;
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
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.md
  },
  promptBanner: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 94,
    padding: spacing.md
  },
  promptIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  promptCopy: {
    flex: 1,
    gap: 2
  },
  promptEyebrow: {
    color: "#E4F3F8",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  promptTitle: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34
  },
  promptDetail: {
    color: "#E4F3F8",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
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
  primaryActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  statementGroup: {
    gap: spacing.sm
  },
  correctionGroup: {
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
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: spacing.md
  },
  acceptText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900"
  },
  ignoreButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: spacing.md
  },
  ignoreText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.5
  },
  tokenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  alternativeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  alternativeButton: {
    backgroundColor: "#EEF6FF",
    borderColor: "#C9DFF7",
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  alternativeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  alternativeConfidence: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
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
