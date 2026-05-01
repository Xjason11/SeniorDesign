import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { ConversationMessage, QuickPhraseEnvironment, RecognizedSign, SignToken } from "../types/sign";

type ConversationCardProps = {
  canUseSignedMessage?: boolean;
  editableSignedText?: string;
  interimTranscript: string;
  isCompact?: boolean;
  isListening: boolean;
  latestSign?: RecognizedSign;
  messages: ConversationMessage[];
  onAddPartnerMessage: (text: string) => void;
  onChangeSignedText?: (text: string) => void;
  onClearConversation: () => void;
  onClearSignedMessage?: () => void;
  onSaveSignedMessage?: () => void;
  onSelectVariant?: (text: string) => void;
  onSpeakSignedMessage?: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onShareConversation: () => void;
  onSelectQuickPhraseEnvironment?: (environmentId: string) => void;
  onSpeakQuickPhrase?: (phrase: string) => void;
  phraseVariants?: string[];
  quickPhraseEnvironments?: QuickPhraseEnvironment[];
  selectedQuickPhraseEnvironmentId?: string;
  speechStatus: string;
  tokens?: SignToken[];
  translatedText?: string;
};

export function ConversationCard({
  canUseSignedMessage = false,
  editableSignedText = "",
  interimTranscript,
  isCompact = false,
  isListening,
  latestSign,
  messages,
  onAddPartnerMessage,
  onChangeSignedText,
  onClearSignedMessage,
  onClearConversation,
  onSaveSignedMessage,
  onSelectVariant,
  onShareConversation,
  onSelectQuickPhraseEnvironment,
  onSpeakQuickPhrase,
  onSpeakSignedMessage,
  onStartListening,
  onStopListening,
  phraseVariants = [],
  quickPhraseEnvironments = [],
  selectedQuickPhraseEnvironmentId,
  speechStatus,
  tokens = [],
  translatedText = ""
}: ConversationCardProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<TextInput>(null);
  const selectedQuickPhraseEnvironment =
    quickPhraseEnvironments.find((environment) => environment.id === selectedQuickPhraseEnvironmentId) ??
    quickPhraseEnvironments[0];

  function handleSend() {
    const text = draft.trim();
    if (!text) {
      return;
    }

    onAddPartnerMessage(text);
    setDraft("");
  }

  function handleListenPress() {
    onStartListening();
    inputRef.current?.focus();
  }

  return (
    <View style={[styles.container, isCompact && styles.compactContainer]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Conversation</Text>
          <Text style={styles.subtle}>{messages.length} messages</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityLabel="Share conversation transcript"
            accessibilityRole="button"
            accessibilityState={{ disabled: messages.length === 0 }}
            activeOpacity={0.85}
            disabled={messages.length === 0}
            onPress={onShareConversation}
            style={[styles.iconButton, messages.length === 0 && styles.disabled]}
          >
            <Ionicons color={colors.primaryDark} name="share-outline" size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Clear conversation"
            accessibilityRole="button"
            accessibilityState={{ disabled: messages.length === 0 }}
            activeOpacity={0.85}
            disabled={messages.length === 0}
            onPress={onClearConversation}
            style={[styles.iconButton, messages.length === 0 && styles.disabled]}
          >
            <Ionicons color={colors.primaryDark} name="trash-outline" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.messagesShell, isCompact && styles.compactMessages]}>
        <ScrollView
          contentContainerStyle={styles.messages}
          nestedScrollEnabled
          showsVerticalScrollIndicator={messages.length > 4}
        >
          {messages.length === 0 ? (
            <Text style={styles.empty}>Signed and spoken replies will appear here.</Text>
          ) : (
            messages.slice(isCompact ? -4 : -10).reverse().map((message) => {
              const isSigner = message.speaker === "signer";
              return (
                <View key={message.id} style={[styles.message, isSigner ? styles.signerMessage : styles.partnerMessage]}>
                  <Text style={[styles.speaker, isSigner ? styles.signerSpeaker : styles.partnerSpeaker]}>
                    {isSigner ? "Signed" : "Partner"}
                  </Text>
                  <Text style={styles.messageText}>{message.text}</Text>
                  {message.confidence !== undefined ? (
                    <Text style={styles.meta}>{Math.round(message.confidence * 100)}% confidence</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {!isCompact ? (
        <View style={styles.signedComposer}>
          <View style={styles.signedComposerHeader}>
            <View>
              <Text style={styles.sectionLabel}>Signed message</Text>
              {latestSign ? (
                <Text style={styles.subtle}>{latestSign.label} candidate - {Math.round(latestSign.confidence * 100)}%</Text>
              ) : (
                <Text style={styles.subtle}>Add signs from the camera, then speak the message.</Text>
              )}
            </View>
            <Ionicons color={colors.primaryDark} name="hand-left-outline" size={20} />
          </View>

          <Text style={[styles.translationPreview, !translatedText && styles.translationPlaceholder]}>
            {translatedText || "No signed words selected yet."}
          </Text>

          <TextInput
            multiline
            onChangeText={onChangeSignedText}
            placeholder="Edit signed message before speaking"
            placeholderTextColor={colors.muted}
            style={styles.signedInput}
            value={editableSignedText}
          />

          {phraseVariants.length > 0 ? (
            <View style={styles.variantRow}>
              {phraseVariants.map((variant) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.85}
                  key={variant}
                  onPress={() => onSelectVariant?.(variant)}
                  style={styles.variantButton}
                >
                  <Text style={styles.variantText}>{variant}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.tokenWrap}>
            {tokens.length === 0 ? (
              <Text style={styles.tokenHint}>Selected signs will appear here</Text>
            ) : (
              tokens.map((token, index) => (
                <View key={`${token}-${index}`} style={styles.tokenPill}>
                  <Text style={styles.tokenText}>{token.replace("_", " ")}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.signedActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !canUseSignedMessage }}
              activeOpacity={0.85}
              disabled={!canUseSignedMessage}
              onPress={onSpeakSignedMessage}
              style={[styles.signedActionPrimary, !canUseSignedMessage && styles.disabled]}
            >
              <Ionicons color={colors.surface} name="volume-high" size={18} />
              <Text style={styles.signedActionPrimaryText}>Speak</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !canUseSignedMessage }}
              activeOpacity={0.85}
              disabled={!canUseSignedMessage}
              onPress={onSaveSignedMessage}
              style={[styles.signedAction, !canUseSignedMessage && styles.disabled]}
            >
              <Ionicons color={colors.primaryDark} name="bookmark-outline" size={18} />
              <Text style={styles.signedActionText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !canUseSignedMessage }}
              activeOpacity={0.85}
              disabled={!canUseSignedMessage}
              onPress={onClearSignedMessage}
              style={[styles.signedAction, !canUseSignedMessage && styles.disabled]}
            >
              <Ionicons color={colors.primaryDark} name="trash-outline" size={18} />
              <Text style={styles.signedActionText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {!isCompact && selectedQuickPhraseEnvironment ? (
        <View style={styles.quickPhrasePanel}>
          <View style={styles.quickPhraseHeader}>
            <View>
              <Text style={styles.sectionLabel}>Quick phrases</Text>
              <Text style={styles.subtle}>Tap to speak and add to the transcript.</Text>
            </View>
            <Ionicons color={colors.primaryDark} name="flash-outline" size={20} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.quickEnvironmentRow}>
              {quickPhraseEnvironments.map((environment) => {
                const isSelected = environment.id === selectedQuickPhraseEnvironment.id;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    key={environment.id}
                    onPress={() => onSelectQuickPhraseEnvironment?.(environment.id)}
                    style={[styles.quickEnvironmentButton, isSelected && styles.quickEnvironmentButtonSelected]}
                  >
                    <Text style={[styles.quickEnvironmentText, isSelected && styles.quickEnvironmentTextSelected]}>
                      {environment.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.quickPhraseGrid}>
            {selectedQuickPhraseEnvironment.phrases.slice(0, 6).map((phrase) => (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.85}
                key={phrase}
                onPress={() => onSpeakQuickPhrase?.(phrase)}
                style={styles.quickPhraseButton}
              >
                <Ionicons color={colors.primaryDark} name="volume-high" size={17} />
                <Text style={styles.quickPhraseText}>{phrase}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TouchableOpacity
          accessibilityLabel={isListening ? "Stop listening" : "Listen to partner speech"}
          accessibilityRole="button"
          activeOpacity={0.85}
          onPress={isListening ? onStopListening : handleListenPress}
          style={[styles.listenButton, isListening && styles.listenButtonActive]}
        >
          <Ionicons color={isListening ? colors.surface : colors.primaryDark} name={isListening ? "stop" : "mic"} size={18} />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          onChangeText={setDraft}
          onSubmitEditing={handleSend}
          placeholder="Type or dictate partner reply"
          placeholderTextColor={colors.muted}
          returnKeyType="send"
          style={styles.input}
          value={draft}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: draft.trim().length === 0 }}
          activeOpacity={0.85}
          disabled={draft.trim().length === 0}
          onPress={handleSend}
          style={[styles.sendButton, draft.trim().length === 0 && styles.disabled]}
        >
          <Ionicons color={colors.surface} name="send" size={18} />
        </TouchableOpacity>
      </View>

      <View style={[styles.listenStatus, isListening && styles.listenStatusActive]}>
        <Ionicons color={isListening ? colors.success : colors.muted} name={isListening ? "radio" : "mic-outline"} size={16} />
        <View style={styles.listenCopy}>
          <Text style={[styles.listenStatusText, isListening && styles.listenStatusTextActive]}>{speechStatus}</Text>
          {interimTranscript ? <Text style={styles.interimText}>{interimTranscript}</Text> : null}
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
  compactContainer: {
    borderColor: "#C9DFF7",
    gap: spacing.sm
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  subtle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
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
    height: 40,
    justifyContent: "center",
    width: 44
  },
  messagesShell: {
    maxHeight: 300,
    minHeight: 96
  },
  compactMessages: {
    maxHeight: 220
  },
  messages: {
    gap: spacing.sm,
    paddingBottom: 2
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21
  },
  message: {
    borderRadius: 8,
    gap: 4,
    padding: spacing.sm
  },
  signerMessage: {
    backgroundColor: colors.surfaceSoft
  },
  partnerMessage: {
    backgroundColor: "#FFF6E8"
  },
  speaker: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  signerSpeaker: {
    color: colors.primaryDark
  },
  partnerSpeaker: {
    color: colors.accent
  },
  messageText: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 25
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  signedComposer: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  signedComposerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  translationPreview: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 29
  },
  translationPlaceholder: {
    color: colors.muted,
    fontSize: 18
  },
  signedInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
    minHeight: 82,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  variantRow: {
    gap: spacing.xs
  },
  variantButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  variantText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
  },
  tokenWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  tokenPill: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  tokenText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  tokenHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  signedActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  signedActionPrimary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.sm
  },
  signedAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.sm
  },
  signedActionPrimaryText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  signedActionText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900"
  },
  quickPhrasePanel: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  quickPhraseHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  quickEnvironmentRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.sm
  },
  quickEnvironmentButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  quickEnvironmentButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  quickEnvironmentText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  quickEnvironmentTextSelected: {
    color: colors.surface
  },
  quickPhraseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  quickPhraseButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: "48%"
  },
  quickPhraseText: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  composer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  listenButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 52
  },
  listenButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success
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
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 52
  },
  disabled: {
    opacity: 0.45
  },
  listenStatus: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm
  },
  listenStatusActive: {
    backgroundColor: "#EAF7EF",
    borderColor: "#BFE5D2"
  },
  listenCopy: {
    flex: 1,
    gap: 2
  },
  listenStatusText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  listenStatusTextActive: {
    color: colors.success
  },
  interimText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21
  }
});
