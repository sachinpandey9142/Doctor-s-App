import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { useChatStore } from "@/store/chatStore";
import { hapticTap } from "@/utils/haptics";
import type { Post } from "@/types/models";

type FilterType = "All" | "Cases" | "Media" | "Text";
const FILTERS: FilterType[] = ["All", "Cases", "Media", "Text"];

function SkeletonCard({ colors }: { colors: { surface: string } }) {
  return (
    <View style={[skeletonStyles.card, { backgroundColor: colors.surface }]}>
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const user = useAuthStore((state) => state.user);
  const { posts, loading, refreshing, fetchInitialFeed, fetchMoreFeed, refreshFeed, toggleLike, deletePost } =
    useFeedStore((state) => state);
  const joinCaseDiscussion = useChatStore((s) => s.joinCaseDiscussion);

  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const skeletonOpacity = useRef(new RNAnimated.Value(1)).current;
  const prevLoadingRef = useRef(loading);
  const headerScrollY = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      RNAnimated.timing(skeletonOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
    prevLoadingRef.current = loading;
  }, [loading, skeletonOpacity]);

  useEffect(() => { fetchInitialFeed(); }, [fetchInitialFeed]);

  const filteredPosts = useMemo(() => {
    if (activeFilter === "All") return posts;
    if (activeFilter === "Cases") return posts.filter((p) => p.type === "case");
    if (activeFilter === "Media") return posts.filter((p) => p.type === "image" || p.type === "video" || !!p.mediaUrl);
    return posts.filter((p) => p.type === "text");
  }, [posts, activeFilter]);

  const openComments = useCallback((post: Post) => {
    navigation.navigate("Comments", {
      postId: post._id,
      title: post.isAnonymous && post.type === "case" ? "Anonymous Case" : post.userId.name
    });
  }, [navigation]);

  const openProfile = useCallback((post: Post) => {
    const targetId = !post.userId?._id || post.userId._id === user?._id ? user?._id : post.userId._id;
    navigation.navigate("UserProfile", { userId: targetId || post.userId._id });
  }, [navigation, user?._id]);

  const handleJoinDiscussion = useCallback(async (post: Post) => {
    try {
      const conv = await joinCaseDiscussion(post._id);
      navigation.navigate("CaseDiscussionThread", {
        conversationId: conv._id,
        title: conv.title || "Case Discussion",
        caseAuthor: post.isAnonymous ? "Anonymous" : post.userId.name,
        caseSnippet: post.content
      });
    } catch (e) {}
  }, [joinCaseDiscussion, navigation]);

  const handleViewCase = useCallback((post: Post) => {
    navigation.navigate("CaseDetail", { post });
  }, [navigation]);

  const renderItem = useCallback(({ item, index }: { item: Post; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 200)).duration(280).springify()}>
      <PostCard
        post={item}
        currentUserId={user?._id}
        onLike={toggleLike}
        onComment={openComments}
        onAuthorPress={openProfile}
        onDelete={deletePost}
        onJoinDiscussion={handleJoinDiscussion}
        onViewCase={handleViewCase}
        isAdmin={user?.role === "admin"}
      />
    </Animated.View>
  ), [deletePost, handleJoinDiscussion, handleViewCase, openComments, openProfile, toggleLike, user?._id, user?.role]);

  const skeletonColors = useMemo(() => ({ surface: theme.colors.surface }), [theme.colors]);

  // Header white bg fades in as user scrolls
  const headerBgOpacity = headerScrollY.interpolate({ inputRange: [0, 50], outputRange: [0, 1], extrapolate: "clamp" });
  const headerBorderOpacity = headerScrollY.interpolate({ inputRange: [20, 60], outputRange: [0, 1], extrapolate: "clamp" });
  const headerTopPad = insets.top;
  const listTopPad = headerTopPad + 112;
  const showSkeleton = loading && posts.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Fixed header ──────────────────────────────────────── */}
      <View style={[styles.headerWrap, { paddingTop: headerTopPad }]}>
        {/* Animated white bg on scroll */}
        <RNAnimated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: theme.colors.surface, opacity: headerBgOpacity }
          ]}
        />
        {/* Animated bottom border on scroll */}
        <RNAnimated.View
          style={[
            styles.headerBorder,
            { borderBottomColor: theme.colors.border, opacity: headerBorderOpacity }
          ]}
        />

        {/* Brand + actions */}
        <View style={styles.headerInner}>
          <View style={styles.brandRow}>
            <LinearGradient
              colors={["#2563EB", "#06B6D4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brandIcon}
            >
              <Activity size={15} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
            <Text style={[styles.brandName, { color: theme.colors.textPrimary }]}>MediSync</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.headerBtn,
                { backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.surface, borderColor: theme.colors.border }
              ]}
              onPress={() => { hapticTap(); navigation.navigate("Discover"); }}
            >
              <Search size={17} color={theme.colors.textPrimary} strokeWidth={2} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.headerBtn,
                { backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.surface, borderColor: theme.colors.border }
              ]}
              onPress={() => { hapticTap(); navigation.navigate("Notifications"); }}
            >
              <Bell size={17} color={theme.colors.textPrimary} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {/* Filter chips */}
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
                onPress={() => { hapticTap(); setActiveFilter(filter); }}
                style={[
                  styles.filterChip,
                  active
                    ? styles.filterChipActive
                    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }
                ]}
              >
                {active ? (
                  <LinearGradient
                    colors={["#2563EB", "#06B6D4"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterChipGrad}
                  >
                    <Text style={[styles.filterText, { color: "#FFFFFF" }]}>{filter}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={[styles.filterText, { color: theme.colors.textSecondary }]}>{filter}</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Feed / Skeleton ──────────────────────────────────── */}
      {showSkeleton ? (
        <RNAnimated.View style={{ paddingTop: listTopPad, flex: 1, opacity: skeletonOpacity }}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} colors={skeletonColors} />)}
        </RNAnimated.View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.listContent, { paddingTop: listTopPad }]}
          onEndReached={fetchMoreFeed}
          onEndReachedThreshold={0.5}
          onScroll={RNAnimated.event(
            [{ nativeEvent: { contentOffset: { y: headerScrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshFeed}
              tintColor={theme.colors.primary}
              progressViewOffset={listTopPad}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Activity size={30} color={theme.colors.primary} />}
              title="No posts yet"
              body="Follow medical professionals or publish the first post."
              ctaLabel="Explore Professionals"
              onCta={() => navigation.navigate("Discover")}
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

      {/* ── FAB ─────────────────────────────────────────────── */}
      <Pressable
        onPress={() => { hapticTap(); navigation.navigate("CreatePost"); }}
        style={({ pressed }) => [styles.fabWrap, { bottom: insets.bottom + 86, opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={["#2563EB", "#06B6D4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  headerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4
  },
  headerBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  brandName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    letterSpacing: -0.4
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  // Filter chips
  filterList: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 7,
    flexDirection: "row"
  },
  filterChip: {
    borderRadius: 999,
    overflow: "hidden"
  },
  filterChipActive: {
    borderRadius: 999,
    overflow: "hidden"
  },
  filterChipGrad: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999
  },
  filterText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 7
  },
  // Feed
  listContent: { paddingBottom: 120 },
  // FAB
  fabWrap: { position: "absolute", right: 16 },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 12
  }
});

const skeletonStyles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 18,
    paddingTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 6
  },
  meta: { flex: 1 }
});
