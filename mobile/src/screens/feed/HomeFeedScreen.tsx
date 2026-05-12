import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated as RNAnimated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Activity, Bell, Plus, Search } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import Animated from "react-native-reanimated";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PostCard } from "@/components/feed/PostCard";
import { StoryBar } from "@/components/stories/StoryBar";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/store/authStore";
import { useFeedStore } from "@/store/feedStore";
import { useChatStore } from "@/store/chatStore";
import { useNotificationStore } from "@/store/notificationStore";
import { hapticTap } from "@/utils/haptics";
import type { Post } from "@/types/models";
import { theme as appTheme } from "@/constants/theme";
import { useScrollHeader } from "@/hooks/useScrollHeader";

type FilterType = "All" | "Cases" | "Media" | "Text";
const FILTERS: FilterType[] = ["All", "Cases", "Media", "Text"];
const baseShadow = appTheme.shadow;

function SkeletonCard({
  colors,
}: {
  colors: { surface: string; border: string };
}) {
  return (
    <View
      style={[
        skeletonStyles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={skeletonStyles.header}>
        <LoadingSkeleton width={46} height={46} borderRadius={23} />
        <View style={skeletonStyles.meta}>
          <LoadingSkeleton width={150} height={13} />
          <View style={{ height: 7 }} />
          <LoadingSkeleton width={100} height={11} />
        </View>
      </View>
      <View style={{ height: 12 }} />
      <LoadingSkeleton width="92%" height={13} />
      <View style={{ height: 7 }} />
      <LoadingSkeleton width="76%" height={13} />
      <View style={{ height: 14 }} />
      <LoadingSkeleton width="100%" height={240} borderRadius={14} />
    </View>
  );
}

export function HomeFeedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const user = useAuthStore((state) => state.user);
  const {
    posts,
    loading,
    refreshing,
    fetchInitialFeed,
    fetchMoreFeed,
    refreshFeed,
    toggleLike,
    deletePost,
  } = useFeedStore((state) => state);
  const joinCaseDiscussion = useChatStore((s) => s.joinCaseDiscussion);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const skeletonOpacity = useRef(new RNAnimated.Value(1)).current;
  const prevLoadingRef = useRef(loading);
  const feedListRef = useRef<Animated.FlatList<Post> | null>(null);

  // ── Inline scroll-away header animations ────────────────────────────────
  const {
    scrollHandler,
    brandStyle,
    storyStyle,
    filterStyle,
    fabStyle,
  } = useScrollHeader();

  // ── Skeleton fade-out on first load ─────────────────────────────────────
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      RNAnimated.timing(skeletonOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    prevLoadingRef.current = loading;
  }, [loading, skeletonOpacity]);

  useEffect(() => {
    fetchInitialFeed();
  }, [fetchInitialFeed]);

  const handleLike = useCallback(
    (postId: string) => {
      void toggleLike(postId);
    },
    [toggleLike],
  );

  const handleDelete = useCallback(
    (post: Post) => {
      void deletePost(post._id);
    },
    [deletePost],
  );

  const safeAreaStyle = useMemo(
    () => ({ height: insets.top, backgroundColor: theme.colors.background }),
    [insets.top, theme.colors.background],
  );

  const filteredPosts = useMemo(() => {
    if (activeFilter === "All") return posts;
    if (activeFilter === "Cases") return posts.filter((p) => p.type === "case");
    if (activeFilter === "Media")
      return posts.filter(
        (p) => p.type === "image" || p.type === "video" || !!p.mediaUrl,
      );
    return posts.filter((p) => p.type === "text");
  }, [posts, activeFilter]);

  const openComments = useCallback(
    (post: Post) => {
      navigation.navigate("Comments", {
        postId: post._id,
        title:
          post.isAnonymous && post.type === "case"
            ? "Anonymous Case"
            : post.userId.name,
      });
    },
    [navigation],
  );

  const openProfile = useCallback(
    (post: Post) => {
      const targetId =
        !post.userId?._id || post.userId._id === user?._id
          ? user?._id
          : post.userId._id;
      navigation.navigate("UserProfile", {
        userId: targetId || post.userId._id,
      });
    },
    [navigation, user?._id],
  );

  const handleJoinDiscussion = useCallback(
    async (post: Post) => {
      try {
        const conv = await joinCaseDiscussion(post._id);
        navigation.navigate("CaseDiscussionThread", {
          conversationId: conv._id,
          title: conv.title || "Case Discussion",
          caseAuthor: post.isAnonymous ? "Anonymous" : post.userId.name,
          caseSnippet: post.content,
        });
      } catch (e) {}
    },
    [joinCaseDiscussion, navigation],
  );

  const handleViewCase = useCallback(
    (post: Post) => {
      navigation.navigate("CaseDetail", { post });
    },
    [navigation],
  );

  const handleBrandPress = useCallback(() => {
    hapticTap();
    setActiveFilter("All");
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => (
      <PostCard
        post={item}
        currentUserId={user?._id}
        onLike={handleLike}
        onComment={openComments}
        onAuthorPress={openProfile}
        onDelete={handleDelete}
        onJoinDiscussion={handleJoinDiscussion}
        onViewCase={handleViewCase}
        isAdmin={user?.role === "admin"}
      />
    ),
    [
      handleDelete,
      handleJoinDiscussion,
      handleViewCase,
      openComments,
      openProfile,
      handleLike,
      user?._id,
      user?.role,
    ],
  );

  const skeletonColors = useMemo(
    () => ({ surface: theme.colors.surface, border: theme.colors.border }),
    [theme.colors],
  );

  const showSkeleton = loading && posts.length === 0;

  // ── Inline Header (scrolls with feed) ─────────────────────────────────
  const ListHeader = useMemo(
    () => (
      <View style={styles.headerRoot}>
        {/* Safe area top inset — respects notch/dynamic island */}
        <View style={safeAreaStyle} />

        {/* ── Brand bar — logo + action buttons ──────────────────── */}
        <Animated.View style={[styles.brandBar, brandStyle]}>
          <Pressable
            onPress={handleBrandPress}
            style={({ pressed }) => [
              styles.brandRow,
              pressed && styles.brandRowPressed,
            ]}
          >
            <LinearGradient
              colors={theme.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brandIcon}
            >
              <Activity
                size={15}
                color={theme.colors.textInverted}
                strokeWidth={2.5}
              />
            </LinearGradient>
            <View>
              <Text
                style={[styles.brandName, { color: theme.colors.textPrimary }]}
              >
                Doctor's App
              </Text>
              <Text
                style={[
                  styles.brandSubtext,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                Your medical community
              </Text>
            </View>
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.headerBtn,
                {
                  backgroundColor: pressed
                    ? theme.colors.primaryLight
                    : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => {
                hapticTap();
                navigation.navigate("Discover");
              }}
            >
              <Search
                size={17}
                color={theme.colors.textPrimary}
                strokeWidth={2}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.headerBtn,
                {
                  backgroundColor: pressed
                    ? theme.colors.primaryLight
                    : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => {
                hapticTap();
                navigation.navigate("Notifications");
              }}
            >
              <Bell
                size={17}
                color={theme.colors.textPrimary}
                strokeWidth={2}
              />
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Story bar — scrolls away with parallax compression ─── */}
        <Animated.View style={[styles.storyBarWrap, storyStyle]}>
          <StoryBar />
        </Animated.View>

        {/* ── Filter chips — subtle fade as they scroll away ──────── */}
        <Animated.View style={filterStyle}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          >
            {FILTERS.map((filter) => {
              const active = activeFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => {
                    hapticTap();
                    setActiveFilter(filter);
                  }}
                  style={[
                    styles.filterChip,
                    active
                      ? styles.filterChipActive
                      : {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          borderWidth: 1,
                        },
                  ]}
                >
                  {active ? (
                    <LinearGradient
                      colors={theme.gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.filterChipGrad}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          { color: theme.colors.textInverted },
                        ]}
                      >
                        {filter}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text
                      style={[
                        styles.filterText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {filter}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Soft separator between header and feed content */}
        <View
          style={[
            styles.headerSeparator,
            { borderBottomColor: theme.colors.border },
          ]}
        />
      </View>
    ),
    [
      insets.top,
      theme,
      brandStyle,
      storyStyle,
      filterStyle,
      handleBrandPress,
      navigation,
      unreadCount,
      activeFilter,
    ],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* ── Feed / Skeleton ──────────────────────────────────── */}
      {showSkeleton ? (
        <RNAnimated.View
          style={{ paddingTop: insets.top + 60, flex: 1, opacity: skeletonOpacity }}
        >
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} colors={skeletonColors} />
          ))}
        </RNAnimated.View>
      ) : (
        <Animated.FlatList
          ref={feedListRef}
          data={filteredPosts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          // Header scrolls inline with the feed — no fixed/sticky positioning
          ListHeaderComponent={ListHeader}
          onEndReached={fetchMoreFeed}
          onEndReachedThreshold={0.5}
          // Native-thread scroll handler — zero JS bridge overhead
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshFeed}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Activity size={30} color={theme.colors.primary} />}
              title={
                activeFilter === "Cases"
                  ? "No cases found"
                  : activeFilter === "Media"
                    ? "No media posts"
                    : "Your feed is quiet"
              }
              body={
                activeFilter === "Cases"
                  ? "Share a clinical case or join an ongoing discussion."
                  : activeFilter === "Media"
                    ? "Upload medical scans, surgical videos, or conference photos."
                    : "Follow more medical professionals to see their updates here."
              }
              ctaLabel={
                activeFilter === "All" ? "Explore Professionals" : "Create Post"
              }
              onCta={() => {
                if (activeFilter === "All") {
                  navigation.navigate("Discover");
                } else {
                  navigation.navigate("CreatePost");
                }
              }}
              style={{ marginTop: 24 }}
            />
          }
          showsVerticalScrollIndicator={false}
          decelerationRate="normal"
          overScrollMode="never"
          bounces
          initialNumToRender={5}
          maxToRenderPerBatch={4}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        />
      )}

      {/* ── FAB ──────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.fabWrap, { bottom: insets.bottom + 86 }, fabStyle]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => {
            hapticTap();
            navigation.navigate("CreatePost");
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Plus size={24} color={theme.colors.textInverted} strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header (inline — scrolls with content) ───────────────────────────────
  headerRoot: {
    // NO position: absolute, NO zIndex — the header is part of the scroll flow
  },

  // ── Brand bar ────────────────────────────────────────────────────────────
  brandBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
    height: 60,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  brandRowPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    marginRight: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    letterSpacing: -0.4,
  },
  brandSubtext: {
    marginTop: -1,
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
  headerActions: { flexDirection: "row" },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...baseShadow.card,
    marginLeft: 8,
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: appTheme.colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  bellBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    color: appTheme.colors.textInverted,
    lineHeight: 12,
  },

  // ── Story bar ────────────────────────────────────────────────────────────
  storyBarWrap: {
    paddingBottom: 4,
  },

  // ── Filter chips ─────────────────────────────────────────────────────────
  filterList: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    borderRadius: 999,
    overflow: "hidden",
    marginRight: 7,
  },
  filterChipActive: {
    borderRadius: 999,
    overflow: "hidden",
  },
  filterChipGrad: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
  filterText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },

  // ── Soft separator between header and feed ───────────────────────────────
  headerSeparator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
    marginBottom: 6,
  },

  // ── Feed ─────────────────────────────────────────────────────────────────
  listContent: { paddingBottom: 120 },

  // ── FAB ──────────────────────────────────────────────────────────────────
  fabWrap: { position: "absolute", right: 16 },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...baseShadow.floating,
    elevation: 8,
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 18,
    paddingTop: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  meta: { flex: 1 },
});
