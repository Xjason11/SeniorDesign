import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export type DisplayMode = "translation" | "conversation" | "quickPhrases" | "voice" | "vocabulary" | "debug";

type DisplayModeSelectorProps = {
  mode: DisplayMode;
  isOpen: boolean;
  onSelectMode: (mode: DisplayMode) => void;
  onToggleOpen: () => void;
};

const modeLabels: Record<DisplayMode, string> = {
  conversation: "Conversation",
  debug: "Debug",
  quickPhrases: "Quick phrases",
  translation: "Translation",
  vocabulary: "Vocabulary",
  voice: "Voice"
};

export function DisplayModeSelector({ mode, isOpen, onSelectMode, onToggleOpen }: DisplayModeSelectorProps) {
  const options: DisplayMode[] = ["translation", "quickPhrases", "voice", "vocabulary", "conversation", "debug"];

  return (
    <View style={styles.container}>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={onToggleOpen} style={styles.trigger}>
        <View style={styles.triggerCopy}>
          <Text style={styles.label}>Output view</Text>
          <Text style={styles.value}>{modeLabels[mode]}</Text>
        </View>
        <Ionicons color={colors.primaryDark} name={isOpen ? "chevron-up" : "chevron-down"} size={20} />
      </TouchableOpacity>

      {isOpen ? (
        <View style={styles.menu}>
          {options.map((option) => {
            const isSelected = option === mode;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.85}
                key={option}
                onPress={() => onSelectMode(option)}
                style={[styles.option, isSelected && styles.optionSelected]}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{modeLabels[option]}</Text>
                {isSelected ? <Ionicons color={colors.success} name="checkmark" size={18} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    zIndex: 2
  },
  trigger: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  triggerCopy: {
    gap: 2
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  value: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  menu: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  option: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  optionSelected: {
    backgroundColor: colors.surfaceSoft
  },
  optionText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "800"
  },
  optionTextSelected: {
    color: colors.success
  }
});
