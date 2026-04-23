import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { RecognizedSign } from "../types/sign";

type LiveDebugStripProps = {
  latestSign?: RecognizedSign;
};

export function LiveDebugStrip({ latestSign }: LiveDebugStripProps) {
  const detailItems = latestSign
    ? [
        `Token ${latestSign.label}`,
        `Confidence ${Math.round(latestSign.confidence * 100)}%`,
        latestSign.mode ? `Mode ${latestSign.mode}` : undefined,
        latestSign.handDetected
          ? latestSign.mode === "sequence"
            ? `Tracked frames ${latestSign.landmarkCount ?? 0}`
            : `Landmarks ${latestSign.landmarkCount ?? 0}`
          : "Tracking none",
        latestSign.singleFrameToken && latestSign.singleFrameConfidence !== undefined
          ? `Single ${latestSign.singleFrameToken} ${Math.round(latestSign.singleFrameConfidence * 100)}%`
          : undefined,
        latestSign.sequenceToken && latestSign.sequenceConfidence !== undefined
          ? `Sequence ${latestSign.sequenceToken} ${Math.round(latestSign.sequenceConfidence * 100)}%`
          : undefined,
        latestSign.latencyMs !== undefined ? `Round-trip ${latestSign.latencyMs} ms` : undefined
      ].filter(Boolean)
    : ["Waiting for a model result"];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live debug</Text>
      <View style={styles.row}>
        {detailItems.map((item) => (
          <View key={item} style={styles.pill}>
            <Text style={styles.pillText}>{item}</Text>
          </View>
        ))}
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
    gap: spacing.sm,
    padding: spacing.md
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  pill: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  pillText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700"
  }
});
