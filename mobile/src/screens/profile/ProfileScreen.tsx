import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Grid2x2, List, MapPin, Briefcase, Star, Camera, ImagePlus, ChevronLeft, Image as ImageIcon, Stethoscope, MessageSquare, Info, Menu } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { Avatar } from "@/components/common/Avatar";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { AnimatedButton } from "@/components/common/AnimatedButton";
import { PostCard } from "@/components/feed/PostCard";
import { followUserRequest, getUserProfile, getUserPosts, unfollowUserRequest, updateUserProfile } from "@/services/api/userApi";
import { uploadImageRequest } from "@/services/api/uploadApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useFeedStore } from "@/store/feedStore";
import type { RootStackParamList } from "@/navigation/types";
import type { Post, User } from "@/types/models";
import { hapticTap } from "@/utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 3) / 3;
const COVER_HEIGHT = 220;
const AVATAR_SIZE = 88;

const TABS = ["Posts", "Cases", "Media", "About"] as const;
type TabType = typeof TABS[number];
type ProfileRoute = RouteProp<Record<string, { userId?: string } | undefined>, string>;

/** Pick image from library and return local URI */
async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission required", "Please allow photo library access to upload images.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.85
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

export function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ProfileRoute>();

  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateSessionUser = useAuthStore((s) => s.updateUser);
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const openOrCreateConversation = useChatStore((s) => s.openOrCreateConversation);

  const viewedUserId = route.params?.userId ?? authUser?._id ?? "";
  const isCurrentUser = !route.params?.userId || route.params.userId === authUser?._id;

  const [tab, setTab] = useState<TabType>("Posts");
  const [gridMode, setGridMode] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(authUser);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const deletePost = useFeedStore((s) => s.deletePost);
  const joinCaseDiscussion = useChatStore((s) => s.joinCaseDiscussion);

  const loadProfile = useCallback(async () => {
    if (!viewedUserId) return;
    if (isCurrentUser && authUser) {
      setProfileUser(authUser);
    } else {
      setLoadingProfile(true);
      try { setProfileUser(await getUserProfile(viewedUserId)); }
      finally { setLoadingProfile(false); }
    }
    setLoadingPosts(true);
    try { setPosts(await getUserPosts(viewedUserId)); }
    finally { setLoadingPosts(false); }
  }, [authUser, isCurrentUser, viewedUserId]);

  useFocusEffect(useCallback(() => { void loadProfile(); }, [loadProfile]));

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const stats = useMemo(() => ({
    posts: posts.length,
    followers: profileUser?.followers?.length || 0,
    following: profileUser?.following?.length || 0,
    reputation: profileUser?.reputationScore || 0
  }), [posts.length, profileUser]);

  const isFollowing = !!authUser?._id && !!profileUser?.followers?.includes(authUser._id);

  // ── Image upload handlers ─────────────────────────────────────────────────

  const handleChangeAvatar = async () => {
    const uri = await pickImage();
    if (!uri) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImageRequest(uri);
      const updated = await updateUserProfile({ profileImage: url });
      setProfileUser(updated);
      await updateSessionUser({ profileImage: url });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not update profile photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangeCover = async () => {
    const uri = await pickImage();
    if (!uri) return;
    setUploadingCover(true);
    try {
      const url = await uploadImageRequest(uri);
      const updated = await updateUserProfile({ coverImage: url });
      setProfileUser(updated);
      await updateSessionUser({ coverImage: url });
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not update cover photo.");
    } finally {
      setUploadingCover(false);
    }
  };

  // ── Relationship & nav ────────────────────────────────────────────────────

  const handleRelationshipToggle = useCallback(async () => {
    if (!profileUser?._id || !authUser?._id || isCurrentUser) return;
    setRelationshipBusy(true);
    try {
      const response = isFollowing
        ? await unfollowUserRequest(profileUser._id)
        : await followUserRequest(profileUser._id);
      setProfileUser(response.target);
      await updateSessionUser(response.viewer);
    } finally { setRelationshipBusy(false); }
  }, [authUser?._id, isCurrentUser, isFollowing, profileUser?._id, updateSessionUser]);

  const handleMessage = useCallback(async () => {
    if (!profileUser?._id || isCurrentUser) return;
    setMessageBusy(true);
    try {
      const conv = await openOrCreateConversation(profileUser._id);
      navigation.navigate("ChatScreen", { conversationId: conv._id, title: profileUser.name });
    } finally { setMessageBusy(false); }
  }, [isCurrentUser, navigation, openOrCreateConversation, profileUser]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      "Log out",
      "You will need to sign in again to continue.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: () => { void logout(); } }
      ]
    );
  }, [logout]);

  const openSettings = useCallback(() => {
    navigation.navigate("Settings");
  }, [navigation]);

  const openComments = useCallback((post: Post) => {
    navigation.navigate("Comments", { postId: post._id, title: post.userId.name });
  }, [navigation]);

  const sharePost = useCallback(async (post: Post) => {
    const author = post.isAnonymous && post.type === "case" ? "Anonymous Case" : post.userId.name;
    await Share.share({ title: "Doctor's App Post", message: `${author} shared:\n\n${post.content}` });
  }, []);

  const handleJoinDiscussion = useCallback(async (post: Post) => {
    try {
      const conv = await joinCaseDiscussion(post._id);
      navigation.navigate("ChatScreen", { conversationId: conv._id, title: conv.title || "Case Discussion" });
    } catch (e) {}
  }, [joinCaseDiscussion, navigation]);

  const filteredPosts = useMemo(() => {
    if (tab === "Posts") return posts.filter(p => !!p.mediaUrl || (p.reportImages && p.reportImages.length > 0));
    if (tab === "Cases") return posts.filter(p => p.type === "case");
    if (tab === "Media") return posts.filter(p => p.type === "text" && !p.mediaUrl);
    return [];
  }, [posts, tab]);

  if (!profileUser || (loadingProfile && !isCurrentUser)) {
    return (
      <View style={[styles.loadingState, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const coverUri = profileUser.coverImage || "";

  const renderGridItem = ({ item }: { item: Post }) => {
    const mediaUri = item.mediaUrl || item.reportImages?.[0];
    return (
      <Pressable style={styles.gridItem} onPress={() => openComments(item)}>
        {mediaUri ? (
          <Image source={{ uri: mediaUri }} style={{ width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE }} contentFit="cover" />
        ) : (
          <View style={[styles.gridTextTile, { backgroundColor: theme.colors.primaryLight }]}>
            <Text style={[styles.gridTextContent, { color: theme.colors.primary }]} numberOfLines={4}>{item.content}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>

        {/* ── Cover photo ──────────────────────────────────────────────────── */}
        <View style={[styles.coverWrap, { height: COVER_HEIGHT + insets.top }]}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={["#1E40AF", "#2563EB", "#06B6D4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Dim overlay for legibility */}
          <View style={styles.coverOverlay} />

          {/* Back button */}
          {!isCurrentUser && (
            <Pressable
              style={[styles.backBtn, { top: insets.top + 10 }]}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          )}

          {/* Cover change button (own profile only) */}
          {isCurrentUser && (
            <View style={[styles.coverActions, { top: insets.top + 10 }]}>
              <Pressable
                style={styles.menuBtn}
                onPress={openSettings}
              >
                <Menu size={18} color="#FFFFFF" strokeWidth={2.2} />
              </Pressable>
              <Pressable
                style={styles.coverEditBtn}
                onPress={() => void handleChangeCover()}
                disabled={uploadingCover}
              >
                {uploadingCover ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <ImagePlus size={14} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.coverEditText}>Edit Cover</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Avatar + actions block ────────────────────────────────────────── */}
        <View style={[styles.profileInfoBlock, { marginTop: -(AVATAR_SIZE / 2 + 4), backgroundColor: theme.colors.surface, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 }]}>
          <View style={styles.profileIdentityColumn}>
            <View>
              <View style={[styles.avatarRing, { borderColor: theme.colors.surface }]}>
                <Avatar
                  name={profileUser.name}
                  uri={profileUser.profileImage}
                  size={AVATAR_SIZE}
                  verified={false}
                />
              </View>
              {isCurrentUser && (
                <Pressable
                  style={styles.avatarEditBtn}
                  onPress={() => void handleChangeAvatar()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Camera size={13} color="#FFFFFF" strokeWidth={2.5} />
                  )}
                </Pressable>
              )}
            </View>

            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>{profileUser.name}</Text>
              {profileUser.isVerified ? <VerifiedBadge size={16} /> : null}
            </View>

            <View style={styles.userMetaRow}>
              {profileUser.specialization ? (
                <View style={styles.metaChip}>
                  <Star size={12} color={theme.colors.primary} strokeWidth={2} />
                  <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{profileUser.specialization}</Text>
                </View>
              ) : null}
              {profileUser.hospital ? (
                <View style={styles.metaChip}>
                  <MapPin size={12} color={theme.colors.textSecondary} strokeWidth={2} />
                  <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{profileUser.hospital}</Text>
                </View>
              ) : null}
              {profileUser.experience ? (
                <View style={styles.metaChip}>
                  <Briefcase size={12} color={theme.colors.textSecondary} strokeWidth={2} />
                  <Text style={[styles.metaChipText, { color: theme.colors.textSecondary }]}>{profileUser.experience} yrs</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Stats Horizontal Row */}
          <View style={styles.statsRow}>
            {[
              { label: "Posts", value: stats.posts, accent: false },
              { label: "Followers", value: stats.followers, accent: false },
              { label: "Following", value: stats.following, accent: false },
              { label: "Rep.", value: stats.reputation, accent: true }
            ].map((stat, index) => (
              <React.Fragment key={stat.label}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: stat.accent ? theme.colors.primary : theme.colors.textPrimary }]}>
                    {stat.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{stat.label}</Text>
                </View>
                {index < 3 && <View style={[styles.statDivider, { backgroundColor: theme.colors.borderLight }]} />}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.profileActionsRow}>
            {!isCurrentUser ? (
              <>
                <AnimatedButton
                  title={isFollowing ? "Following" : "Follow"}
                  variant={isFollowing ? "secondary" : "primary"}
                  loading={relationshipBusy}
                  onPress={handleRelationshipToggle}
                  style={styles.actionBtnFull}
                />
                <AnimatedButton title="Message" variant="ghost" loading={messageBusy} onPress={handleMessage} style={styles.actionBtnHalf} />
              </>
            ) : (
              <>
                <AnimatedButton
                  title="Edit Profile"
                  variant="primary"
                  onPress={openSettings}
                  style={styles.actionBtnFull}
                />
                {authUser?.role === "admin" ? (
                  <AnimatedButton title="Admin" variant="secondary" onPress={() => navigation.navigate("AdminPanel" as never)} style={styles.actionBtnHalf} />
                ) : null}
              </>
            )}
          </View>
        </View>

        {/* ── Sticky tab bar ──────────────────────────────────────────────── */}
        <View style={[styles.tabsBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
          <View style={styles.tabsInner}>
            {TABS.map((tabItem) => {
            const active = tabItem === tab;
            let Icon = Grid2x2;
            if (tabItem === "Cases") Icon = Stethoscope;
            if (tabItem === "Media") Icon = ImageIcon;
            if (tabItem === "About") Icon = Info;

            return (
              <Pressable
                key={tabItem}
                onPress={() => { hapticTap(); setTab(tabItem); }}
                style={({ pressed }) => [styles.tabBtn, active && styles.tabBtnActive, pressed && styles.tabBtnPressed]}
              >
                <Icon size={18} color={active ? theme.colors.primary : theme.colors.textTertiary} strokeWidth={active ? 2.5 : 2} />
                <Text style={[styles.tabText, { color: active ? theme.colors.primary : theme.colors.textTertiary }]}>{tabItem}</Text>
              </Pressable>
            );
          })}
          </View>
        </View>

        {/* ── Content Area ─────────────────────────────────────────────────── */}
        <View style={{ flex: 1 }}>
          {tab === "Posts" ? (
            <View style={styles.gridContainer}>
              {loadingPosts ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} /> :
                filteredPosts.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No media posts yet.</Text>
                ) : (
                  <FlatList
                    data={filteredPosts}
                    keyExtractor={(item) => item._id}
                    numColumns={3}
                    scrollEnabled={false}
                    renderItem={renderGridItem}
                    ItemSeparatorComponent={() => <View style={{ height: 1.5, backgroundColor: theme.colors.surface }} />}
                  />
                )
              }
            </View>
          ) : (tab === "Cases" || tab === "Media") ? (
            <View style={{ paddingBottom: 120 }}>
              {loadingPosts ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} /> :
                filteredPosts.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No {tab.toLowerCase()} yet.</Text>
                ) : filteredPosts.map((item) => (
                  <PostCard 
                    key={item._id} 
                    post={item} 
                    currentUserId={authUser?._id} 
                    onLike={(postId) => { void toggleLike(postId); }} 
                    onComment={openComments} 
                    onShare={sharePost}
                    onDelete={(post) => { void deletePost(post._id); }}
                    onJoinDiscussion={handleJoinDiscussion}
                    isAdmin={authUser?.role === "admin"}
                  />
                ))
              }
            </View>
          ) : null}
        </View>

        {/* ── About tab ───────────────────────────────────────────────────── */}
        {tab === "About" ? (
          <View style={[styles.aboutWrap, { backgroundColor: theme.colors.surface }]}>
            {[
              { label: "Role", value: profileUser.role },
              { label: "Specialization", value: profileUser.specialization || "Not set" },
              { label: "Hospital", value: profileUser.hospital || "Not set" },
              { label: "Experience", value: profileUser.experience ? `${profileUser.experience} years` : "Not set" }
            ].map((row) => (
              <View key={row.label} style={[styles.aboutRow, { borderBottomColor: theme.colors.borderLight }]}>
                <Text style={[styles.aboutLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.aboutValue, { color: theme.colors.textPrimary }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Cover
  coverWrap: { width: "100%", position: "relative", overflow: "hidden" },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.15)" },
  backBtn: {
    position: "absolute",
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center"
  },
  coverEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20
  },
  coverActions: {
    position: "absolute",
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center"
  },
  coverEditText: { color: "#FFFFFF", fontFamily: "Manrope_700Bold", fontSize: 12 },
  // Profile info
  profileInfoBlock: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  profileIdentityColumn: { alignItems: "center" },
  avatarRing: { borderWidth: 3, borderRadius: 999, padding: 2 },
  avatarEditBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  userNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14 },
  userName: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 24 },
  userMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10, justifyContent: "center" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaChipText: { fontFamily: "Manrope_500Medium", fontSize: 13, textTransform: "capitalize" },
  
  // Horizontal Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC", // Fallback, will be overridden by theme
    borderWidth: 1,
    borderColor: "#F1F5F9"
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  statDivider: {
    width: 1,
    height: "60%"
  },
  statValue: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 },
  statLabel: { fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 4 },
  
  // Actions
  profileActionsRow: { flexDirection: "row", gap: 10, justifyContent: "center" },
  actionBtnFull: { flex: 1 },
  actionBtnHalf: { flex: 0.45 },
  // Tabs
  tabsBar: { borderBottomWidth: 1, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 },
  tabsInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4
  },
  tabBtnActive: { backgroundColor: "rgba(37,99,235,0.08)" },
  tabBtnPressed: { opacity: 0.86 },
  tabText: { fontFamily: "Manrope_700Bold", fontSize: 12 },
  gridToggle: { padding: 14 },
  // Grid
  gridContainer: { minHeight: 100 },
  gridItem: { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE },
  gridTextTile: { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, padding: 8, justifyContent: "center" },
  gridTextContent: { fontFamily: "Manrope_500Medium", fontSize: 11, lineHeight: 17 },
  emptyText: { textAlign: "center", fontFamily: "Manrope_500Medium", marginTop: 32 },
  // About
  aboutWrap: { paddingVertical: 8, marginTop: 8 },
  aboutRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1 },
  aboutLabel: { fontFamily: "Manrope_700Bold", fontSize: 13, textTransform: "capitalize" },
  aboutValue: { fontFamily: "Manrope_500Medium", fontSize: 14, textTransform: "capitalize" },
  activityWrap: { padding: 18 },
  activityText: { fontFamily: "Manrope_500Medium", fontSize: 15, lineHeight: 24 }
});
