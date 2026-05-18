import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
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

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.colors.cardBorder,
          borderWidth: 1,
          backgroundColor: theme.colors.card,
          ...theme.shadow.card,
        },
        style,
      ]}
    >
      {accent ? (
        <LinearGradient
          colors={theme.gradients.primary}
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
