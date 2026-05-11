import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "styled-components/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { AnimatedCounter } from "@/components/common/AnimatedCounter";

interface ProfileStatsCardProps {
  posts: number;
  followers: number;
  following: number;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
}

// Pressable stat cell with spring scale feedback
function StatItem({
  label,
  value,
  delay,
  onPress,
}: {
  label: string;
  value: number;
  delay: number;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const pressScale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    pressScale.value = withSpring(0.92, { damping: 14, stiffness: 320 });
  };
  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 14, stiffness: 280 });
  };

  const content = (
    <Animated.View style={[styles.item, pressStyle]}>
      <AnimatedCounter
        value={value}
        style={[styles.value, { color: theme.colors.textPrimary }]}
        duration={750}
        delay={delay}
      />
      <Text style={[styles.label, { color: theme.colors.textTertiary }]}>
        {label}
      </Text>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ flex: 1 }}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={{ flex: 1 }}>{content}</View>;
}

export const ProfileStatsCard = memo(function ProfileStatsCard({
  posts,
  followers,
  following,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileStatsCardProps) {
  const theme = useTheme();

  const items = useMemo(
    () => [
      { label: "Posts", value: posts, delay: 250 },
      { label: "Followers", value: followers, onPress: onOpenFollowers, delay: 340 },
      { label: "Following", value: following, onPress: onOpenFollowing, delay: 420 },
    ],
    [followers, following, onOpenFollowers, onOpenFollowing, posts],
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderLight,
        },
      ]}
    >
      <View style={styles.row}>
        {items.map((item, index) => (
          <React.Fragment key={item.label}>
            <StatItem
              label={item.label}
              value={item.value}
              delay={item.delay}
              onPress={item.onPress}
            />
            {index < items.length - 1 ? (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.borderLight },
                ]}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: 0,
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  item: {
    flex: 1,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  divider: {
    width: 1,
    alignSelf: "center",
    height: "45%",
    opacity: 0.6,
  },
  value: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  label: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
