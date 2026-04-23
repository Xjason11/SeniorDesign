import { Ionicons } from "@expo/vector-icons";
import { RefObject } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Camera, CameraRef } from "react-native-vision-camera";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type CameraPanelProps = {
  cameraRef: RefObject<CameraRef | null>;
  facing: "front" | "back";
  hasPermission: boolean;
  isPermissionReady: boolean;
  isDeviceReady: boolean;
  onFlipCamera: () => void;
  onRequestPermission: () => void;
};

export function CameraPanel({
  cameraRef,
  facing,
  hasPermission,
  isPermissionReady,
  isDeviceReady,
  onFlipCamera,
  onRequestPermission
}: CameraPanelProps) {
  if (!isPermissionReady) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.cameraText}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.cameraText}>Camera access is needed for the sign recognition preview.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={onRequestPermission} activeOpacity={0.85}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isDeviceReady) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.cameraText}>Loading the native camera preview...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera device={facing} enableLowLightBoost isActive ref={cameraRef} resizeMode="cover" style={styles.camera} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{facing === "front" ? "Front" : "Back"} camera preview</Text>
      </View>
      <TouchableOpacity
        accessibilityLabel="Flip camera"
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={onFlipCamera}
        style={styles.flipButton}
      >
        <Ionicons color={colors.surface} name="camera-reverse" size={22} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.cameraDark,
    borderRadius: 8,
    overflow: "hidden"
  },
  camera: {
    flex: 1
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg
  },
  cameraText: {
    color: colors.surface,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center"
  },
  permissionButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  permissionButtonText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "700"
  },
  badge: {
    backgroundColor: "rgba(16, 24, 32, 0.72)",
    borderRadius: 8,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute",
    top: spacing.sm
  },
  badgeText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "700"
  },
  flipButton: {
    alignItems: "center",
    backgroundColor: "rgba(16, 24, 32, 0.72)",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    width: 44
  }
});
