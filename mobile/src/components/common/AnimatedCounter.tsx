import React, { useEffect, useRef, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

// Create an Animated version of Text that supports animatedProps
const AnimatedText = Animated.createAnimatedComponent(Text);

interface AnimatedCounterProps {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  delay?: number;
  formatter?: (n: number) => string;
}

/**
 * AnimatedCounter
 *
 * Smoothly animates a numeric display from 0 to `value` on mount.
 * Formatted via optional `formatter` (defaults to rounded integer).
 */
export function AnimatedCounter({
  value,
  style,
  duration = 750,
  delay = 150,
  formatter = (n) => String(Math.round(n)),
}: AnimatedCounterProps) {
  const count = useSharedValue(0);
  const mounted = useRef(false);
  const [displayText, setDisplayText] = useState(() => formatter(0));

  const updateDisplayText = (nextValue: number) => {
    setDisplayText(formatter(nextValue));
  };

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const timer = setTimeout(() => {
      count.value = withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-animate if value changes after mount
  useEffect(() => {
    if (!mounted.current) return;
    count.value = withTiming(value, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, count]);

  useAnimatedReaction(
    () => Math.round(count.value),
    (currentValue, previousValue) => {
      "worklet";
      if (currentValue !== previousValue) {
        runOnJS(updateDisplayText)(currentValue);
      }
    },
    [updateDisplayText],
  );

  return (
    <AnimatedText style={style} accessibilityRole="text">
      {displayText}
    </AnimatedText>
  );
}
