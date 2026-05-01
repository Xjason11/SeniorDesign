import { Ionicons } from "@expo/vector-icons";
import { RefObject } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Camera, CameraDevice, CameraRef } from "react-native-vision-camera";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { LandmarkPoint } from "../types/sign";

const visibleLandmarkIndexes = new Set([0, 2, 5, 8, 9, 12, 13, 16, 17, 20]);

type CameraPanelProps = {
  cameraRef: RefObject<CameraRef | null>;
  device?: CameraDevice;
  facing: "front" | "back";
  hasPermission: boolean;
  isPermissionReady: boolean;
  isDeviceReady: boolean;
  landmarkPoints?: LandmarkPoint[];
  onFlipCamera: () => void;
  onRequestPermission: () => void;
};

export function CameraPanel({
  cameraRef,
  device,
  facing,
  hasPermission,
  isPermissionReady,
  isDeviceReady,
  landmarkPoints = [],
  onFlipCamera,
  onRequestPermission
}: CameraPanelProps) {
  const visibleLandmarkPoints = landmarkPoints.filter((point) =>
    visibleLandmarkIndexes.has(point.index ?? 0)
  );

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

  if (!isDeviceReady || !device) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.cameraText}>Loading the native camera preview...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera device={device} enableLowLightBoost isActive ref={cameraRef} resizeMode="cover" style={styles.camera} />
      {visibleLandmarkPoints.length > 0 ? (
        <View pointerEvents="none" style={styles.landmarkOverlay}>
          {visibleLandmarkPoints.map((point, index) => (
            <View
              key={`${index}-${point.x}-${point.y}`}
              style={[
                styles.landmarkDot,
                point.hand === 1 && styles.secondHandDot,
                {
                  left: `${clamp(point.x * 100, 0, 100)}%`,
                  top: `${clamp(point.y * 100, 0, 100)}%`
                }
              ]}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {facing === "front" ? "Front" : "Back"} camera preview
          {landmarkPoints.length > 0 ? ` - ${landmarkPoints.length} tracked / ${visibleLandmarkPoints.length} shown` : ""}
        </Text>
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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
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
  landmarkOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  landmarkDot: {
    backgroundColor: "#38D979",
    borderColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 5,
    borderWidth: 1,
    height: 9,
    marginLeft: -4.5,
    marginTop: -4.5,
    position: "absolute",
    width: 9
  },
  secondHandDot: {
    backgroundColor: "#54A3FF"
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
