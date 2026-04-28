import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { phase2TargetSignTokens, phase2VocabularyNotes } from "../services/signTokens";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function Phase2VocabularyCard() {
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
  }
});
