import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { SavedPhrase } from "../types/sign";

type SavedPhrasesProps = {
  phrases: SavedPhrase[];
};

export function SavedPhrases({ phrases }: SavedPhrasesProps) {
  if (phrases.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved phrases</Text>
      {phrases.map((phrase) => (
        <View key={phrase.id} style={styles.phraseRow}>
          <Text style={styles.phraseText}>{phrase.text}</Text>
          <Text style={styles.timeText}>
            {phrase.createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  phraseRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  phraseText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700"
  },
  timeText: {
    color: colors.muted,
    fontSize: 13
  }
});
