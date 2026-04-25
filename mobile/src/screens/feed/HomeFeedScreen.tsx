import React, { useCallback, useEffect, useMemo } from "react";
import { FlatList, Platform, Pressable, RefreshControl, Share, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bell, Plus, Search, Sparkles } from "lucide-react-native";
import { useTheme } from "styled-components/native";

import { GlassCard } from "@/components/common/GlassCard";
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
  const { posts, loading, refreshing, fetchInitialFeed, fetchMoreFeed, refreshFeed, toggleLike } = useFeedStore(
    (state) => state
  );

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
      if (!post.userId?._id || post.userId._id === user?._id) {
        navigation.navigate("UserProfile", { userId: user?._id || post.userId._id });
        return;
      }

      navigation.navigate("UserProfile", { userId: post.userId._id });
    },
    [navigation, user?._id]
  );

  const sharePost = useCallback(async (post: Post) => {
    const author = post.isAnonymous && post.type === "case" ? "Anonymous Case" : post.userId.name;
    await Share.share({
      title: "Doctor,s App Post",
      message: `${author} shared:\n\n${post.content}`
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        currentUserId={user?._id}
        onLike={toggleLike}
        onComment={openComments}
        onShare={sharePost}
        onAuthorPress={openProfile}
      />
    ),
    [openComments, openProfile, sharePost, toggleLike, user?._id]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerWrap}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Clinical Community Feed</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Verified voices from across hospitals, labs, and universities
        </Text>
      </View>
    ),
    [theme.colors.textPrimary, theme.colors.textSecondary]
  );

  const loadingState = loading && posts.length === 0;

  // Action cluster top position: status bar inset + 8px breathing room
  const clusterTop = insets.top + 8;
  // List top padding: enough to clear the action cluster (inset + cluster height ~42px + gap)
  const listTopPad = insets.top + 60;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient colors={["#EFF6FF", "transparent"]} style={styles.topAura} />

      {/* Action cluster — fixed overlay, below the status bar */}
      <View style={[styles.actionsCluster, { top: clusterTop }]}>
        <Pressable
          style={[styles.headerButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate("Discover")}
        >
          <Search size={18} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          style={[styles.headerButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Bell size={18} color={theme.colors.primary} />
        </Pressable>
      </View>

      {loadingState ? (
        <View style={[styles.loadingWrap, { paddingTop: listTopPad + 14 }]}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View
              key={`skeleton-${index}`}
              style={[styles.loadingCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            >
              <LoadingSkeleton width={140} height={16} />
              <View style={styles.loadingGap} />
              <LoadingSkeleton width="100%" height={12} />
              <View style={styles.loadingGap} />
              <LoadingSkeleton width="90%" height={12} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.listContent, { paddingTop: listTopPad }]}
          onEndReached={fetchMoreFeed}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshFeed} tintColor={theme.colors.primary} />}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <GlassCard style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Sparkles size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Your feed is ready</Text>
              <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>
                Follow professionals, explore cases, or publish the first update for your network.
              </Text>
            </GlassCard>
          }
          showsVerticalScrollIndicator={false}
          // ─── Performance props ───────────────────────────────────────
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
        />
      )}

      <Pressable
        onPress={() => navigation.navigate("CreatePost")}
        style={[styles.createButtonWrap, { bottom: insets.bottom + 20 }]}
      >
        <LinearGradient colors={theme.gradients.primary} style={[styles.createButton, theme.shadow.floating]}>
          <Plus size={22} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  topAura: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 240
  },
  actionsCluster: {
    position: "absolute",
    right: 18,
    flexDirection: "row",
    gap: 10,
    zIndex: 20
  },
  headerButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120
  },
  headerWrap: {
    marginBottom: 18
  },
  emptyCard: {
    marginTop: 8,
    alignItems: "center"
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37, 99, 235, 0.12)"
  },
  emptyTitle: {
    marginTop: 12,
    textAlign: "center",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18
  },
  emptyBody: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 27,
    lineHeight: 34
  },
  headerSubtitle: {
    marginTop: 8,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21
  },
  createButtonWrap: {
    position: "absolute",
    right: 18
  },
  createButton: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingWrap: {
    paddingHorizontal: 16,
    gap: 12
  },
  loadingCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14
  },
  loadingGap: {
    height: 8
  }
});
