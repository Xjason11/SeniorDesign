import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { demoSignTokens, phase2TargetSignTokens, phase2VocabularyNotes } from "../services/signTokens";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type Phase2VocabularyCardProps = {
  isDemoModeEnabled: boolean;
  onToggleDemoMode: () => void;
};

export function Phase2VocabularyCard({ isDemoModeEnabled, onToggleDemoMode }: Phase2VocabularyCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Phase 2 vocabulary</Text>
          <Text style={styles.subtitle}>Target signs to collect and train next.</Text>
        </View>
        <Ionicons color={colors.primaryDark} name="library" size={22} />
      </View>

      <View style={styles.grid}>
        {phase2TargetSignTokens.map((token) => (
          <View key={token} style={styles.item}>
            <Text style={styles.token}>{token.replace("_", " ")}</Text>
            <Text style={styles.note}>{phase2VocabularyNotes[token]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.demoControl}>
        <View style={styles.demoCopy}>
          <Text style={styles.demoTitle}>Recognition set</Text>
          <Text style={styles.demoDetail}>
            {isDemoModeEnabled
              ? `${demoSignTokens.length} selected signs are active.`
              : "Full trained vocabulary is active."}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityState={{ checked: isDemoModeEnabled }}
          activeOpacity={0.85}
          onPress={onToggleDemoMode}
          style={[styles.demoToggle, isDemoModeEnabled && styles.demoToggleActive]}
        >
          <Text style={[styles.demoToggleText, isDemoModeEnabled && styles.demoToggleTextActive]}>
            {isDemoModeEnabled ? "Starter" : "Full"}
          </Text>
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 2
  },
  grid: {
    gap: spacing.sm
  },
  item: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    padding: spacing.sm
  },
  token: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  note: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  demoControl: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingTop: spacing.md
  },
  demoCopy: {
    flex: 1,
    gap: 2
  },
  demoTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  demoDetail: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  demoToggle: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    minWidth: 78,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  demoToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  demoToggleText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  demoToggleTextActive: {
    color: colors.surface
  }
});
