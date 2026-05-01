import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { demoSignTokens } from "../services/signTokens";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type DemoModeCardProps = {
  isEnabled: boolean;
  onToggle: () => void;
};

export function DemoModeCard({ isEnabled, onToggle }: DemoModeCardProps) {
  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityState={{ checked: isEnabled }}
      activeOpacity={0.85}
      onPress={onToggle}
      style={[styles.container, isEnabled && styles.containerActive]}
    >
      <View style={[styles.iconWrap, isEnabled && styles.iconWrapActive]}>
        <Ionicons color={isEnabled ? colors.surface : colors.primaryDark} name="sparkles" size={21} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, isEnabled && styles.titleActive]}>
          {isEnabled ? "Demo mode on" : "Full vocabulary mode"}
        </Text>
        <Text style={[styles.detail, isEnabled && styles.detailActive]}>
          {isEnabled
            ? `${demoSignTokens.length} reliable signs enabled for the live demo.`
            : "All trained signs are enabled."}
        </Text>
      </View>
      <Ionicons color={isEnabled ? colors.surface : colors.primaryDark} name={isEnabled ? "toggle" : "toggle-outline"} size={30} />
    </TouchableOpacity>
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
    minHeight: 68,
    padding: spacing.md
  },
  containerActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  iconWrapActive: {
    backgroundColor: "rgba(255, 255, 255, 0.18)"
  },
  copy: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  titleActive: {
    color: colors.surface
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  detailActive: {
    color: "#E4F3F8"
  }
});
