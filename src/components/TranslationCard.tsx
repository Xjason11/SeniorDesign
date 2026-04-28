import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { RecognizedSign, SignToken } from "../types/sign";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type TranslationCardProps = {
  editableText: string;
  tokens: SignToken[];
  latestSign?: RecognizedSign;
  onChangeEditableText: (text: string) => void;
  onSelectVariant: (text: string) => void;
  phraseVariants: string[];
  translatedText: string;
};

export function TranslationCard({
  editableText,
  tokens,
  latestSign,
  onChangeEditableText,
  onSelectVariant,
  phraseVariants,
  translatedText
}: TranslationCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Translated text</Text>
        {latestSign ? (
          <Text style={styles.confidence}>{Math.round(latestSign.confidence * 100)}% confidence</Text>
        ) : null}
      </View>

      <Text style={[styles.translation, !translatedText && styles.placeholder]}>
        {translatedText || "Capture a sign or turn on Live recognition to begin."}
      </Text>

      <View style={styles.composer}>
        <View style={styles.composerHeader}>
          <Text style={styles.composerLabel}>Message to speak</Text>
          <Ionicons color={colors.primaryDark} name="create-outline" size={18} />
        </View>
        <TextInput
          multiline
          onChangeText={onChangeEditableText}
          placeholder="Edit the translated message"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={editableText}
        />
      </View>

      {phraseVariants.length > 0 ? (
        <View style={styles.variantGroup}>
          <Text style={styles.variantLabel}>Alternatives</Text>
          {phraseVariants.map((variant) => (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              key={variant}
              onPress={() => onSelectVariant(variant)}
              style={styles.variantButton}
            >
              <Text style={styles.variantText}>{variant}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.tokenWrap}>
        {tokens.length === 0 ? (
          <Text style={styles.tokenHint}>No signs detected yet</Text>
        ) : (
          tokens.map((token, index) => (
            <View key={`${token}-${index}`} style={styles.tokenPill}>
              <Text style={styles.tokenText}>{token.replace("_", " ")}</Text>
            </View>
          ))
        )}
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
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  confidence: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "700"
  },
  translation: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34
  },
  placeholder: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: "700"
  },
  composer: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  composerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  composerLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 26,
    minHeight: 88,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  variantGroup: {
    gap: spacing.sm
  },
  variantLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  variantButton: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  variantText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21
  },
  tokenWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  tokenPill: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  tokenText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  tokenHint: {
    color: colors.muted,
    fontSize: 14
  }
});
