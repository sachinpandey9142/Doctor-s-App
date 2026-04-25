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
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import { GlassCard } from "@/components/common/GlassCard";
import { useFeedStore } from "@/store/feedStore";
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
    setExpandedMap((state) => ({
      ...state,
      [postId]: !state[postId]
    }));
  };

  const renderItem = useCallback(
    ({ item }: { item: Post }) => {
      const expanded = !!expandedMap[item._id];

      return (
        <Pressable onPress={() => toggleExpand(item._id)}>
          <GlassCard style={styles.caseCard}>
            <View style={styles.caseHeader}>
              <View style={styles.caseProfileRow}>
                <Avatar
                  name={item.isAnonymous ? "Anonymous Case" : item.userId.name}
                  uri={item.isAnonymous ? "" : item.userId.profileImage}
                  verified={item.userId.isVerified}
                />
                <View>
                  <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
                    {item.isAnonymous ? "Anonymous Case" : item.userId.name}
                  </Text>
                  <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
              </View>

              {expanded ? (
                <ChevronUp size={18} color={theme.colors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={theme.colors.textSecondary} />
              )}
            </View>

            <Text style={[styles.content, { color: theme.colors.textPrimary }]}>{item.content}</Text>

            {expanded ? (
              <View style={[styles.expandedWrap, { borderColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Symptoms</Text>
                <Text style={[styles.sectionBody, { color: theme.colors.textSecondary }]}>
                  {item.symptoms || "No symptoms added."}
                </Text>

                <Text style={[styles.sectionTitle, { color: theme.colors.primary, marginTop: 10 }]}>Observations</Text>
                <Text style={[styles.sectionBody, { color: theme.colors.textSecondary }]}>
                  {item.observations || "No observations added."}
                </Text>
              </View>
            ) : null}
          </GlassCard>
        </Pressable>
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
          <RefreshControl refreshing={refreshing} onRefresh={refreshCases} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Case Discussion Threads</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Expand each case for structured clinical details
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        // ─── Performance props ─────────────────────────────────────
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120
  },
  headerWrap: {
    marginBottom: 14
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 25
  },
  headerSubtitle: {
    marginTop: 6,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21
  },
  caseCard: {
    marginBottom: 12
  },
  caseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  caseProfileRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  name: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12
  },
  content: {
    marginTop: 10,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21
  },
  expandedWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(37, 99, 235, 0.06)"
  },
  sectionTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13
  },
  sectionBody: {
    marginTop: 3,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20
  }
});
