import { StyleSheet, Text, View } from "react-native";
import { RecognizedSign, SignToken } from "../types/sign";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type TranslationCardProps = {
  tokens: SignToken[];
  latestSign?: RecognizedSign;
  translatedText: string;
};

export function TranslationCard({ tokens, latestSign, translatedText }: TranslationCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Translated text</Text>
        {latestSign ? (
          <Text style={styles.confidence}>{Math.round(latestSign.confidence * 100)}% confidence</Text>
        ) : null}
      </View>

      <Text style={[styles.translation, !translatedText && styles.placeholder]}>
        {translatedText || "Use demo mode or tap a sign token to begin."}
      </Text>

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
