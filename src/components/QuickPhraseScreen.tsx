import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { QuickPhraseEnvironment } from "../types/sign";

type QuickPhraseScreenProps = {
  environments: QuickPhraseEnvironment[];
  isAccessibilityModeEnabled: boolean;
  selectedEnvironmentId: string;
  onAddEnvironment: (name: string) => void;
  onAddPhrase: (environmentId: string, phrase: string) => void;
  onDeleteEnvironment: (environmentId: string) => void;
  onDeletePhrase: (environmentId: string, phraseIndex: number) => void;
  onMovePhrase: (environmentId: string, phraseIndex: number, direction: "up" | "down") => void;
  onSelectEnvironment: (environmentId: string) => void;
  onSpeakCustomText: (text: string) => void;
  onSpeakPhrase: (phrase: string) => void;
};

export function QuickPhraseScreen({
  environments,
  isAccessibilityModeEnabled,
  selectedEnvironmentId,
  onAddEnvironment,
  onAddPhrase,
  onDeleteEnvironment,
  onDeletePhrase,
  onMovePhrase,
  onSelectEnvironment,
  onSpeakCustomText,
  onSpeakPhrase
}: QuickPhraseScreenProps) {
  const [environmentDraft, setEnvironmentDraft] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [phraseDraft, setPhraseDraft] = useState("");
  const [customTextDraft, setCustomTextDraft] = useState("");
  const selectedEnvironment = environments.find((environment) => environment.id === selectedEnvironmentId) ?? environments[0];

  function handleAddEnvironment() {
    const name = environmentDraft.trim();
    if (!name) {
      return;
    }

    onAddEnvironment(name);
    setEnvironmentDraft("");
  }

  function handleAddPhrase() {
    const phrase = phraseDraft.trim();
    if (!phrase || !selectedEnvironment) {
      return;
    }

    onAddPhrase(selectedEnvironment.id, phrase);
    setPhraseDraft("");
  }

  function handleSpeakCustomText() {
    const text = customTextDraft.trim();
    if (!text) {
      return;
    }

    onSpeakCustomText(text);
    setCustomTextDraft("");
  }

  return (
    <View style={[styles.container, isAccessibilityModeEnabled && styles.containerAccessible]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, isAccessibilityModeEnabled && styles.titleAccessible]}>Quick phrases</Text>
          <Text style={[styles.subtitle, isAccessibilityModeEnabled && styles.subtitleAccessible]}>
            Choose an environment, then tap a phrase to speak it.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityState={{ checked: isEditMode }}
          activeOpacity={0.85}
          onPress={() => setIsEditMode((enabled) => !enabled)}
          style={[styles.editButton, isEditMode && styles.editButtonActive]}
        >
          <Ionicons color={isEditMode ? colors.surface : colors.primaryDark} name="create-outline" size={18} />
          <Text style={[styles.editButtonText, isEditMode && styles.editButtonTextActive]}>
            {isEditMode ? "Done" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.environmentRow}>
        {environments.map((environment) => {
          const isSelected = environment.id === selectedEnvironment?.id;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              key={environment.id}
              onPress={() => onSelectEnvironment(environment.id)}
              style={[
                styles.environmentButton,
                isSelected && styles.environmentButtonSelected,
                isAccessibilityModeEnabled && styles.environmentButtonAccessible,
                isAccessibilityModeEnabled && isSelected && styles.environmentButtonSelectedAccessible
              ]}
            >
              <Text
                style={[
                  styles.environmentText,
                  isSelected && styles.environmentTextSelected,
                  isAccessibilityModeEnabled && styles.environmentTextAccessible
                ]}
              >
                {environment.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedEnvironment ? (
        <View style={styles.phraseList}>
          <View style={styles.environmentHeader}>
            <Text style={[styles.sectionTitle, isAccessibilityModeEnabled && styles.sectionTitleAccessible]}>
              {selectedEnvironment.name}
            </Text>
            {isEditMode && environments.length > 1 ? (
              <TouchableOpacity
                accessibilityLabel={`Delete ${selectedEnvironment.name} environment`}
                accessibilityRole="button"
                activeOpacity={0.85}
                onPress={() => onDeleteEnvironment(selectedEnvironment.id)}
                style={styles.deleteEnvironmentButton}
              >
                <Ionicons color={colors.danger} name="trash-outline" size={17} />
              </TouchableOpacity>
            ) : null}
          </View>

          {selectedEnvironment.phrases.map((phrase, index) => (
            <View key={`${phrase}-${index}`} style={styles.phraseRow}>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.85}
                onPress={() => onSpeakPhrase(phrase)}
                style={[styles.phraseButton, isAccessibilityModeEnabled && styles.phraseButtonAccessible]}
              >
                <Ionicons
                  color={isAccessibilityModeEnabled ? colors.cameraDark : colors.primaryDark}
                  name="volume-high"
                  size={isAccessibilityModeEnabled ? 24 : 20}
                />
                <Text style={[styles.phraseText, isAccessibilityModeEnabled && styles.phraseTextAccessible]}>{phrase}</Text>
              </TouchableOpacity>
              {isEditMode ? (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    accessibilityLabel="Move quick phrase up"
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    disabled={index === 0}
                    onPress={() => onMovePhrase(selectedEnvironment.id, index, "up")}
                    style={[styles.movePhraseButton, index === 0 && styles.disabled]}
                  >
                    <Ionicons color={colors.primaryDark} name="chevron-up" size={17} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Move quick phrase down"
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    disabled={index === selectedEnvironment.phrases.length - 1}
                    onPress={() => onMovePhrase(selectedEnvironment.id, index, "down")}
                    style={[
                      styles.movePhraseButton,
                      index === selectedEnvironment.phrases.length - 1 && styles.disabled
                    ]}
                  >
                    <Ionicons color={colors.primaryDark} name="chevron-down" size={17} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Delete quick phrase"
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    onPress={() => onDeletePhrase(selectedEnvironment.id, index)}
                    style={styles.deletePhraseButton}
                  >
                    <Ionicons color={colors.danger} name="close" size={18} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.editorGroup}>
        <View style={styles.editorRow}>
          <TextInput
            onChangeText={setEnvironmentDraft}
            onSubmitEditing={handleAddEnvironment}
            placeholder="New environment"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={[styles.input, isAccessibilityModeEnabled && styles.inputAccessible]}
            value={environmentDraft}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: environmentDraft.trim().length === 0 }}
            activeOpacity={0.85}
            disabled={environmentDraft.trim().length === 0}
            onPress={handleAddEnvironment}
            style={[styles.addButton, environmentDraft.trim().length === 0 && styles.disabled]}
          >
            <Ionicons color={colors.surface} name="add" size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.editorRow}>
          <TextInput
            onChangeText={setPhraseDraft}
            onSubmitEditing={handleAddPhrase}
            placeholder={`Add phrase for ${selectedEnvironment?.name ?? "environment"}`}
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={[styles.input, isAccessibilityModeEnabled && styles.inputAccessible]}
            value={phraseDraft}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: phraseDraft.trim().length === 0 || !selectedEnvironment }}
            activeOpacity={0.85}
            disabled={phraseDraft.trim().length === 0 || !selectedEnvironment}
            onPress={handleAddPhrase}
            style={[styles.addButton, (phraseDraft.trim().length === 0 || !selectedEnvironment) && styles.disabled]}
          >
            <Ionicons color={colors.surface} name="add" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.ttsBar, isAccessibilityModeEnabled && styles.ttsBarAccessible]}>
        <View style={styles.ttsCopy}>
          <Text style={[styles.ttsTitle, isAccessibilityModeEnabled && styles.ttsTitleAccessible]}>Type to speak</Text>
          <Text style={[styles.ttsHint, isAccessibilityModeEnabled && styles.ttsHintAccessible]}>
            Short replies like yes, no, ok, or one-off messages.
          </Text>
        </View>
        <View style={styles.editorRow}>
          <TextInput
            onChangeText={setCustomTextDraft}
            onSubmitEditing={handleSpeakCustomText}
            placeholder="Type a message"
            placeholderTextColor={colors.muted}
            returnKeyType="send"
            style={[styles.input, styles.ttsInput, isAccessibilityModeEnabled && styles.inputAccessible]}
            value={customTextDraft}
          />
          <TouchableOpacity
            accessibilityLabel="Speak typed message"
            accessibilityRole="button"
            accessibilityState={{ disabled: customTextDraft.trim().length === 0 }}
            activeOpacity={0.85}
            disabled={customTextDraft.trim().length === 0}
            onPress={handleSpeakCustomText}
            style={[styles.speakButton, customTextDraft.trim().length === 0 && styles.disabled]}
          >
            <Ionicons color={colors.surface} name="volume-high" size={21} />
          </TouchableOpacity>
        </View>
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
  containerAccessible: {
    backgroundColor: colors.cameraDark,
    borderColor: colors.surface
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  headerCopy: {
    flex: 1,
    gap: 3
  },
  editButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.sm
  },
  editButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  editButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  editButtonTextActive: {
    color: colors.surface
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  titleAccessible: {
    color: colors.surface,
    fontSize: 26
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  subtitleAccessible: {
    color: "#DCEAF0",
    fontSize: 17,
    lineHeight: 24
  },
  environmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  environmentButton: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center"
  },
  environmentButtonAccessible: {
    minHeight: 58,
    paddingHorizontal: spacing.lg
  },
  environmentButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  environmentButtonSelectedAccessible: {
    backgroundColor: colors.surface,
    borderColor: colors.surface
  },
  environmentText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900"
  },
  environmentTextSelected: {
    color: colors.surface
  },
  environmentTextAccessible: {
    color: colors.cameraDark,
    fontSize: 18
  },
  phraseList: {
    gap: spacing.sm
  },
  environmentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  sectionTitleAccessible: {
    color: colors.surface,
    fontSize: 22
  },
  deleteEnvironmentButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 42
  },
  phraseRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.sm
  },
  phraseButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  phraseButtonAccessible: {
    backgroundColor: colors.surface,
    minHeight: 72
  },
  phraseText: {
    color: colors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23
  },
  phraseTextAccessible: {
    color: colors.cameraDark,
    fontSize: 21,
    lineHeight: 28
  },
  editActions: {
    gap: spacing.xs,
    width: 46
  },
  movePhraseButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 46
  },
  deletePhraseButton: {
    alignItems: "center",
    backgroundColor: "#FDEDEC",
    borderColor: "#F7C7C2",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    width: 46
  },
  editorGroup: {
    gap: spacing.sm
  },
  editorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  ttsBar: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  ttsBarAccessible: {
    backgroundColor: colors.surface,
    borderColor: colors.surface
  },
  ttsCopy: {
    gap: 2
  },
  ttsTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  ttsTitleAccessible: {
    color: colors.cameraDark,
    fontSize: 21
  },
  ttsHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  ttsHintAccessible: {
    color: colors.primaryDark,
    fontSize: 15,
    lineHeight: 21
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  ttsInput: {
    backgroundColor: colors.surface
  },
  inputAccessible: {
    backgroundColor: colors.surface,
    color: colors.cameraDark,
    fontSize: 19,
    minHeight: 58
  },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 52
  },
  speakButton: {
    alignItems: "center",
    backgroundColor: colors.success,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 54
  },
  disabled: {
    opacity: 0.45
  }
});
