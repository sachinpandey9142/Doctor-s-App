import { useEffect } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

/**
 * useStaggeredEntry
 *
 * Returns an animated style for a given section index that fades in
 * and slides up slightly, with each index delayed by `staggerMs`.
 *
 * Usage:
 *   const sectionStyle = useStaggeredEntry(0); // first section
 *   <Animated.View style={sectionStyle}>...</Animated.View>
 */
export function useStaggeredEntry(
  index: number,
  options: {
    staggerMs?: number;
    durationMs?: number;
    translateY?: number;
  } = {},
) {
  const { staggerMs = 65, durationMs = 360, translateY = 18 } = options;

  const opacity = useSharedValue(0);
  const translateYValue = useSharedValue(translateY);

  useEffect(() => {
    const delay = index * staggerMs;
    const config = {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    };

    const timer = setTimeout(() => {
      opacity.value = withTiming(1, config);
      translateYValue.value = withTiming(0, config);
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateYValue.value }],
  }));
}
