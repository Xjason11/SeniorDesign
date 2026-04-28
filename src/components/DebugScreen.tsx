import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { BackendStatus } from "../services/modelSignRecognition";
import { availableSignTokens, phase2TargetSignTokens } from "../services/signTokens";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { RecognizedSign } from "../types/sign";

type DebugScreenProps = {
  backendStatus?: BackendStatus;
  recognitionHistory: RecognizedSign[];
};

export function DebugScreen({ backendStatus, recognitionHistory }: DebugScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Debug</Text>
          <Text style={styles.subtitle}>Recognition, backend, and vocabulary diagnostics.</Text>
        </View>
        <Ionicons color={colors.primaryDark} name="bug" size={22} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent predictions</Text>
        {recognitionHistory.length === 0 ? (
          <Text style={styles.empty}>No predictions yet.</Text>
        ) : (
          recognitionHistory.map((sign, index) => (
            <View key={`${sign.token}-${index}-${sign.latencyMs ?? 0}`} style={styles.historyRow}>
              <Text style={styles.historyToken}>{sign.token.replace("_", " ")}</Text>
              <Text style={styles.historyMeta}>
                {Math.round(sign.confidence * 100)}% · {sign.mode ?? "single"} · {sign.latencyMs ?? 0}ms
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backend samples</Text>
        <View style={styles.sampleGrid}>
          {availableSignTokens.map((token) => {
            const singleCount = backendStatus?.sampleCounts[token] ?? 0;
            const sequenceCount = backendStatus?.sequenceSampleCounts[token] ?? 0;
            return (
              <View key={token} style={styles.sampleItem}>
                <Text style={styles.sampleToken}>{token.replace("_", " ")}</Text>
                <Text style={styles.sampleMeta}>single {singleCount} · seq {sequenceCount}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experimental target tokens</Text>
        <Text style={styles.tokenText}>{phase2TargetSignTokens.join(", ")}</Text>
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
    fontSize: 22,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 2
  },
  section: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  historyRow: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.sm
  },
  historyToken: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900"
  },
  historyMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  sampleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  sampleItem: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: "47%",
    padding: spacing.sm
  },
  sampleToken: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  sampleMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  tokenText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  }
});
