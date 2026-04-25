import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";

import { hapticMedium, hapticTap } from "@/utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  /** Override icon to show before label */
  icon?: React.ReactNode;
}

export function AnimatedButton({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  icon
}: AnimatedButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
  };

  const isDisabled = disabled || loading;

  // ── Primary: gradient fill ──────────────────────────────────────────────────
  if (variant === "primary") {
    return (
      <AnimatedPressable
        onPress={() => { hapticMedium(); onPress(); }}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, style]}
      >
        <LinearGradient
          colors={theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, theme.shadow.floating, isDisabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              {icon}
              <Text style={styles.primaryLabel}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // ── Secondary: solid light-blue surface ────────────────────────────────────
  if (variant === "secondary") {
    return (
      <AnimatedPressable
        onPress={() => { hapticTap(); onPress(); }}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, style]}
      >
        <Animated.View
          style={[
            styles.base,
            { backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primaryMid },
            isDisabled && styles.disabled
          ]}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <>
              {icon}
              <Text style={[styles.secondaryLabel, { color: theme.colors.primary }]}>{title}</Text>
            </>
          )}
        </Animated.View>
      </AnimatedPressable>
    );
  }

  // ── Danger: red surface ─────────────────────────────────────────────────────
  if (variant === "danger") {
    return (
      <AnimatedPressable
        onPress={() => { hapticTap(); onPress(); }}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, style]}
      >
        <Animated.View
          style={[
            styles.base,
            { backgroundColor: theme.colors.errorLight, borderWidth: 1, borderColor: "#FCA5A5" },
            isDisabled && styles.disabled
          ]}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.error} />
          ) : (
            <>
              {icon}
              <Text style={[styles.secondaryLabel, { color: theme.colors.error }]}>{title}</Text>
            </>
          )}
        </Animated.View>
      </AnimatedPressable>
    );
  }

  // ── Ghost: transparent with border ─────────────────────────────────────────
  return (
    <AnimatedPressable
      onPress={() => { hapticTap(); onPress(); }}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
    >
      <Animated.View
        style={[
          styles.base,
          { backgroundColor: "transparent", borderWidth: 1, borderColor: theme.colors.border },
          isDisabled && styles.disabled
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            {icon}
            <Text style={[styles.ghostLabel, { color: theme.colors.textSecondary }]}>{title}</Text>
          </>
        )}
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    letterSpacing: 0.3
  },
  secondaryLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    letterSpacing: 0.2
  },
  ghostLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    letterSpacing: 0.2
  },
  disabled: {
    opacity: 0.5
  }
});
