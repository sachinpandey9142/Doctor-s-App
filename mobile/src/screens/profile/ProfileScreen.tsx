import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import { AnimatedButton } from "@/components/common/AnimatedButton";
import { PostCard } from "@/components/feed/PostCard";
import { followUserRequest, getUserProfile, getUserPosts, unfollowUserRequest } from "@/services/api/userApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useFeedStore } from "@/store/feedStore";
import type { RootStackParamList } from "@/navigation/types";
import type { Post, User } from "@/types/models";

const tabs = ["Posts", "About", "Activity"] as const;
type TabType = (typeof tabs)[number];
type ProfileRoute = RouteProp<Record<string, { userId?: string } | undefined>, string>;

export function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ProfileRoute>();

  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateSessionUser = useAuthStore((state) => state.updateUser);
  const toggleLike = useFeedStore((state) => state.toggleLike);
  const openOrCreateConversation = useChatStore((state) => state.openOrCreateConversation);

  const viewedUserId = route.params?.userId ?? authUser?._id ?? "";
  const isCurrentUser = !route.params?.userId || route.params.userId === authUser?._id;

  const [tab, setTab] = useState<TabType>("Posts");
  const [profileUser, setProfileUser] = useState<User | null>(authUser);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!viewedUserId) return;

    if (isCurrentUser && authUser) {
      setProfileUser(authUser);
    } else {
      setLoadingProfile(true);
      try {
        const user = await getUserProfile(viewedUserId);
        setProfileUser(user);
      } finally {
        setLoadingProfile(false);
      }
    }

    setLoadingPosts(true);
    try {
      const items = await getUserPosts(viewedUserId);
      setPosts(items);
    } finally {
      setLoadingPosts(false);
    }
  }, [authUser, isCurrentUser, viewedUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  useLayoutEffect(() => {
    if (!isCurrentUser && profileUser?.name) {
      navigation.setOptions({ title: profileUser.name });
    }
  }, [isCurrentUser, navigation, profileUser?.name]);

  const stats = useMemo(
    () => ({
      posts: posts.length,
      followers: profileUser?.followers?.length || 0,
      following: profileUser?.following?.length || 0,
      reputation: profileUser?.reputationScore || 0
    }),
    [posts.length, profileUser?.followers?.length, profileUser?.following?.length, profileUser?.reputationScore]
  );

  const isFollowing = !!authUser?._id && !!profileUser?.followers?.includes(authUser._id);

  const handleRelationshipToggle = useCallback(async () => {
    if (!profileUser?._id || !authUser?._id || isCurrentUser) return;

    setRelationshipBusy(true);
    try {
      const response = isFollowing
        ? await unfollowUserRequest(profileUser._id)
        : await followUserRequest(profileUser._id);
      setProfileUser(response.target);
      await updateSessionUser(response.viewer);
    } finally {
      setRelationshipBusy(false);
    }
  }, [authUser?._id, isCurrentUser, isFollowing, profileUser?._id, updateSessionUser]);

  const handleMessage = useCallback(async () => {
    if (!profileUser?._id || isCurrentUser) return;

    setMessageBusy(true);
    try {
      const conversation = await openOrCreateConversation(profileUser._id);
      navigation.navigate("ChatScreen", { conversationId: conversation._id, title: profileUser.name });
    } finally {
      setMessageBusy(false);
    }
  }, [isCurrentUser, navigation, openOrCreateConversation, profileUser?._id, profileUser?.name]);

  const openComments = useCallback(
    (post: Post) => {
      navigation.navigate("Comments", {
        postId: post._id,
        title: post.isAnonymous && post.type === "case" ? "Anonymous Case" : post.userId.name
      });
    },
    [navigation]
  );

  const sharePost = useCallback(async (post: Post) => {
    const author = post.isAnonymous && post.type === "case" ? "Anonymous Case" : post.userId.name;
    await Share.share({ title: "Doctor,s App Post", message: `${author} shared:\n\n${post.content}` });
  }, []);

  if (!profileUser || (loadingProfile && !isCurrentUser)) {
    return (
      <View style={[styles.loadingState, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Gradient header — paddingTop includes the safe area so avatar sits below notch */}
      <LinearGradient
        colors={theme.gradients.profile}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <Avatar name={profileUser.name} uri={profileUser.profileImage} size={84} verified={profileUser.isVerified} />
        <Text style={styles.userName}>{profileUser.name}</Text>
        <Text style={styles.userMeta}>
          {profileUser.role} | {profileUser.specialization || "Medical Professional"}
        </Text>
      </LinearGradient>

      <View style={styles.statsWrap}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.posts}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Posts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.followers}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Followers</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.reputation}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Reputation</Text>
        </View>
      </View>

      {!isCurrentUser ? (
        <View style={styles.actionRow}>
          <AnimatedButton
            title={isFollowing ? "Following" : "Follow"}
            variant={isFollowing ? "secondary" : "primary"}
            loading={relationshipBusy}
            onPress={handleRelationshipToggle}
            style={styles.actionButton}
          />
          <AnimatedButton title="Message" variant="ghost" loading={messageBusy} onPress={handleMessage} style={styles.actionButton} />
        </View>
      ) : null}

      <View style={styles.tabsWrap}>
        {tabs.map((tabItem) => {
          const active = tabItem === tab;
          return (
            <Pressable
              key={tabItem}
              onPress={() => setTab(tabItem)}
              style={[styles.tabItem, { backgroundColor: active ? theme.colors.primary : "transparent", borderColor: active ? theme.colors.primary : theme.colors.border }]}
            >
              <Text style={[styles.tabText, { color: active ? "#FFFFFF" : theme.colors.textSecondary }]}>
                {tabItem}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "Posts" ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.postsContainer}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={authUser?._id}
              onLike={toggleLike}
              onComment={openComments}
              onShare={sharePost}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {loadingPosts ? "Loading posts..." : "No posts published yet."}
            </Text>
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
        />
      ) : null}

      {tab === "About" ? (
        <ScrollView contentContainerStyle={styles.aboutWrap}>
          <Text style={[styles.aboutTitle, { color: theme.colors.textPrimary }]}>Professional Details</Text>
          <Text style={[styles.aboutLine, { color: theme.colors.textSecondary }]}>Role: {profileUser.role}</Text>
          <Text style={[styles.aboutLine, { color: theme.colors.textSecondary }]}>Specialization: {profileUser.specialization || "Not set"}</Text>
          <Text style={[styles.aboutLine, { color: theme.colors.textSecondary }]}>Hospital: {profileUser.hospital || "Not set"}</Text>
          <Text style={[styles.aboutLine, { color: theme.colors.textSecondary }]}>Experience: {profileUser.experience} years</Text>
          <Text style={[styles.aboutLine, { color: theme.colors.textSecondary }]}>Following: {stats.following}</Text>
        </ScrollView>
      ) : null}

      {tab === "Activity" ? (
        <View style={styles.activityWrap}>
          <Text style={[styles.activityTitle, { color: theme.colors.textPrimary }]}>
            {isCurrentUser ? "Activity Snapshot" : "Network Snapshot"}
          </Text>
          <Text style={[styles.activityLine, { color: theme.colors.textSecondary }]}>
            {isCurrentUser
              ? "Your profile engagement is growing. Keep sharing case insights to increase credibility."
              : `${profileUser.name} follows ${stats.following} professionals and has ${stats.followers} followers.`}
          </Text>
          {isCurrentUser ? (
            <AnimatedButton title="Logout" variant="secondary" onPress={logout} style={styles.logoutButton} />
          ) : (
            <AnimatedButton title="Message" variant="ghost" onPress={handleMessage} style={styles.logoutButton} />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerGradient: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, alignItems: "center", paddingBottom: 22 },
  userName: { marginTop: 12, color: "#FFFFFF", fontFamily: "SpaceGrotesk_700Bold", fontSize: 26 },
  userMeta: { marginTop: 6, color: "rgba(255,255,255,0.94)", fontFamily: "Manrope_500Medium", fontSize: 14, textTransform: "capitalize" },
  statsWrap: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 16 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 16, alignItems: "center", paddingVertical: 12 },
  statValue: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 },
  statLabel: { marginTop: 4, fontFamily: "Manrope_500Medium", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 14 },
  actionButton: { flex: 1 },
  tabsWrap: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 14 },
  tabItem: { flex: 1, borderWidth: 1, borderRadius: 999, alignItems: "center", paddingVertical: 10 },
  tabText: { fontFamily: "Manrope_700Bold", fontSize: 12 },
  postsContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },
  emptyText: { marginTop: 24, textAlign: "center", fontFamily: "Manrope_500Medium" },
  aboutWrap: { paddingHorizontal: 18, paddingTop: 18, gap: 10 },
  aboutTitle: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 19, marginBottom: 6 },
  aboutLine: { fontFamily: "Manrope_500Medium", fontSize: 15 },
  activityWrap: { paddingHorizontal: 18, paddingTop: 18 },
  activityTitle: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 20 },
  activityLine: { marginTop: 10, fontFamily: "Manrope_500Medium", fontSize: 15, lineHeight: 23 },
  logoutButton: { marginTop: 18 }
});
