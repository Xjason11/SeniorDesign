import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function AppHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Senior Design Prototype</Text>
      <Text style={styles.title}>ASL Conversation Assistant</Text>
      <Text style={styles.subtitle}>Short everyday interactions with camera-based sign recognition.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    paddingBottom: spacing.sm
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22
  }
});
