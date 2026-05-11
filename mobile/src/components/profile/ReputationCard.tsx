import React, { memo, useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Star } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, { Polyline, Circle } from "react-native-svg";

import { AnimatedCounter } from "@/components/common/AnimatedCounter";

interface ReputationCardProps {
  score: number;
}

// Sparkline data — relative Y values (lower = higher on chart)
const SPARK_Y_RATIOS = [0.85, 0.55, 0.72, 0.42, 0.60, 0.35, 0.18];

const SPARK_W = 72;
const SPARK_H = 28;

function buildPolylinePoints(yRatios: number[]): string {
  return yRatios
    .map((y, i) => {
      const x = (i / (yRatios.length - 1)) * SPARK_W;
      const yPos = y * (SPARK_H - 6) + 3;
      return `${x.toFixed(1)},${yPos.toFixed(1)}`;
    })
    .join(" ");
}

export const ReputationCard = memo(function ReputationCard({
  score,
}: ReputationCardProps) {
  const theme = useTheme();

  const reputationScore = useMemo(
    () => Math.max(0, Math.round(Number(score) || 0)),
    [score],
  );

  const polylinePoints = useMemo(() => buildPolylinePoints(SPARK_Y_RATIOS), []);

  // ── Card entrance ─────────────────────────────────────────────────────────
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.92);

  useEffect(() => {
    cardOpacity.value = withDelay(
      220,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
    cardScale.value = withDelay(
      220,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  // ── Sparkline draw animation ──────────────────────────────────────────────
  // We animate the opacity of the polyline from 0→1 and use a clipping
  // approach: draw each dot with a staggered delay for a "drawing" effect
  const lineOpacity = useSharedValue(0);

  useEffect(() => {
    lineOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
  }));

  // Last dot accent — pulses subtly
  const dotScale = useSharedValue(0);
  useEffect(() => {
    dotScale.value = withDelay(
      1100,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.back(2)) }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const lastX = (SPARK_W).toFixed(1);
  const lastY = (SPARK_Y_RATIOS[SPARK_Y_RATIOS.length - 1] * (SPARK_H - 6) + 3).toFixed(1);

  return (
    <Animated.View style={cardStyle}>
      <LinearGradient
        colors={["rgba(37,99,235,0.07)", "rgba(6,182,212,0.04)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <View
            style={[
              styles.starWrap,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Star
              size={11}
              color={theme.colors.primary}
              fill={theme.colors.primary}
              strokeWidth={0}
            />
          </View>
          <Text
            style={[styles.label, { color: theme.colors.textTertiary }]}
          >
            Reputation
          </Text>
        </View>

        {/* Animated counter */}
        <AnimatedCounter
          value={reputationScore}
          style={[styles.value, { color: theme.colors.textPrimary }]}
          duration={800}
          delay={300}
        />

        {/* SVG Sparkline */}
        <Animated.View style={[styles.sparkContainer, lineStyle]}>
          <Svg
            width={SPARK_W}
            height={SPARK_H}
            viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          >
            {/* Line */}
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={theme.colors.primary}
              strokeWidth={1.5}
              strokeOpacity={0.55}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Intermediate dots */}
            {SPARK_Y_RATIOS.slice(0, -1).map((y, i) => {
              const x = (i / (SPARK_Y_RATIOS.length - 1)) * SPARK_W;
              const yPos = y * (SPARK_H - 6) + 3;
              return (
                <Circle
                  key={i}
                  cx={x}
                  cy={yPos}
                  r={1.5}
                  fill={theme.colors.primary}
                  opacity={0.3}
                />
              );
            })}
          </Svg>

          {/* Animated end dot */}
          <Animated.View
            style={[
              styles.endDot,
              {
                backgroundColor: theme.colors.primary,
                left: parseFloat(lastX) - 4,
                top: parseFloat(lastY) - 4,
              },
              dotStyle,
            ]}
          />
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 100,
    borderRadius: 16,
    padding: 10,
    paddingBottom: 8,
    gap: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.08)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 1,
  },
  starWrap: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  value: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 2,
  },
  sparkContainer: {
    width: SPARK_W,
    height: SPARK_H,
    position: "relative",
    marginTop: 2,
  },
  endDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
});
