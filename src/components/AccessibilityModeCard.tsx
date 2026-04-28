import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type AccessibilityModeCardProps = {
  isEnabled: boolean;
  onToggle: () => void;
};

export function AccessibilityModeCard({ isEnabled, onToggle }: AccessibilityModeCardProps) {
  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityState={{ checked: isEnabled }}
      activeOpacity={0.85}
      onPress={onToggle}
      style={[styles.container, isEnabled && styles.containerActive]}
    >
      <View style={styles.iconWrap}>
        <Ionicons color={isEnabled ? colors.cameraDark : colors.primaryDark} name="accessibility" size={22} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, isEnabled && styles.titleActive]}>Accessible mode</Text>
        <Text style={[styles.detail, isEnabled && styles.detailActive]}>
          {isEnabled ? "Large emergency controls and slower speech are on." : "High-contrast guidance and voice pacing."}
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
    backgroundColor: colors.cameraDark,
    borderColor: colors.surface
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
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
    color: "#DCEAF0"
  }
});
