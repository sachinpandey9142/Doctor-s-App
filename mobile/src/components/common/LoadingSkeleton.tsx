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
import { useTheme } from "styled-components/native";

interface LoadingSkeletonProps {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
}

export function LoadingSkeleton({ height = 14, width = "100%", borderRadius = 10 }: LoadingSkeletonProps) {
  const theme = useTheme();
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

  const isDark = theme.colors.background !== "#F8FAFC";
  const shimmerColors = isDark
    ? ["rgba(255,255,255,0)", "rgba(255,255,255,0.06)", "rgba(255,255,255,0)"]
    : ["rgba(255,255,255,0)", "rgba(255,255,255,0.85)", "rgba(255,255,255,0)"];

  return (
    <View
      style={[
        styles.container,
        {
          height,
          width,
          borderRadius,
          backgroundColor: theme.colors.borderLight,
        }
      ]}
    >
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <LinearGradient
          colors={shimmerColors as [string, string, string]}
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
    overflow: "hidden",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: 160
  },
  gradient: {
    flex: 1
  }
});
