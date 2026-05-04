import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  style?: ViewStyle;
  /** Accent color for the icon circle. Defaults to primaryLight. */
  accentColor?: string;
}

/**
 * Reusable animated empty state component.
 * The icon floats up/down gently on a loop to draw soft attention.
 */
export function EmptyState({ icon, title, body, ctaLabel, onCta, style, accentColor }: EmptyStateProps) {
  const theme = useTheme();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);

  useEffect(() => {
    // Entrance: fade + scale up
    opacity.value = withDelay(80, withTiming(1, { duration: 420 }));
    scale.value = withDelay(80, withSpring(1, { damping: 14, stiffness: 160 }));

    // Float loop
    translateY.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, [opacity, scale, translateY]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View style={[styles.container, containerStyle, style]}>
      {/* Floating icon circle with glow */}
      <Animated.View style={iconStyle}>
        <LinearGradient
          colors={accentColor ? [accentColor, accentColor] : ["#EFF6FF", "#DBEAFE"]}
          style={[
            styles.iconCircle,
            {
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              elevation: 6
            }
          ]}
        >
          {icon}
        </LinearGradient>
      </Animated.View>

      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{body}</Text>

      {ctaLabel && onCta ? (
        <Pressable
          onPress={onCta}
          style={({ pressed }) => [
            styles.cta,
            { opacity: pressed ? 0.82 : 1 }
          ]}
        >
          <LinearGradient
            colors={["#2563EB", "#06B6D4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGrad}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 21,
    textAlign: "center",
    letterSpacing: -0.3
  },
  body: {
    marginTop: 10,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center"
  },
  cta: {
    marginTop: 22,
    borderRadius: 14,
    overflow: "hidden"
  },
  ctaGrad: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  ctaText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.2
  }
});
