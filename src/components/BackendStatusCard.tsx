import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BackendStatus } from "../services/modelSignRecognition";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type BackendStatusCardProps = {
  isChecking: boolean;
  status?: BackendStatus;
  onRefresh: () => void;
};

export function BackendStatusCard({ isChecking, status, onRefresh }: BackendStatusCardProps) {
  const isConnected = status?.isConnected === true;
  const modelReady = status?.modelLoaded === true && status.sequenceModelLoaded === true;
  const title = isChecking ? "Checking backend" : isConnected ? "Backend connected" : "Backend unavailable";
  const detail = isConnected
    ? modelReady
      ? "Single-frame and sequence models are loaded."
      : "Backend is reachable, but one model is not loaded."
    : "Camera recognition needs the local backend running.";

  return (
    <View style={[styles.container, isConnected ? styles.connected : styles.disconnected]}>
      <View style={styles.statusIcon}>
        <Ionicons
          color={isConnected ? colors.success : colors.danger}
          name={isConnected ? "checkmark-circle" : "warning"}
          size={22}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <TouchableOpacity
        accessibilityLabel="Refresh backend status"
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={onRefresh}
        style={styles.refreshButton}
      >
        <Ionicons color={colors.primaryDark} name={isChecking ? "hourglass" : "refresh"} size={18} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 68,
    padding: spacing.md
  },
  connected: {
    borderColor: "#BFE5D2"
  },
  disconnected: {
    borderColor: "#F7C7C2"
  },
  statusIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  copy: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  detail: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 44
  }
});
