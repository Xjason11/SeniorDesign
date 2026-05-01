import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function AppHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Senior Design Prototype</Text>
      <Text style={styles.title}>Visionary</Text>
      <Text style={styles.subtitle}>Assistive sign recognition for everyday communication.</Text>
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
