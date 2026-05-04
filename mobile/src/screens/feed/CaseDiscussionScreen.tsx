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
import { ChevronDown, ChevronUp, Stethoscope, UserX } from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFeedStore } from "@/store/feedStore";
import { useChatStore } from "@/store/chatStore";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { hapticTap } from "@/utils/haptics";
import { formatRelativeTime } from "@/utils/date";
import type { Post } from "@/types/models";

export function CaseDiscussionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { casePosts, fetchCaseFeed } = useFeedStore((state) => state);
  const joinCaseDiscussion = useChatStore((s) => s.joinCaseDiscussion);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchCaseFeed(); }, [fetchCaseFeed]);

  const refreshCases = async () => {
    setRefreshing(true);
    try { await fetchCaseFeed(); }
    finally { setRefreshing(false); }
  };

  const toggleExpand = (postId: string) => {
    hapticTap();
    setExpandedMap((s) => ({ ...s, [postId]: !s[postId] }));
  };

  const handleJoinChat = async (post: Post) => {
    try {
      const conv = await joinCaseDiscussion(post._id);
      navigation.navigate("CaseDiscussionThread", {
        conversationId: conv._id,
        title: conv.title || "Case Discussion",
        caseAuthor: post.isAnonymous ? "Anonymous" : post.userId.name,
        caseSnippet: post.content
      });
    } catch (e) {}
  };

  const handleViewCase = (post: Post) => {
    navigation.navigate("CaseDetail", { post });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => {
      const expanded = !!expandedMap[item._id];

      return (
        <Animated.View entering={FadeInDown.delay(Math.min(index * 35, 180)).duration(260).springify()}>
          <Pressable onPress={() => toggleExpand(item._id)}>
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Avatar
                  name={item.isAnonymous ? "Anonymous Case" : item.userId.name}
                  uri={item.isAnonymous ? "" : item.userId.profileImage}
                  verified={item.userId.isVerified}
                  size={40}
                />
                <View style={styles.authorText}>
                  <View style={styles.authorNameRow}>
                    <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
                      {item.isAnonymous ? "Anonymous Case" : item.userId.name}
                    </Text>
                    {item.isAnonymous ? (
                      <View style={styles.anonBadge}>
                        <UserX size={10} color="#7C3AED" strokeWidth={2} />
                        <Text style={styles.anonText}>Anonymous</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.meta, { color: theme.colors.textTertiary }]}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
                <View style={[styles.chevronWrap, { backgroundColor: theme.colors.primaryLight }]}>
                  {expanded
                    ? <ChevronUp size={14} color={theme.colors.primary} />
                    : <ChevronDown size={14} color={theme.colors.primary} />}
                </View>
              </View>

              {/* Content */}
              <Text style={[styles.content, { color: theme.colors.textPrimary }]} numberOfLines={expanded ? undefined : 3}>
                {item.content}
              </Text>

              {/* Expanded details */}
              {expanded ? (
                <Animated.View entering={FadeIn.duration(180)} style={styles.expandedWrap}>
                  <View style={styles.expandTitleRow}>
                    <Stethoscope size={12} color="#7C3AED" />
                    <Text style={styles.expandLabel}>CLINICAL DETAILS</Text>
                  </View>

                  <Text style={styles.sectionKey}>SYMPTOMS</Text>
                  <Text style={[styles.sectionBody, { color: theme.colors.textPrimary }]}>
                    {item.symptoms || "No symptoms recorded."}
                  </Text>

                  <Text style={[styles.sectionKey, { marginTop: 10 }]}>OBSERVATIONS</Text>
                  <Text style={[styles.sectionBody, { color: theme.colors.textPrimary }]}>
                    {item.observations || "No observations recorded."}
                  </Text>

                  {(item.mediaUrl || (item.reportImages && item.reportImages.length > 0)) ? (
                    <View style={styles.imageWrap}>
                      <Image
                        source={{ uri: item.mediaUrl || item.reportImages?.[0] }}
                        style={styles.caseImage}
                        contentFit="cover"
                        transition={300}
                      />
                    </View>
                  ) : null}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.outlineBtn, { borderColor: "#C4B5FD" }]}
                      onPress={() => handleViewCase(item)}
                    >
                      <Text style={styles.outlineBtnText}>View Details</Text>
                    </Pressable>
                    <Pressable
                      style={styles.discussBtnWrap}
                      onPress={() => handleJoinChat(item)}
                    >
                      <LinearGradient
                        colors={["#2563EB", "#06B6D4"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.discussBtn}
                      >
                        <Text style={styles.discussBtnText}>Discuss Case</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </Animated.View>
              ) : null}
            </View>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshCases} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.headerBrandRow}>
              <View style={[styles.headerIcon, { backgroundColor: "#F5F3FF" }]}>
                <Stethoscope size={15} color="#7C3AED" />
              </View>
              <Text style={styles.headerBrand}>CASE DISCUSSIONS</Text>
            </View>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Clinical Cases</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Tap a case to expand structured clinical details
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Stethoscope size={28} color="#7C3AED" />}
            title="No cases yet"
            body="Post a medical case anonymously or publicly to start a clinical discussion."
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
  listContent: { paddingHorizontal: 14, paddingBottom: 120, gap: 10 },
  // Header
  headerWrap: { marginBottom: 8 },
  headerBrandRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  headerIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerBrand: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, letterSpacing: 1.5, color: "#7C3AED" },
  headerTitle: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 24 },
  headerSubtitle: { marginTop: 4, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20 },
  // Card
  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    paddingBottom: 10
  },
  authorText: { flex: 1 },
  authorNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  name: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 14 },
  anonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F5F3FF",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  anonText: { fontFamily: "Manrope_700Bold", fontSize: 10, color: "#7C3AED" },
  meta: { fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 2 },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  content: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 24,
    paddingHorizontal: 14,
    paddingBottom: 14
  },
  // Expanded
  expandedWrap: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "rgba(109,40,217,0.04)",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 14,
    padding: 14
  },
  expandTitleRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  expandLabel: { fontFamily: "Manrope_700Bold", fontSize: 10, letterSpacing: 0.8, color: "#7C3AED" },
  sectionKey: { fontFamily: "Manrope_700Bold", fontSize: 10, letterSpacing: 0.5, color: "#94A3B8" },
  sectionBody: { marginTop: 3, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 20 },
  imageWrap: { marginTop: 12, borderRadius: 10, overflow: "hidden", height: 180 },
  caseImage: { width: "100%", height: "100%" },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  outlineBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#FFFFFF"
  },
  outlineBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#7C3AED"
  },
  discussBtnWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden"
  },
  discussBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14
  },
  discussBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#FFFFFF"
  }
});
