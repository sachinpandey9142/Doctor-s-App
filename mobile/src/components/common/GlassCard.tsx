import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Pad the inner content. Default true. Set false for custom-padded cards. */
  padded?: boolean;
  /** Apply a subtle top-edge gradient accent line. Defaults to false. */
  accent?: boolean;
}

export function GlassCard({ children, style, padded = true, accent = false }: GlassCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.colors.cardBorder,
          backgroundColor: theme.colors.surface,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3
        },
        style
      ]}
    >
      {accent ? (
        <LinearGradient
          colors={["#2563EB", "#06B6D4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentLine}
        />
      ) : null}
      <View style={padded ? styles.content : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden"
  },
  accentLine: {
    height: 3,
    width: "100%"
  },
  content: {
    padding: 16
  }
});
