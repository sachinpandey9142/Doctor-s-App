import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { ChevronDown, ChevronUp, Stethoscope } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { GlassCard } from "@/components/common/GlassCard";
import { useFeedStore } from "@/store/feedStore";
import { hapticTap } from "@/utils/haptics";
import { formatRelativeTime } from "@/utils/date";
import type { Post } from "@/types/models";

export function CaseDiscussionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { casePosts, fetchCaseFeed } = useFeedStore((state) => state);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCaseFeed();
  }, [fetchCaseFeed]);

  const refreshCases = async () => {
    setRefreshing(true);
    try {
      await fetchCaseFeed();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = (postId: string) => {
    hapticTap();
    setExpandedMap((state) => ({ ...state, [postId]: !state[postId] }));
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      const expanded = !!expandedMap[item._id];

      return (
        <Animated.View entering={FadeInDown.delay(Math.min(index * 35, 180)).duration(260).springify()}>
          <Pressable onPress={() => toggleExpand(item._id)}>
            <GlassCard style={styles.caseCard} padded={false}>
              {/* ── Header ─────────────────────────────────────────── */}
              <View style={styles.caseHeader}>
                <View style={styles.caseProfileRow}>
                  <Avatar
                    name={item.isAnonymous ? "Anonymous Case" : item.userId.name}
                    uri={item.isAnonymous ? "" : item.userId.profileImage}
                    verified={item.userId.isVerified}
                    size={40}
                  />
                  <View style={styles.authorText}>
                    <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
                      {item.isAnonymous ? "Anonymous Case" : item.userId.name}
                    </Text>
                    <Text style={[styles.meta, { color: theme.colors.textTertiary }]}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Expand/collapse chevron */}
                <View style={[styles.chevronWrap, { backgroundColor: theme.colors.primaryLight }]}>
                  {expanded
                    ? <ChevronUp size={15} color={theme.colors.primary} />
                    : <ChevronDown size={15} color={theme.colors.primary} />}
                </View>
              </View>

              {/* ── Content ────────────────────────────────────────── */}
              <View style={styles.contentWrap}>
                <Text style={[styles.content, { color: theme.colors.textPrimary }]} numberOfLines={expanded ? undefined : 3}>
                  {item.content}
                </Text>
              </View>

              {/* ── Expanded details ───────────────────────────────── */}
              {expanded ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={[styles.expandedWrap, { backgroundColor: theme.colors.badgeCaseLight, borderColor: "#C4B5FD" }]}
                >
                  <View style={styles.expandedTitleRow}>
                    <Stethoscope size={13} color={theme.colors.badgeCase} />
                    <Text style={[styles.expandedLabel, { color: theme.colors.badgeCase }]}>Clinical Details</Text>
                  </View>

                  <Text style={[styles.sectionKey, { color: theme.colors.textTertiary }]}>SYMPTOMS</Text>
                  <Text style={[styles.sectionBody, { color: theme.colors.textPrimary }]}>
                    {item.symptoms || "No symptoms recorded."}
                  </Text>

                  <Text style={[styles.sectionKey, { color: theme.colors.textTertiary, marginTop: 10 }]}>OBSERVATIONS</Text>
                  <Text style={[styles.sectionBody, { color: theme.colors.textPrimary }]}>
                    {item.observations || "No observations recorded."}
                  </Text>
                </Animated.View>
              ) : null}
            </GlassCard>
          </Pressable>
        </Animated.View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expandedMap, theme.colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={casePosts}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshCases}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.headerBrandRow}>
              <View style={[styles.headerIcon, { backgroundColor: theme.colors.badgeCaseLight }]}>
                <Stethoscope size={16} color={theme.colors.badgeCase} />
              </View>
              <Text style={[styles.headerBrand, { color: theme.colors.badgeCase }]}>CASE DISCUSSIONS</Text>
            </View>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Clinical Cases</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Tap a case to expand structured clinical details
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Stethoscope size={30} color={theme.colors.badgeCase} />}
            title="No cases yet"
            body="Post a medical case anonymously or publicly to start a clinical discussion."
            accentColor={theme.colors.badgeCaseLight}
          />
        }
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        overScrollMode="never"
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 120
  },
  // ── Header
  headerWrap: { marginBottom: 14 },
  headerBrandRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  headerIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  headerBrand: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    letterSpacing: 1.8
  },
  headerTitle: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 26 },
  headerSubtitle: { marginTop: 5, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20 },
  // ── Card
  caseCard: { marginBottom: 10 },
  caseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    paddingBottom: 0
  },
  caseProfileRow: { flexDirection: "row", gap: 10, alignItems: "center", flex: 1 },
  authorText: { flex: 1 },
  name: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 15 },
  meta: { fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 2 },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  contentWrap: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  content: { fontFamily: "Manrope_500Medium", fontSize: 14, lineHeight: 22 },
  // ── Expanded details
  expandedWrap: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12
  },
  expandedTitleRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  expandedLabel: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 12 },
  sectionKey: { fontFamily: "Manrope_700Bold", fontSize: 10, letterSpacing: 0.6 },
  sectionBody: { marginTop: 3, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20 }
});
