import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { availableMockTokens } from "../services/mockSignRecognition";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { SignToken } from "../types/sign";

type TrainingControlsProps = {
  selectedToken: SignToken;
  sampleCountByToken: Record<SignToken, number>;
  totalSamples: number;
  onDeleteLastSample: () => void;
  onDeleteSelectedSamples: () => void;
  onSelectToken: (token: SignToken) => void;
  onTrainCapture: () => void;
  canCapture: boolean;
  isRecognizing: boolean;
};

export function TrainingControls({
  selectedToken,
  sampleCountByToken,
  totalSamples,
  onDeleteLastSample,
  onDeleteSelectedSamples,
  onSelectToken,
  onTrainCapture,
  canCapture,
  isRecognizing
}: TrainingControlsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <Text style={styles.title}>Train snapshot recognizer</Text>
          <Text style={styles.helper}>{totalSamples} labeled examples stored in this app session.</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          disabled={!canCapture || isRecognizing}
          onPress={onTrainCapture}
          style={[styles.trainButton, (!canCapture || isRecognizing) && styles.disabled]}
        >
          <Ionicons color={colors.surface} name="add-circle" size={18} />
          <Text style={styles.trainButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tokenGrid}>
        {availableMockTokens.map((token) => {
          const isSelected = token === selectedToken;

          return (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              key={token}
              onPress={() => onSelectToken(token)}
              style={[styles.tokenButton, isSelected && styles.tokenButtonSelected]}
            >
              <Text style={[styles.tokenText, isSelected && styles.tokenTextSelected]}>{token.replace("_", " ")}</Text>
              <Text style={[styles.countText, isSelected && styles.countTextSelected]}>
                {sampleCountByToken[token]} samples
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.deleteRow}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          disabled={sampleCountByToken[selectedToken] === 0}
          onPress={onDeleteLastSample}
          style={[styles.deleteButton, sampleCountByToken[selectedToken] === 0 && styles.disabled]}
        >
          <Ionicons color={colors.danger} name="arrow-undo" size={17} />
          <Text style={styles.deleteButtonText}>Undo Last</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          disabled={sampleCountByToken[selectedToken] === 0}
          onPress={onDeleteSelectedSamples}
          style={[styles.deleteButton, sampleCountByToken[selectedToken] === 0 && styles.disabled]}
        >
          <Ionicons color={colors.danger} name="trash-outline" size={17} />
          <Text style={styles.deleteButtonText}>Delete {selectedToken.replace("_", " ")}</Text>
        </TouchableOpacity>
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
    gap: spacing.md,
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
  helper: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  trainButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md
  },
  trainButtonText: {
    color: colors.surface,
    fontSize: 15,
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
    borderColor: colors.surfaceSoft,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: "30%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  tokenButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tokenText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  tokenTextSelected: {
    color: colors.surface
  },
  countText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  countTextSelected: {
    color: colors.surface
  },
  deleteRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.sm
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800"
  }
});
