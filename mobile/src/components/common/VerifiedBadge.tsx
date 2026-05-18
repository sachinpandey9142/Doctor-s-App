import React from "react";
import { StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";

interface VerifiedBadgeProps {
  size?: number;
}

export function VerifiedBadge({ size = 16 }: VerifiedBadgeProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, shadowColor: theme.shadow.floating.shadowColor }]}>
      <LinearGradient
        colors={theme.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: size / 2 }]}
      >
        <Check color={theme.colors.textInverted} size={size * 0.65} strokeWidth={3} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});
