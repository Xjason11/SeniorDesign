import { Ionicons } from "@expo/vector-icons";
import { Voice, VoiceQuality } from "expo-speech";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type VoiceSettingsCardProps = {
  isLoading: boolean;
  onPreviewVoice: (voiceId?: string) => void;
  onRefreshVoices: () => void;
  onSelectVoice: (voiceId?: string) => void;
  selectedVoiceId?: string;
  voices: Voice[];
};

export function VoiceSettingsCard({
  isLoading,
  onPreviewVoice,
  onRefreshVoices,
  onSelectVoice,
  selectedVoiceId,
  voices
}: VoiceSettingsCardProps) {
  const visibleVoices = voices.slice(0, 8);
  const selectedVoice = voices.find((voice) => voice.identifier === selectedVoiceId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Voice</Text>
          <Text style={styles.subtitle}>
            {selectedVoice ? `${selectedVoice.name} - ${selectedVoice.language}` : "Use the device default voice."}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityLabel="Preview selected voice"
            accessibilityRole="button"
            activeOpacity={0.85}
            onPress={() => onPreviewVoice(selectedVoiceId)}
            style={styles.iconButton}
          >
            <Ionicons color={colors.primaryDark} name="volume-high" size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Refresh available voices"
            accessibilityRole="button"
            activeOpacity={0.85}
            onPress={onRefreshVoices}
            style={styles.iconButton}
          >
            <Ionicons color={colors.primaryDark} name={isLoading ? "hourglass" : "refresh"} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.voiceList}>
        <VoiceButton
          isSelected={!selectedVoiceId}
          label="Device default"
          onPress={() => onSelectVoice(undefined)}
          secondary="System voice"
        />
        {visibleVoices.map((voice) => (
          <VoiceButton
            isSelected={voice.identifier === selectedVoiceId}
            key={voice.identifier}
            label={voice.name}
            onPress={() => onSelectVoice(voice.identifier)}
            secondary={`${voice.language} - ${formatQuality(voice.quality)}`}
          />
        ))}
      </View>
    </View>
  );
}

type VoiceButtonProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
  secondary: string;
};

function VoiceButton({ isSelected, label, onPress, secondary }: VoiceButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.voiceButton, isSelected && styles.voiceButtonSelected]}
    >
      <View style={styles.voiceCopy}>
        <Text style={[styles.voiceName, isSelected && styles.voiceNameSelected]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.voiceMeta, isSelected && styles.voiceMetaSelected]} numberOfLines={1}>
          {secondary}
        </Text>
      </View>
      {isSelected ? <Ionicons color={colors.success} name="checkmark-circle" size={18} /> : null}
    </TouchableOpacity>
  );
}

function formatQuality(quality: Voice["quality"]) {
  return quality === VoiceQuality.Enhanced ? "Enhanced" : "Default";
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
    gap: spacing.md,
    justifyContent: "space-between"
  },
  headerCopy: {
    flex: 1,
    gap: 2
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
    lineHeight: 18
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 44
  },
  voiceList: {
    gap: spacing.sm
  },
  voiceButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  voiceButtonSelected: {
    backgroundColor: "#EAF7EF",
    borderColor: "#BFE5D2"
  },
  voiceCopy: {
    flex: 1,
    gap: 2
  },
  voiceName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  voiceNameSelected: {
    color: colors.success
  },
  voiceMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  voiceMetaSelected: {
    color: colors.primaryDark
  }
});
