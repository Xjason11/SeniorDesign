import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { ConversationMessage } from "../types/sign";

type ConversationCardProps = {
  messages: ConversationMessage[];
  onAddPartnerMessage: (text: string) => void;
  onClearConversation: () => void;
};

export function ConversationCard({ messages, onAddPartnerMessage, onClearConversation }: ConversationCardProps) {
  const [draft, setDraft] = useState("");

  function handleSend() {
    const text = draft.trim();
    if (!text) {
      return;
    }

    onAddPartnerMessage(text);
    setDraft("");
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Conversation</Text>
          <Text style={styles.subtle}>{messages.length} messages</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: messages.length === 0 }}
          activeOpacity={0.85}
          disabled={messages.length === 0}
          onPress={onClearConversation}
          style={[styles.clearButton, messages.length === 0 && styles.disabled]}
        >
          <Ionicons color={colors.primaryDark} name="trash-outline" size={18} />
        </TouchableOpacity>
      </View>

      <View style={styles.messages}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>Recognized signs and partner replies will appear here.</Text>
        ) : (
          messages.slice(-8).map((message) => {
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
        <TextInput
          onChangeText={setDraft}
          onSubmitEditing={handleSend}
          placeholder="Type partner reply"
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
  clearButton: {
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
  }
});
