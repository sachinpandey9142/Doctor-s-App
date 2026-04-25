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
          withTiming(-6, { duration: 1800 }),
          withTiming(0, { duration: 1800 })
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
      {/* Floating icon circle */}
      <Animated.View
        style={[
          styles.iconCircle,
          {
            backgroundColor: accentColor ?? theme.colors.primaryLight,
            // Soft glow ring
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4
          },
          iconStyle
        ]}
      >
        {icon}
      </Animated.View>

      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{body}</Text>

      {ctaLabel && onCta ? (
        <Pressable
          onPress={onCta}
          style={[styles.cta, { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primaryMid }]}
        >
          <Text style={[styles.ctaText, { color: theme.colors.primary }]}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 32
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    textAlign: "center"
  },
  body: {
    marginTop: 8,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center"
  },
  cta: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1
  },
  ctaText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    letterSpacing: 0.2
  }
});
