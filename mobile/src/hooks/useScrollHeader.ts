import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

/**
 * useScrollHeader
 *
 * Provides scroll-reactive animated styles for an INLINE header that scrolls
 * away naturally with the feed content — NOT a sticky/pinned header.
 *
 * Architecture:
 * - The header lives inside `ListHeaderComponent` and scrolls with the list
 * - As the user scrolls, subtle transforms enhance the "moving away" feeling:
 *   · Brand row gets a gentle parallax (scrolls slightly slower than content)
 *   · Story bar compresses vertically with a subtle scale-down
 *   · Filter chips fade softly as they approach the top edge
 *   · The entire header has a gentle opacity reduction at the very end
 * - All animations run on the native UI thread via Reanimated worklets (60fps)
 * - The FAB subtly springs into full visibility as the user starts scrolling
 *
 * Scroll stages (approximate — all values are clamped):
 *   0→40px   : Idle, fully expanded, everything at rest
 *   40→120px : Brand parallax kicks in, stories start compressing
 *   80→160px : Filter chips begin fading, overall header opacity softens
 *   160px+   : Header is naturally scrolled off-screen by the FlatList
 */
export function useScrollHeader() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      scrollY.value = event.contentOffset.y;
    },
  });

  /**
   * Brand bar parallax:
   * - Moves at ~60% of scroll speed, creating a subtle depth/parallax feel
   * - translateY: 0 → -30 while actual scroll goes 0→80
   * - Gives the brand row a "floating away gently" sensation
   * - Slight scale-down from 1 → 0.97 for depth
   */
  const brandStyle = useAnimatedStyle(() => {
    "worklet";
    const translateY = interpolate(
      scrollY.value,
      [0, 80],
      [0, -12],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [0, 120],
      [1, 0.97],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [0, 140],
      [1, 0.6],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  /**
   * Story bar compression:
   * - Subtle vertical scale-down as user scrolls (1 → 0.94)
   * - Slight upward drift for a "compressing into itself" effect
   * - Opacity fades gently (1 → 0.5) — the list will scroll it off anyway
   */
  const storyStyle = useAnimatedStyle(() => {
    "worklet";
    const scale = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.94],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, -6],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [40, 140],
      [1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  /**
   * Filter chips:
   * - Fade out slightly earlier to create a layered disappearance
   * - Subtle scale-down for depth
   */
  const filterStyle = useAnimatedStyle(() => {
    "worklet";
    const opacity = interpolate(
      scrollY.value,
      [30, 110],
      [1, 0.4],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [0, 110],
      [1, 0.96],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 110],
      [0, -4],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  /**
   * FAB visibility:
   * - Subtly pops in with scale + opacity as user starts scrolling
   */
  const fabStyle = useAnimatedStyle(() => {
    "worklet";
    const scale = interpolate(
      scrollY.value,
      [0, 40],
      [0.92, 1],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [0, 40],
      [0.7, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return {
    scrollY,
    scrollHandler,
    brandStyle,
    storyStyle,
    filterStyle,
    fabStyle,
  };
}
