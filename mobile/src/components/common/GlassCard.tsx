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

export function GlassCard({
  children,
  style,
  padded = true,
  accent = false,
}: GlassCardProps) {
  const theme = useTheme();
  const isDark = theme.colors.background !== "#F8FAFC";

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.colors.cardBorder,
          borderWidth: isDark ? 1 : 0,
          backgroundColor: theme.colors.surface,
          shadowColor: isDark ? "#000000" : "#0F172A",
          shadowOffset: { width: 0, height: isDark ? 8 : 4 },
          shadowOpacity: isDark ? 0.32 : 0.08,
          shadowRadius: isDark ? 24 : 12,
          elevation: isDark ? 8 : 3,
        },
        style,
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
    borderRadius: 22,
    borderWidth: 0,
    overflow: "hidden",
  },
  accentLine: {
    height: 2,
    width: "100%",
  },
  content: {
    padding: 14,
  },
});
