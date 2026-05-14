import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Grid2x2,
  Image as ImageIcon,
  Stethoscope,
  Info,
  Activity,
  UserRound,
  Briefcase,
  ClipboardPlus,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from "react-native-reanimated";

import { PostCard } from "@/components/feed/PostCard";
import { ProfileHighlightsRow } from "@/components/profile/ProfileHighlightsRow";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { ProfileStatsCard } from "@/components/profile/ProfileStatsCard";
import { ProfileSkeletonLoader } from "@/components/profile/ProfileSkeletonLoader";
import {
  followUserRequest,
  getUserProfile,
  getUserPosts,
  unfollowUserRequest,
  updateUserProfile,
} from "@/services/api/userApi";
import { uploadImageRequest } from "@/services/api/uploadApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useFeedStore } from "@/store/feedStore";
import {
  createMemoryCollectionRequest,
  getMemoryCollectionsRequest,
} from "@/services/api/memoryApi";
import type { RootStackParamList } from "@/navigation/types";
import type { MemoryCollection, Post, User } from "@/types/models";
import { hapticTap } from "@/utils/haptics";
import { useStaggeredEntry } from "@/hooks/useStaggeredEntry";
import { useCommentSheetStore } from "@/store/commentSheetStore";

import { theme } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 3) / 3;
const baseShadow = theme.shadow;

/** Split an array into chunks of `size` */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const TABS = ["Posts", "Cases", "Media", "About"] as const;
type TabType = (typeof TABS)[number];
type ProfileRoute = RouteProp<
  Record<string, { userId?: string } | undefined>,
  string
>;

/** Pick image from library and return local URI */
async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission required",
      "Please allow photo library access to upload images.",
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

export function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ProfileRoute>();

  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateSessionUser = useAuthStore((s) => s.updateUser);
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const openOrCreateConversation = useChatStore(
    (s) => s.openOrCreateConversation,
  );

  const viewedUserId = route.params?.userId ?? authUser?._id ?? "";
  const isCurrentUser =
    !route.params?.userId || route.params.userId === authUser?._id;

  const [tab, setTab] = useState<TabType>("Posts");
  const [gridMode, setGridMode] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(authUser);
  const [posts, setPosts] = useState<Post[]>([]);
  const [memoryCollections, setMemoryCollections] = useState<
    MemoryCollection[]
  >([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [createMemoryVisible, setCreateMemoryVisible] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const deletePost = useFeedStore((s) => s.deletePost);
  const joinCaseDiscussion = useChatStore((s) => s.joinCaseDiscussion);
  const openSheet = useCommentSheetStore((s) => s.openSheet);

  const loadProfile = useCallback(async () => {
    if (!viewedUserId) return;
    if (isCurrentUser && authUser) {
      setProfileUser(authUser);
    } else {
      setLoadingProfile(true);
      try {
        setProfileUser(await getUserProfile(viewedUserId));
      } finally {
        setLoadingProfile(false);
      }
    }
    setLoadingPosts(true);
    try {
      setPosts(await getUserPosts(viewedUserId));
    } finally {
      setLoadingPosts(false);
    }
    try {
      setMemoryCollections(await getMemoryCollectionsRequest(viewedUserId));
    } catch {
      setMemoryCollections([]);
    }
  }, [authUser, isCurrentUser, viewedUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    setBioExpanded(false);
  }, [viewedUserId]);

  const stats = useMemo(
    () => ({
      posts: posts.length,
      followers: profileUser?.followers?.length || 0,
      following: profileUser?.following?.length || 0,
    }),
    [posts.length, profileUser],
  );

  const isFollowing =
    !!authUser?._id && !!profileUser?.followers?.includes(authUser._id);

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
      Alert.alert(
        "Upload failed",
        e?.message ?? "Could not update profile photo.",
      );
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
      Alert.alert(
        "Upload failed",
        e?.message ?? "Could not update cover photo.",
      );
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
    } finally {
      setRelationshipBusy(false);
    }
  }, [
    authUser?._id,
    isCurrentUser,
    isFollowing,
    profileUser?._id,
    updateSessionUser,
  ]);

  const handleMessage = useCallback(async () => {
    if (!profileUser?._id || isCurrentUser) return;
    setMessageBusy(true);
    try {
      const conv = await openOrCreateConversation(profileUser._id);
      navigation.navigate("ChatScreen", {
        conversationId: conv._id,
        title: profileUser.name,
      });
    } finally {
      setMessageBusy(false);
    }
  }, [isCurrentUser, navigation, openOrCreateConversation, profileUser]);

  const handleLogout = useCallback(() => {
    Alert.alert("Log out", "You will need to sign in again to continue.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }, [logout]);

  const openSettings = useCallback(() => {
    navigation.navigate("Settings");
  }, [navigation]);

  const openFollowers = useCallback(() => {
    navigation.navigate("Followers", {
      userId: viewedUserId,
      kind: "followers",
    });
  }, [navigation, viewedUserId]);

  const openFollowing = useCallback(() => {
    navigation.navigate("Following", {
      userId: viewedUserId,
      kind: "following",
    });
  }, [navigation, viewedUserId]);

  const openComments = useCallback(
    (post: Post) => {
      const title =
        post.isAnonymous && post.type === "case"
          ? "Anonymous Case"
          : post.userId.name;
      openSheet(post._id, title);
    },
    [openSheet],
  );

  const openCreateMemory = useCallback(() => {
    setNewCollectionTitle("");
    setCreateMemoryVisible(true);
  }, []);

  const handleCreateMemory = useCallback(async () => {
    const title = newCollectionTitle.trim();
    if (!title) return;

    setCreatingCollection(true);
    try {
      const created = await createMemoryCollectionRequest({
        title,
        visibility: isCurrentUser ? "public" : "followers",
      });
      setMemoryCollections((current) => [created, ...current]);
      setCreateMemoryVisible(false);
      setNewCollectionTitle("");
      navigation.navigate("MemoryCollection", {
        collectionId: created._id,
        title: created.title,
        userId: created.userId,
      });
    } finally {
      setCreatingCollection(false);
    }
  }, [isCurrentUser, navigation, newCollectionTitle]);

  const highlightItems = useMemo(() => {
    return memoryCollections.map((collection) => ({
      id: collection._id,
      userId: collection.userId,
      title: collection.title,
      coverUri:
        collection.coverImage ||
        profileUser?.coverImage ||
        profileUser?.profileImage,
      itemCount: collection.itemCount,
      date: collection.updatedAt,
      visibility: collection.visibility,
      onPress: () =>
        navigation.navigate("MemoryCollection", {
          collectionId: collection._id,
          title: collection.title,
          userId: collection.userId,
        }),
    }));
  }, [
    memoryCollections,
    navigation,
    profileUser?.coverImage,
    profileUser?.profileImage,
  ]);

  const sharePost = useCallback(async (post: Post) => {
    const author =
      post.isAnonymous && post.type === "case"
        ? "Anonymous Case"
        : post.userId.name;
    await Share.share({
      title: "Doctor's App Post",
      message: `${author} shared:\n\n${post.content}`,
    });
  }, []);

  const handleJoinDiscussion = useCallback(
    async (post: Post) => {
      try {
        const conv = await joinCaseDiscussion(post._id);
        navigation.navigate("ChatScreen", {
          conversationId: conv._id,
          title: conv.title || "Case Discussion",
        });
      } catch (e) {}
    },
    [joinCaseDiscussion, navigation],
  );

  const filteredPosts = useMemo(() => {
    if (tab === "Posts")
      return posts.filter(
        (p) => !!p.mediaUrl || (p.reportImages && p.reportImages.length > 0),
      );
    if (tab === "Cases") return posts.filter((p) => p.type === "case");
    if (tab === "Media")
      return posts.filter((p) => p.type === "text" && !p.mediaUrl);
    return [];
  }, [posts, tab]);

  // ── Scroll parallax ──────────────────────────────────────────────────────
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      scrollY.value = event.contentOffset.y;
    },
  });

  // Banner parallax — slides up at 35% of scroll speed
  const bannerParallaxStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 120],
          [0, -18],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Hero composition fades as user scrolls into tabs
  const heroFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, 90],
      [1, 0.82],
      Extrapolation.CLAMP,
    ),
  }));

  // ── Section stagger entry styles ──────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const heroStagger = useStaggeredEntry(0, { staggerMs: 70 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const statsStagger = useStaggeredEntry(1, { staggerMs: 70 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const btnStagger = useStaggeredEntry(2, { staggerMs: 70 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const memStagger = useStaggeredEntry(3, { staggerMs: 70 });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const tabsStagger = useStaggeredEntry(4, { staggerMs: 70 });

  // ── Animated tab indicator ────────────────────────────────────────────────
  const tabIndicatorX = useSharedValue(0);
  const TAB_WIDTH = (SCREEN_WIDTH - 32) / TABS.length;

  const handleTabPress = useCallback(
    (tabItem: TabType) => {
      hapticTap();
      setTab(tabItem);
      const newIndex = TABS.indexOf(tabItem);
      tabIndicatorX.value = withSpring(newIndex * TAB_WIDTH, {
        damping: 18,
        stiffness: 200,
      });
    },
    [tabIndicatorX, TAB_WIDTH],
  );

  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));

  if (!profileUser || (loadingProfile && !isCurrentUser)) {
    return <ProfileSkeletonLoader />;
  }

  /** Renders a single grid cell with animated press scale */
  const renderGridCell = (item: Post | null, cellKey: string) => {
    if (!item) {
      return (
        <View
          key={cellKey}
          style={{ width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, margin: 1.5 }}
        />
      );
    }
    const mediaUri = item.mediaUrl || item.reportImages?.[0];
    return (
      <GridCell
        key={item._id}
        item={item}
        mediaUri={mediaUri}
        onPress={() => openComments(item)}
        theme={theme}
      />
    );
  };

  /** Renders the full posts grid as plain Views (no nested FlatList) */
  const renderPostsGrid = () => {
    if (loadingPosts) {
      return (
        <ActivityIndicator
          color={theme.colors.primary}
          style={{ marginTop: 32 }}
        />
      );
    }
    if (filteredPosts.length === 0) {
      return (
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No media posts yet.
        </Text>
      );
    }
    const rows = chunkArray(filteredPosts, 3);
    return rows.map((row, rowIndex) => {
      // Pad last row with nulls so cells are equal-width
      const padded = [...row];
      while (padded.length < 3) padded.push(null as unknown as Post);
      return (
        <View key={`row-${rowIndex}`} style={styles.gridRow}>
          {padded.map((item, colIndex) =>
            renderGridCell(item, `cell-${rowIndex}-${colIndex}`),
          )}
        </View>
      );
    });
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        stickyHeaderIndices={[4]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Hero — with parallax+fade on scroll */}
        <Animated.View
          style={[heroStagger, heroFadeStyle, bannerParallaxStyle]}
        >
          <ProfileHeroCard
            user={profileUser}
            isCurrentUser={isCurrentUser}
            coverImageUri={profileUser.coverImage}
            reputationScore={profileUser.reputationScore || 0}
            bioExpanded={bioExpanded}
            uploadingAvatar={uploadingAvatar}
            uploadingCover={uploadingCover}
            onBack={() => navigation.goBack()}
            onOpenSettings={openSettings}
            onEditAvatar={() => void handleChangeAvatar()}
            onEditCover={() => void handleChangeCover()}
            onToggleBio={() => {
              setBioExpanded((value) => !value);
            }}
          />
        </Animated.View>

        <Animated.View style={statsStagger}>
          <View style={{ height: 14 }} />
          <ProfileStatsCard
            posts={stats.posts}
            followers={stats.followers}
            following={stats.following}
            onOpenFollowers={openFollowers}
            onOpenFollowing={openFollowing}
          />
        </Animated.View>

        <Animated.View style={btnStagger}>
          <ProfileActionButtons
            isCurrentUser={isCurrentUser}
            isAdmin={authUser?.role === "admin"}
            isFollowing={isFollowing}
            relationshipBusy={relationshipBusy}
            messageBusy={messageBusy}
            onFollowToggle={handleRelationshipToggle}
            onMessage={handleMessage}
            onEditProfile={openSettings}
            onOpenAdminPanel={() => navigation.navigate("AdminPanel" as never)}
          />
        </Animated.View>

        <Animated.View style={memStagger}>
          <ProfileHighlightsRow
            items={highlightItems}
            onAddPress={openCreateMemory}
          />
        </Animated.View>

        <View
          style={[
            styles.tabsBar,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.borderLight,
            },
          ]}
        >
          <Animated.View style={[tabsStagger, { width: "100%" }]}>
            {/* Sliding active pill indicator */}
            <View style={styles.tabIndicatorTrack}>
              <Animated.View
                style={[
                  styles.tabIndicatorPill,
                  { backgroundColor: theme.colors.primaryLight },
                  tabIndicatorStyle,
                  { width: TAB_WIDTH },
                ]}
              />
            </View>

            <View style={styles.tabsInner}>
              {TABS.map((tabItem) => {
                const active = tabItem === tab;
                let Icon = Grid2x2;
                if (tabItem === "Cases") Icon = Stethoscope;
                if (tabItem === "Media") Icon = ImageIcon;
                if (tabItem === "About") Icon = Info;

                return (
                  <AnimatedTabButton
                    key={tabItem}
                    tabItem={tabItem}
                    active={active}
                    Icon={Icon}
                    tabWidth={TAB_WIDTH}
                    primaryColor={theme.colors.primary}
                    tertiaryColor={theme.colors.textTertiary}
                    onPress={handleTabPress}
                  />
                );
              })}
            </View>
          </Animated.View>
        </View>

        {/* ── Content Area ─────────────────────────────────────────────────── */}
        {tab === "Posts" ? (
          <View style={styles.gridContainer}>{renderPostsGrid()}</View>
        ) : tab === "Cases" || tab === "Media" ? (
          <View>
            {loadingPosts ? (
              <ActivityIndicator
                color={theme.colors.primary}
                style={{ marginTop: 32 }}
              />
            ) : filteredPosts.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No {tab.toLowerCase()} yet.
              </Text>
            ) : (
              filteredPosts.map((item) => (
                <PostCard
                  key={item._id}
                  post={item}
                  currentUserId={authUser?._id}
                  onLike={(postId) => {
                    void toggleLike(postId);
                  }}
                  onComment={openComments}
                  onShare={sharePost}
                  onDelete={(post) => {
                    void deletePost(post._id);
                  }}
                  onJoinDiscussion={handleJoinDiscussion}
                  isAdmin={authUser?.role === "admin"}
                />
              ))
            )}
          </View>
        ) : null}

        {/* ── About tab ───────────────────────────────────────────────────── */}
        {tab === "About" ? (
          <View
            style={[
              styles.aboutWrap,
              {
                backgroundColor: "transparent",
                marginHorizontal: 0,
                marginTop: 16,
              },
            ]}
          >
            <View
              style={[
                styles.aboutCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.aboutCardHeader}>
                <Stethoscope size={18} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.aboutCardTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Professional Overview
                </Text>
              </View>
              {[
                {
                  label: "Role",
                  value: profileUser.role,
                  icon: (
                    <UserRound size={16} color={theme.colors.textSecondary} />
                  ),
                },
                {
                  label: "Specialization",
                  value: profileUser.specialization || "General",
                  icon: (
                    <Activity size={16} color={theme.colors.textSecondary} />
                  ),
                },
                {
                  label: "Hospital",
                  value: profileUser.hospital || "Not affiliated",
                  icon: (
                    <Briefcase size={16} color={theme.colors.textSecondary} />
                  ),
                },
              ].map((row, idx) => (
                <View
                  key={row.label}
                  style={[
                    styles.aboutRow,
                    idx !== 2 && {
                      borderBottomColor: theme.colors.borderLight,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {row.icon}
                    <Text
                      style={[
                        styles.aboutLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {row.label}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.aboutValue,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.aboutCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.aboutCardHeader}>
                <ClipboardPlus size={18} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.aboutCardTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Certifications & Affiliations
                </Text>
              </View>
              <View style={styles.certRow}>
                <View
                  style={[
                    styles.certBadge,
                    {
                      backgroundColor: theme.colors.success + "15",
                      borderColor: theme.colors.success + "30",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.certBadgeText,
                      { color: theme.colors.success },
                    ]}
                  >
                    Board Certified
                  </Text>
                </View>
                <View
                  style={[
                    styles.certBadge,
                    {
                      backgroundColor: theme.colors.primary + "15",
                      borderColor: theme.colors.primary + "30",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.certBadgeText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    ACLS Provider
                  </Text>
                </View>
                <View
                  style={[
                    styles.certBadge,
                    {
                      backgroundColor: theme.colors.warning + "15",
                      borderColor: theme.colors.warning + "30",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.certBadgeText,
                      { color: theme.colors.warning },
                    ]}
                  >
                    {profileUser.experience || 5}+ Yrs Exp.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </Animated.ScrollView>

      <Modal
        visible={createMemoryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateMemoryVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              Create memory collection
            </Text>
            <TextInput
              value={newCollectionTitle}
              onChangeText={setNewCollectionTitle}
              placeholder="Conference, Surgery, Research..."
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                styles.modalInput,
                {
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setCreateMemoryVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.colors.border }]}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleCreateMemory()}
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: theme.colors.textInverted },
                  ]}
                >
                  {creatingCollection ? "Saving..." : "Create"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── AnimatedTabButton ─────────────────────────────────────────────────────────
function AnimatedTabButton({
  tabItem,
  active,
  Icon,
  tabWidth,
  primaryColor,
  tertiaryColor,
  onPress,
}: {
  tabItem: TabType;
  active: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>;
  tabWidth: number;
  primaryColor: string;
  tertiaryColor: string;
  onPress: (tab: TabType) => void;
}) {
  const iconScale = useSharedValue(1);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handlePress = () => {
    iconScale.value = withTiming(0.82, {
      duration: 80,
      easing: Easing.out(Easing.quad),
    });
    setTimeout(() => {
      iconScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    }, 80);
    onPress(tabItem);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.tabBtn,
        active && { borderBottomColor: primaryColor },
        { width: tabWidth },
      ]}
    >
      <Animated.View style={iconStyle}>
        <Icon
          size={15}
          color={active ? primaryColor : tertiaryColor}
          strokeWidth={active ? 2.3 : 1.8}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabText,
          { color: active ? primaryColor : tertiaryColor },
        ]}
      >
        {tabItem}
      </Text>
    </Pressable>
  );
}

// ── GridCell with press animation ────────────────────────────────────────────
function GridCell({
  item,
  mediaUri,
  onPress,
  theme,
}: {
  item: Post;
  mediaUri?: string;
  onPress: () => void;
  theme: { colors: { primary: string; primaryLight: string } };
}) {
  const cellScale = useSharedValue(1);

  const cellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cellScale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        cellScale.value = withSpring(0.94, { damping: 14, stiffness: 320 });
      }}
      onPressOut={() => {
        cellScale.value = withSpring(1, { damping: 12, stiffness: 260 });
      }}
    >
      <Animated.View style={[styles.gridItem, cellStyle]}>
        {mediaUri ? (
          <Image
            source={{ uri: mediaUri }}
            style={{ width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE }}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.gridTextTile,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Text
              style={[styles.gridTextContent, { color: theme.colors.primary }]}
              numberOfLines={4}
            >
              {item.content}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Tabs Bar ─────────────────────────────────────────────────────────────
  tabsBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 0,
    ...baseShadow.card,
    elevation: 1,
    overflow: "hidden",
  },
  tabIndicatorTrack: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  tabIndicatorPill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 2.5,
    borderRadius: 2,
    opacity: 0,
  },
  tabsInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {},
  tabBtnPressed: { opacity: 0.75 },
  tabText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  gridToggle: { padding: 14 },

  // ── Grid & Posts ─────────────────────────────────────────────────────────
  gridContainer: {
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  gridRow: {
    flexDirection: "row",
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    margin: 1.5,
    borderRadius: 4,
    overflow: "hidden",
  },
  gridTextTile: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    padding: 12,
    justifyContent: "center",
    borderRadius: 16,
  },
  gridTextContent: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    marginTop: 32,
    marginBottom: 32,
  },

  aboutWrap: {
    paddingVertical: 0,
    marginTop: 0,
    marginHorizontal: 16,
    borderRadius: 24,
  },
  aboutCard: {
    marginHorizontal: 14,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  aboutCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150,150,150,0.2)",
  },
  aboutCardTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aboutLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    textTransform: "capitalize",
  },
  aboutValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    textTransform: "capitalize",
  },
  certRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 10,
  },
  certBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  certBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },

  activityWrap: { padding: 18 },
  activityText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    padding: 20,
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnPrimary: {
    borderWidth: 0,
  },
  modalBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
});
