import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated as RNAnimated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Activity, Bell, Plus, Search } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { PostCard } from "@/components/feed/PostCard";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/store/authStore";
import { useFeedStore } from "@/store/feedStore";
import { hapticTap } from "@/utils/haptics";
import type { Post } from "@/types/models";

// ── Skeleton card that exactly mirrors PostCard's structure ───────────────────
function SkeletonCard({ colors }: { colors: { surface: string; cardBorder: string; borderLight: string } }) {
  return (
    <View style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={styles.skeletonHeader}>
        <LoadingSkeleton width={42} height={42} borderRadius={21} />
        <View style={styles.skeletonMeta}>
          <LoadingSkeleton width={130} height={13} />
          <View style={{ height: 6 }} />
          <LoadingSkeleton width={88} height={11} />
        </View>
      </View>
      <View style={{ height: 14 }} />
      <LoadingSkeleton width="100%" height={12} />
      <View style={{ height: 8 }} />
      <LoadingSkeleton width="88%" height={12} />
      <View style={{ height: 8 }} />
      <LoadingSkeleton width="70%" height={12} />
      <View style={[styles.skeletonActions, { borderTopColor: colors.borderLight }]}>
        <LoadingSkeleton width={52} height={11} />
        <LoadingSkeleton width={60} height={11} />
        <LoadingSkeleton width={44} height={11} />
      </View>
    </View>
  );
}

export function HomeFeedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const user = useAuthStore((state) => state.user);
  const { posts, loading, refreshing, fetchInitialFeed, fetchMoreFeed, refreshFeed, toggleLike } =
    useFeedStore((state) => state);

  // ── Skeleton fade-out: when loading finishes the skeleton fades smoothly ──
  const skeletonOpacity = useRef(new RNAnimated.Value(1)).current;
  const prevLoadingRef = useRef(loading);

  useEffect(() => {
    // Trigger fade-out when loading goes from true → false
    if (prevLoadingRef.current && !loading) {
      RNAnimated.timing(skeletonOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true
      }).start();
    }
    prevLoadingRef.current = loading;
  }, [loading, skeletonOpacity]);

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
      <Animated.View entering={FadeInDown.delay(Math.min(index * 35, 210)).duration(280).springify()}>
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

  const skeletonColors = useMemo(
    () => ({
      surface: theme.colors.surface,
      cardBorder: theme.colors.cardBorder,
      borderLight: theme.colors.borderLight
    }),
    [theme.colors]
  );

  // ── Refined branded header ────────────────────────────────────────────────
  const listHeader = useMemo(
    () => (
      <LinearGradient colors={["#EFF6FF", theme.colors.background]} style={styles.feedHeader}>
        {/* Brand wordmark row */}
        <View style={styles.brandRow}>
          <View style={[styles.brandIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Activity size={15} color={theme.colors.primary} strokeWidth={2.5} />
          </View>
          <Text style={[styles.brandWordmark, { color: theme.colors.primary }]}>DOCTOR'S APP</Text>
        </View>

        <Text style={[styles.feedTitle, { color: theme.colors.textPrimary }]}>Clinical Feed</Text>
        <Text style={[styles.feedTagline, { color: theme.colors.textSecondary }]}>
          Verified medical voices · Case discussions · Latest updates
        </Text>
      </LinearGradient>
    ),
    [theme.colors]
  );

  const clusterTop = insets.top + 8;
  const listTopPad = insets.top + 56;

  const showSkeleton = loading && posts.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Fixed action cluster ─────────────────────────────────────── */}
      <View style={[styles.actionsCluster, { top: clusterTop }]}>
        <Pressable
          style={[styles.headerButton, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface }]}
          onPress={() => { hapticTap(); navigation.navigate("Discover"); }}
        >
          <Search size={17} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          style={[styles.headerButton, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface }]}
          onPress={() => { hapticTap(); navigation.navigate("Notifications"); }}
        >
          <Bell size={17} color={theme.colors.primary} />
        </Pressable>
      </View>

      {/* ── Skeleton (fades out when content loads) ─────────────────── */}
      {showSkeleton ? (
        <RNAnimated.View
          style={[
            styles.skeletonWrap,
            { paddingTop: listTopPad + 72, opacity: skeletonOpacity }
          ]}
        >
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} colors={skeletonColors} />
          ))}
        </RNAnimated.View>
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
              icon={<Activity size={30} color={theme.colors.primary} />}
              title="Your feed is empty"
              body="Follow medical professionals or publish the first post to get started."
              ctaLabel="Explore Professionals"
              onCta={() => navigation.navigate("Discover")}
              style={styles.emptyState}
            />
          }
          showsVerticalScrollIndicator={false}
          // ── Buttery smooth scroll ──────────────────────────────────
          decelerationRate="normal"
          overScrollMode="never"   // Android: removes over-scroll glow
          bounces                  // iOS: keep natural bounce
          initialNumToRender={5}
          maxToRenderPerBatch={4}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          // Avoid re-render of off-screen items on scroll position changes
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => { hapticTap(); navigation.navigate("CreatePost"); }}
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  // ── Branded header
  feedHeader: {
    paddingBottom: 16,
    paddingTop: 4
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10
  },
  brandIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  brandWordmark: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    letterSpacing: 1.8
  },
  feedTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28
  },
  feedTagline: {
    marginTop: 5,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20
  },
  // ── List
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 110
  },
  emptyState: { marginTop: 16 },
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
  skeletonMeta: { flex: 1 },
  skeletonActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 10
  },
  // ── FAB
  fabWrap: { position: "absolute", right: 16 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  }
});
