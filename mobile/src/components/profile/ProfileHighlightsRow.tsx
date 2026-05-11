import React, { memo, useEffect, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, ChevronRight, Sparkles } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface ProfileHighlightItem {
  id: string;
  userId?: string;
  title: string;
  coverUri?: string;
  date?: string;
  itemCount?: number;
  visibility?: "followers" | "public" | "private";
  onPress?: () => void;
}

interface ProfileHighlightsRowProps {
  items: ProfileHighlightItem[];
  onAddPress?: () => void;
}

const ITEM_SIZE = 76;
const ITEM_WIDTH = 84;

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

const RING_GRADIENTS: Array<[string, string, string]> = [
  ["#2563EB", "#06B6D4", "#8B5CF6"],
  ["#3B82F6", "#0EA5E9", "#6366F1"],
  ["#1D4ED8", "#22D3EE", "#A855F7"],
  ["#2563EB", "#14B8A6", "#7C3AED"],
];

// ── New Memory card ──────────────────────────────────────────────────────────
function NewMemoryButton({ onPress }: { onPress?: () => void }) {
  const theme = useTheme();
  const borderOpacity = useSharedValue(0.6);
  const pressScale = useSharedValue(1);

  // Subtle pulse animation on the dashed border ring
  useEffect(() => {
    borderOpacity.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = withSpring(0.9, { damping: 14, stiffness: 300 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 14, stiffness: 280 });
      }}
    >
      <Animated.View style={[styles.addCard, scaleStyle]}>
        <View
          style={[
            styles.addHero,
            { backgroundColor: theme.colors.primaryLight },
          ]}
        >
          <Animated.View
            style={[
              styles.addCircle,
              { borderColor: theme.colors.primaryMid },
              borderStyle,
            ]}
          >
            <Plus size={20} color={theme.colors.primary} strokeWidth={2} />
          </Animated.View>
        </View>
        <View style={styles.addTextWrap}>
          <Text style={[styles.addTitle, { color: theme.colors.textPrimary }]}>
            New collection
          </Text>
          <Text
            style={[styles.addLabel, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            Save conferences, surgeries, and milestones
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ── Single memory card ──────────────────────────────────────────────────────
function MemoryCircle({
  item,
  index,
}: {
  item: ProfileHighlightItem;
  index: number;
}) {
  const theme = useTheme();
  const pressScale = useSharedValue(1);

  // Staggered entrance: fade + slide up
  const entryOpacity = useSharedValue(0);
  const entryY = useSharedValue(10);

  useEffect(() => {
    const delay = 350 + index * 55;
    entryOpacity.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    entryY.value = withDelay(
      delay,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryY.value }, { scale: pressScale.value }],
  }));

  return (
    <Pressable
      onPress={item.onPress}
      disabled={!item.onPress}
      onPressIn={() => {
        pressScale.value = withSpring(0.88, { damping: 14, stiffness: 300 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 12, stiffness: 260 });
      }}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderLight,
          },
          entryStyle,
        ]}
      >
        <View style={styles.coverShell}>
          {item.coverUri ? (
            <Image
              source={{ uri: item.coverUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            />
          )}
          <LinearGradient
            colors={["rgba(2,6,23,0.02)", "rgba(2,6,23,0.48)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.countPill,
              { backgroundColor: "rgba(255,255,255,0.9)" },
            ]}
          >
            <Sparkles size={10} color={theme.colors.primary} />
            <Text
              style={[styles.countText, { color: theme.colors.textPrimary }]}
            >
              {item.itemCount ?? 0}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text
            style={[styles.label, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.date, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.date ? formatDate(item.date) : "Recently updated"}
          </Text>
          <Text
            style={[styles.meta, { color: theme.colors.textTertiary }]}
            numberOfLines={1}
          >
            {item.visibility === "private"
              ? "Private"
              : item.visibility === "followers"
                ? "Followers only"
                : "Public collection"}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export const ProfileHighlightsRow = memo(function ProfileHighlightsRow({
  items,
  onAddPress,
}: ProfileHighlightsRowProps) {
  const theme = useTheme();

  type RowItem =
    | { id: string; isAdd: true }
    | (ProfileHighlightItem & { isAdd?: false });

  const rowData = useMemo<RowItem[]>(
    () => [{ id: "__new__", isAdd: true as const }, ...items],
    [items],
  );

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Memories
        </Text>
        {items.length > 0 ? (
          <View style={styles.seeAllBtn}>
            <Text
              style={[styles.seeAll, { color: theme.colors.textSecondary }]}
            >
              Collections
            </Text>
          </View>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <View style={styles.emptyCopy}>
            <Text
              style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}
            >
              Share medical milestones
            </Text>
            <Text
              style={[styles.emptyBody, { color: theme.colors.textSecondary }]}
            >
              Save conferences, surgeries, certifications, and case highlights
              as lasting collections.
            </Text>
          </View>
          <Pressable
            onPress={onAddPress}
            style={[
              styles.emptyAction,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text
              style={[
                styles.emptyActionText,
                { color: theme.colors.textInverted },
              ]}
            >
              Create
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Horizontal memory list */}
      <FlatList
        horizontal
        data={rowData}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item, index }) => {
          if (item.isAdd) {
            return <NewMemoryButton onPress={onAddPress} />;
          }
          const hi = item as ProfileHighlightItem;
          return <MemoryCircle item={hi} index={index - 1} />;
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    paddingBottom: 4,
  },
  titleWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAll: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 0.1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  card: {
    width: 152,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  coverShell: {
    height: 86,
    position: "relative",
    overflow: "hidden",
  },
  countPill: {
    position: "absolute",
    top: 10,
    right: 10,
    minWidth: 34,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  countText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  item: {
    width: 152,
    alignItems: "center",
  },
  addCard: {
    width: 152,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "transparent",
    borderColor: "rgba(37,99,235,0.18)",
  },
  addHero: {
    height: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  addTextWrap: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  addTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    letterSpacing: -0.1,
  },
  addCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  addLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
    letterSpacing: 0.05,
    lineHeight: 14,
  },
  label: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    letterSpacing: -0.1,
  },
  date: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
  },
  meta: {
    marginTop: 2,
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    letterSpacing: 0.05,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyCopy: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  emptyAction: {
    minWidth: 86,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  emptyActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
});
