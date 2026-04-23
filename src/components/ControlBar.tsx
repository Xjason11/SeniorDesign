import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type ControlBarProps = {
  canUseOutput: boolean;
  onSpeak: () => void;
  onClear: () => void;
  onSave: () => void;
};

export function ControlBar({ canUseOutput, onSpeak, onClear, onSave }: ControlBarProps) {
  return (
    <View style={styles.container}>
      <ActionButton
        icon="volume-high"
        label="Speak"
        disabled={!canUseOutput}
        variant="primary"
        onPress={onSpeak}
      />
      <ActionButton icon="trash-outline" label="Clear" disabled={!canUseOutput} onPress={onClear} />
      <ActionButton icon="bookmark-outline" label="Save" disabled={!canUseOutput} onPress={onSave} />
    </View>
  );
}

type ActionButtonProps = {
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: "primary";
};

function ActionButton({ disabled, icon, label, onPress, variant }: ActionButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, isPrimary && styles.primaryButton, disabled && styles.disabledButton]}
    >
      <Ionicons color={isPrimary ? colors.surface : colors.primaryDark} name={icon} size={19} />
      <Text style={[styles.buttonText, isPrimary && styles.primaryButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.sm
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  disabledButton: {
    opacity: 0.45
  },
  buttonText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "800"
  },
  primaryButtonText: {
    color: colors.surface
  }
});
