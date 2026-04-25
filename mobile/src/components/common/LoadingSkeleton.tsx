import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface LoadingSkeletonProps {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
}

export function LoadingSkeleton({ height = 14, width = "100%", borderRadius = 10 }: LoadingSkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 950,
        easing: Easing.linear
      }),
      -1,
      false
    );
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-280, 280])
      }
    ]
  }));

  return (
    <View
      style={[
        styles.container,
        {
          height,
          width,
          borderRadius
        }
      ]}
    >
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <LinearGradient
          colors={[
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.85)",
            "rgba(255,255,255,0)"
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E2E8F0",
    overflow: "hidden"
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: 160
  },
  gradient: {
    flex: 1
  }
});
