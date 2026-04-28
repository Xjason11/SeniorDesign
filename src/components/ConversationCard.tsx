import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { ConversationMessage } from "../types/sign";

type ConversationCardProps = {
  interimTranscript: string;
  isCompact?: boolean;
  isListening: boolean;
  messages: ConversationMessage[];
  onAddPartnerMessage: (text: string) => void;
  onClearConversation: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onShareConversation: () => void;
  speechStatus: string;
};

export function ConversationCard({
  interimTranscript,
  isCompact = false,
  isListening,
  messages,
  onAddPartnerMessage,
  onClearConversation,
  onShareConversation,
  onStartListening,
  onStopListening,
  speechStatus
}: ConversationCardProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<TextInput>(null);

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

      <View style={[styles.messages, isCompact && styles.compactMessages]}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>Partner replies and signed messages appear here while you stay on camera.</Text>
        ) : (
          messages.slice(isCompact ? -4 : -8).map((message) => {
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
      </View>

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
  messages: {
    gap: spacing.sm
  },
  compactMessages: {
    maxHeight: 260
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
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
