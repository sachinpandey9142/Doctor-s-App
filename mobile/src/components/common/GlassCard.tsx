import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "styled-components/native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Pad the inner content. Default true. Set false for custom-padded cards. */
  padded?: boolean;
}

/**
 * Premium card component.
 * Uses a pure white background with a crisp 1px border and a
 * subtle slate shadow — the "glass" label is kept for compatibility
 * but the blur is removed for Android performance.
 */
export function GlassCard({ children, style, padded = true }: GlassCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        theme.shadow.card,
        { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface },
        style
      ]}
    >
      <View style={padded ? styles.content : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden"
  },
  content: {
    padding: 18
  }
});
