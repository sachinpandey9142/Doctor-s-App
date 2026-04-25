import React from "react";
import { StyleSheet, View } from "react-native";
import { BadgeCheck } from "lucide-react-native";
import { useTheme } from "styled-components/native";

interface VerifiedBadgeProps {
  size?: number;
}

export function VerifiedBadge({ size = 16 }: VerifiedBadgeProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <BadgeCheck color={theme.colors.primary} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 4
  }
});
