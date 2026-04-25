import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useTheme } from "styled-components/native";

interface FloatingInputProps extends TextInputProps {
  label: string;
  errorText?: string;
  containerStyle?: ViewStyle;
}

export function FloatingInput({
  label,
  value,
  errorText,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: FloatingInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused || !!value ? 1 : 0, {
      duration: 180
    });
  }, [focused, progress, value]);

  const animatedLabelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [0, -14])
      },
      {
        scale: interpolate(progress.value, [0, 1], [1, 0.86])
      }
    ]
  }));

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.container,
          {
            borderColor: focused ? theme.colors.primary : theme.colors.border
          }
        ]}
      >
        <Animated.Text
          style={[
            styles.label,
            { color: focused ? theme.colors.primary : theme.colors.textSecondary },
            animatedLabelStyle
          ]}
        >
          {label}
        </Animated.Text>

        <TextInput
          value={value}
          style={[styles.input, { color: theme.colors.textPrimary }]}
          placeholder=""
          placeholderTextColor={theme.colors.textSecondary}
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

      {errorText ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: "center"
  },
  label: {
    position: "absolute",
    left: 14,
    top: 18,
    fontFamily: "Manrope_500Medium",
    fontSize: 14
  },
  input: {
    marginTop: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    paddingVertical: 8
  },
  errorText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4
  }
});
