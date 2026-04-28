import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type DataManagementCardProps = {
  onClearSavedPhrases: () => void;
  onClearTranscript: () => void;
  onResetQuickPhrases: () => void;
};

export function DataManagementCard({
  onClearSavedPhrases,
  onClearTranscript,
  onResetQuickPhrases
}: DataManagementCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Local data</Text>
          <Text style={styles.subtitle}>Reset testing data without touching the backend.</Text>
        </View>
        <Ionicons color={colors.primaryDark} name="settings" size={22} />
      </View>

      <View style={styles.actions}>
        <DataButton icon="chatbox-ellipses-outline" label="Clear transcript" onPress={onClearTranscript} />
        <DataButton icon="bookmark-outline" label="Clear saved" onPress={onClearSavedPhrases} />
        <DataButton icon="refresh-circle-outline" label="Reset phrases" onPress={onResetQuickPhrases} />
      </View>
    </View>
  );
}

type DataButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function DataButton({ icon, label, onPress }: DataButtonProps) {
  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={onPress} style={styles.button}>
      <Ionicons color={colors.primaryDark} name={icon} size={18} />
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
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
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm
  },
  buttonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  }
});
