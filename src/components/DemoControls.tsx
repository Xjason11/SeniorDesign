import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { availableMockTokens } from "../services/mockSignRecognition";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { SignToken } from "../types/sign";

type DemoControlsProps = {
  isDemoMode: boolean;
  onDetectToken: (token: SignToken) => void;
  onToggleDemoMode: () => void;
};

export function DemoControls({ isDemoMode, onDetectToken, onToggleDemoMode }: DemoControlsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.label}>Mock sign recognition</Text>
          <Text style={styles.helper}>Reliable controls for the conference demo.</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityState={{ checked: isDemoMode }}
          activeOpacity={0.85}
          onPress={onToggleDemoMode}
          style={[styles.demoButton, isDemoMode && styles.demoButtonActive]}
        >
          <Ionicons color={isDemoMode ? colors.surface : colors.primaryDark} name="play-circle" size={18} />
          <Text style={[styles.demoButtonText, isDemoMode && styles.demoButtonTextActive]}>
            {isDemoMode ? "Demo On" : "Demo"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tokenGrid}>
        {availableMockTokens.map((token) => (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            key={token}
            onPress={() => onDetectToken(token)}
            style={styles.tokenButton}
          >
            <Text style={styles.tokenButtonText}>{token.replace("_", " ")}</Text>
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
    gap: spacing.md,
    padding: spacing.md
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  label: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  helper: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2
  },
  demoButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.sm
  },
  demoButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  demoButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  demoButtonTextActive: {
    color: colors.surface
  },
  tokenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tokenButton: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  tokenButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  }
});
