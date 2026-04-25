import React, { useCallback, useEffect, useMemo } from "react";
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bell, Plus, Search, Stethoscope } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PostCard } from "@/components/feed/PostCard";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/store/authStore";
import { useFeedStore } from "@/store/feedStore";
import type { Post } from "@/types/models";

export function HomeFeedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const user = useAuthStore((state) => state.user);
  const { posts, loading, refreshing, fetchInitialFeed, fetchMoreFeed, refreshFeed, toggleLike } =
    useFeedStore((state) => state);

  useEffect(() => {
    fetchInitialFeed();
  }, [fetchInitialFeed]);

  const openComments = useCallback(
    (post: Post) => {
      navigation.navigate("Comments", {
        postId: post._id,
        title: post.isAnonymous && post.type === "case" ? "Anonymous Case" : post.userId.name
      });
    },
    [navigation]
  );

  const openProfile = useCallback(
    (post: Post) => {
      const targetId =
        !post.userId?._id || post.userId._id === user?._id ? user?._id : post.userId._id;
      navigation.navigate("UserProfile", { userId: targetId || post.userId._id });
    },
    [navigation, user?._id]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Post; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
        <PostCard
          post={item}
          currentUserId={user?._id}
          onLike={toggleLike}
          onComment={openComments}
          onAuthorPress={openProfile}
        />
      </Animated.View>
    ),
    [openComments, openProfile, toggleLike, user?._id]
  );

  // ── Skeleton loading cards ────────────────────────────────────────────────
  const skeletonCards = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, index) => (
        <View
          key={`skel-${index}`}
          style={[styles.skeletonCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
        >
          {/* Author row */}
          <View style={styles.skeletonHeader}>
            <LoadingSkeleton width={42} height={42} borderRadius={21} />
            <View style={styles.skeletonMeta}>
              <LoadingSkeleton width={120} height={13} />
              <View style={{ height: 6 }} />
              <LoadingSkeleton width={90} height={11} />
            </View>
          </View>
          {/* Content lines */}
          <View style={{ height: 12 }} />
          <LoadingSkeleton width="100%" height={12} />
          <View style={{ height: 7 }} />
          <LoadingSkeleton width="88%" height={12} />
          <View style={{ height: 7 }} />
          <LoadingSkeleton width="72%" height={12} />
          {/* Action bar */}
          <View style={[styles.skeletonActions, { borderTopColor: theme.colors.borderLight }]}>
            <LoadingSkeleton width={52} height={12} />
            <LoadingSkeleton width={52} height={12} />
            <LoadingSkeleton width={52} height={12} />
          </View>
        </View>
      )),
    [theme.colors]
  );

  // ── Branded list header ───────────────────────────────────────────────────
  const listHeader = useMemo(
    () => (
      <LinearGradient
        colors={["#EFF6FF", theme.colors.background]}
        style={styles.feedHeader}
      >
        <Text style={[styles.feedTitle, { color: theme.colors.textPrimary }]}>Clinical Feed</Text>
        <Text style={[styles.feedSub, { color: theme.colors.textSecondary }]}>
          Verified voices · Latest case discussions
        </Text>
      </LinearGradient>
    ),
    [theme.colors]
  );

  const clusterTop = insets.top + 8;
  const listTopPad = insets.top + 56;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Fixed action cluster ────────────────────────────────────── */}
      <View style={[styles.actionsCluster, { top: clusterTop }]}>
        <Pressable
          style={[styles.headerButton, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate("Discover")}
        >
          <Search size={17} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          style={[styles.headerButton, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Bell size={17} color={theme.colors.primary} />
        </Pressable>
      </View>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {loading && posts.length === 0 ? (
        <View style={[styles.skeletonWrap, { paddingTop: listTopPad + 72 }]}>{skeletonCards}</View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.listContent, { paddingTop: listTopPad }]}
          onEndReached={fetchMoreFeed}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshFeed}
              tintColor={theme.colors.primary}
              progressViewOffset={listTopPad}
            />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon={<Stethoscope size={30} color={theme.colors.primary} />}
              title="Your feed is empty"
              body="Follow medical professionals or publish the first post to get started."
              ctaLabel="Explore Professionals"
              onCta={() => navigation.navigate("Discover")}
              style={styles.emptyState}
            />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => navigation.navigate("CreatePost")}
        style={[styles.fabWrap, { bottom: insets.bottom + 20 }]}
      >
        <LinearGradient
          colors={theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fab, theme.shadow.floating]}
        >
          <Plus size={22} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionsCluster: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 8,
    zIndex: 20
  },
  headerButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    // Slight shadow on action buttons
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  // ── Feed header
  feedHeader: {
    paddingBottom: 16,
    paddingTop: 4
  },
  feedTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26
  },
  feedSub: {
    marginTop: 4,
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  },
  // ── List
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 110
  },
  emptyState: {
    marginTop: 16
  },
  // ── Skeleton
  skeletonWrap: {
    paddingHorizontal: 14,
    gap: 10
  },
  skeletonCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  skeletonMeta: {
    flex: 1
  },
  skeletonActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 10
  },
  // ── FAB
  fabWrap: {
    position: "absolute",
    right: 16
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  }
});
