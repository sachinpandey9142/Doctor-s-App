import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "styled-components/native";

interface FloatingInputProps extends TextInputProps {
  label: string;
  errorText?: string;
  containerStyle?: ViewStyle;
  /** Icon to show on the left side */
  leftIcon?: React.ReactNode;
}

export function FloatingInput({
  label,
  value,
  errorText,
  containerStyle,
  onFocus,
  onBlur,
  secureTextEntry,
  leftIcon,
  ...rest
}: FloatingInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused || !!value ? 1 : 0, { duration: 180 });
  }, [focused, progress, value]);

  const animatedLabelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -14]) },
      { scale: interpolate(progress.value, [0, 1], [1, 0.83]) }
    ],
    color: interpolateColor(
      progress.value,
      [0, 1],
      [theme.colors.textSecondary, theme.colors.primary]
    )
  }));

  const hasLeftIcon = !!leftIcon;
  const isSecure = secureTextEntry;

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.container,
          {
            borderColor: errorText ? theme.colors.error : focused ? theme.colors.primary : theme.colors.border,
            backgroundColor: theme.colors.surface
          }
        ]}
      >
        {/* Focus accent line at top */}
        {focused ? (
          <LinearGradient
            colors={["#2563EB", "#06B6D4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.focusLine}
            pointerEvents="none"
          />
        ) : null}

        <View style={styles.innerRow}>
          {/* Left icon */}
          {hasLeftIcon ? (
            <View style={[styles.leftIconWrap, { opacity: focused ? 1 : 0.55 }]}>
              {leftIcon}
            </View>
          ) : null}

          <View style={[styles.inputWrap, hasLeftIcon && styles.inputWrapWithIcon]}>
            {/* Floating label */}
            <Animated.Text
              style={[
                styles.label,
                hasLeftIcon && styles.labelWithIcon,
                animatedLabelStyle
              ]}
            >
              {label}
            </Animated.Text>

            <TextInput
              value={value}
              style={[
                styles.input,
                { color: theme.colors.textPrimary },
                hasLeftIcon && styles.inputWithIcon
              ]}
              placeholder=""
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry={isSecure && !secureVisible}
              onFocus={(event) => {
                setFocused(true);
                onFocus?.(event);
              }}
              onBlur={(event) => {
                setFocused(false);
                onBlur?.(event);
              }}
              {...rest}
            />
          </View>

          {/* Secure toggle */}
          {isSecure ? (
            <Pressable onPress={() => setSecureVisible((v) => !v)} style={styles.eyeBtn}>
              {secureVisible
                ? <EyeOff size={17} color={theme.colors.textTertiary} strokeWidth={2} />
                : <Eye size={17} color={theme.colors.textTertiary} strokeWidth={2} />
              }
            </Pressable>
          ) : null}
        </View>
      </View>

      {errorText ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    borderWidth: 1.5,
    borderRadius: 14,
    justifyContent: "center",
    overflow: "hidden"
  },
  focusLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 2.5
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14
  },
  leftIconWrap: {
    marginRight: 10,
    paddingTop: 8
  },
  inputWrap: { flex: 1 },
  inputWrapWithIcon: {},
  label: {
    position: "absolute",
    left: 0,
    top: 20,
    fontFamily: "Manrope_500Medium",
    fontSize: 14
  },
  labelWithIcon: {
    left: 0
  },
  input: {
    marginTop: 18,
    fontFamily: "Manrope_500Medium",
    fontSize: 15.5,
    paddingVertical: 8
  },
  inputWithIcon: {
    marginTop: 18
  },
  eyeBtn: {
    paddingHorizontal: 4,
    paddingTop: 8
  },
  errorText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4
  }
});
