import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BellOff,
  ChevronLeft,
  MessageCircle,
  MoreVertical,
  Search,
  UserPlus,
  Users,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import type { RootStackParamList } from "@/navigation/types";
import {
  blockUserRequest,
  followUserRequest,
  getFollowersPageRequest,
  getFollowingPageRequest,
  removeFollowerRequest,
  unfollowUserRequest,
} from "@/services/api/userApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useToastStore } from "@/store/toastStore";
import type { User } from "@/types/models";

type RelationKind = "followers" | "following";
type RelationsRoute = RouteProp<
  Record<"Followers" | "Following", { userId: string; kind: RelationKind }>,
  "Followers" | "Following"
>;

const PAGE_SIZE = 14;

function titleCaseRole(role: string) {
  return role
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildSubtitle(user: User) {
  const specialization = user.specialization.trim();
  const hospital = user.hospital.trim();
  const role = titleCaseRole(user.role);

  if (specialization && hospital) return `${specialization} • ${hospital}`;
  if (specialization)
    return hospital ? `${specialization} • ${hospital}` : specialization;
  if (hospital) return `${role} • ${hospital}`;
  if (user.experience > 0)
    return `${role} • ${user.experience} years experience`;
  return "Healthcare Professional";
}

function buildMetaLine(user: User) {
  const parts = [titleCaseRole(user.role)];
  if (user.hospital.trim()) {
    parts.push(user.hospital.trim());
  }
  return parts.join(" • ");
}

const RelationSkeleton = ({
  theme,
}: {
  theme: ReturnType<typeof useTheme>;
}) => (
  <View
    style={[
      styles.card,
      {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.cardBorder,
      },
    ]}
  >
    <View style={styles.row}>
      <LoadingSkeleton width={54} height={54} borderRadius={27} />
      <View style={styles.textBlock}>
        <LoadingSkeleton width="65%" height={15} />
        <LoadingSkeleton width="88%" height={12} />
        <LoadingSkeleton width="54%" height={12} />
      </View>
    </View>
    <View style={styles.actionsRow}>
      <LoadingSkeleton width={94} height={36} borderRadius={18} />
      <LoadingSkeleton width={76} height={36} borderRadius={18} />
      <LoadingSkeleton width={36} height={36} borderRadius={18} />
    </View>
  </View>
);

const RelationCard = React.memo(function RelationCard({
  item,
  theme,
  isFollowing,
  canRemoveFollower,
  onPressProfile,
  onPressChat,
  onPressToggleFollow,
  onPressRemoveFollower,
  onPressMenu,
  busy,
}: {
  item: User;
  theme: ReturnType<typeof useTheme>;
  isFollowing: boolean;
  canRemoveFollower: boolean;
  onPressProfile: (user: User) => void;
  onPressChat: (user: User) => void;
  onPressToggleFollow: (user: User) => void;
  onPressRemoveFollower: (user: User) => void;
  onPressMenu: (user: User) => void;
  busy: boolean;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(220).springify()}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.cardBorder,
            shadowColor: "#0F172A",
          },
        ]}
      >
        <Pressable onPress={() => onPressProfile(item)} style={styles.row}>
          <Avatar
            name={item.name}
            uri={item.profileImage}
            size={54}
            verified={item.isVerified}
          />

          <View style={styles.textBlock}>
            <Text
              style={[styles.name, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {buildSubtitle(item)}
            </Text>
            <Text
              style={[styles.meta, { color: theme.colors.textTertiary }]}
              numberOfLines={1}
            >
              {buildMetaLine(item)}
            </Text>
          </View>

          <Pressable
            hitSlop={12}
            onPress={() => onPressMenu(item)}
            style={styles.menuBtn}
          >
            <MoreVertical size={18} color={theme.colors.textTertiary} />
          </Pressable>
        </Pressable>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => onPressToggleFollow(item)}
            disabled={busy}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: isFollowing
                  ? theme.colors.primaryLight
                  : theme.colors.primary,
                opacity: pressed || busy ? 0.88 : 1,
              },
            ]}
          >
            <UserPlus
              size={14}
              color={isFollowing ? theme.colors.primary : "#FFFFFF"}
            />
            <Text
              style={[
                styles.primaryBtnText,
                { color: isFollowing ? theme.colors.primary : "#FFFFFF" },
              ]}
            >
              {isFollowing ? "Following" : "Follow Back"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onPressChat(item)}
            disabled={busy}
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                borderColor: theme.colors.cardBorder,
                backgroundColor:
                  pressed || busy
                    ? theme.colors.primaryLight
                    : theme.colors.surface,
              },
            ]}
          >
            <MessageCircle size={14} color={theme.colors.primary} />
            <Text
              style={[styles.secondaryBtnText, { color: theme.colors.primary }]}
            >
              Chat
            </Text>
          </Pressable>

          {canRemoveFollower ? (
            <Pressable
              onPress={() => onPressRemoveFollower(item)}
              disabled={busy}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  borderColor: theme.colors.cardBorder,
                  backgroundColor:
                    pressed || busy
                      ? theme.colors.primaryLight
                      : theme.colors.surface,
                },
              ]}
            >
              <BellOff size={14} color={theme.colors.error} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
});

export function FollowersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RelationsRoute>();

  const authUser = useAuthStore((state) => state.user);
  const updateSessionUser = useAuthStore((state) => state.updateUser);
  const openOrCreateConversation = useChatStore(
    (state) => state.openOrCreateConversation,
  );
  const showToast = useToastStore((state) => state.showToast);

  const userId = route.params.userId;
  const kind: RelationKind = route.params.kind;
  const isOwnProfile = authUser?._id === userId;
  const canRemoveFollower = isOwnProfile && kind === "followers";

  const searchRef = useRef<TextInput>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadPage = useCallback(
    async (
      pageToLoad: number,
      replace = false,
      searchText = debouncedQuery,
    ) => {
      const requestId = ++requestIdRef.current;

      if (replace) {
        setLoading(true);
      } else if (pageToLoad > 1) {
        setLoadingMore(true);
      }

      try {
        const loader =
          kind === "followers"
            ? getFollowersPageRequest
            : getFollowingPageRequest;
        const response = await loader(userId, {
          query: searchText,
          page: pageToLoad,
          limit: PAGE_SIZE,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        setItems((current) =>
          replace ? response.data : [...current, ...response.data],
        );
        setPage(response.pagination?.page ?? pageToLoad);
        setHasMore(Boolean(response.pagination?.hasMore));
      } catch (error) {
        showToast("Could not load connections", "error");
        if (requestId !== requestIdRef.current) {
          return;
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQuery, kind, showToast, userId],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(1, true);
  }, [loadPage]);

  useFocusEffect(
    useCallback(() => {
      void loadPage(1, true, debouncedQuery);
    }, [debouncedQuery, loadPage]),
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      void loadPage(page + 1, false);
    }
  }, [hasMore, loading, loadingMore, loadPage, page]);

  const isFollowingMap = useMemo(() => {
    const followingIds = new Set(authUser?.following || []);
    return new Map(items.map((item) => [item._id, followingIds.has(item._id)]));
  }, [authUser?.following, items]);

  const openProfile = useCallback(
    (user: User) => {
      navigation.navigate("UserProfile", { userId: user._id });
    },
    [navigation],
  );

  const openChat = useCallback(
    async (user: User) => {
      setBusyUserId(user._id);
      try {
        const conversation = await openOrCreateConversation(user._id);
        navigation.navigate("ChatScreen", {
          conversationId: conversation._id,
          title: user.name,
        });
      } finally {
        setBusyUserId(null);
      }
    },
    [navigation, openOrCreateConversation],
  );

  const toggleFollow = useCallback(
    async (user: User) => {
      if (!authUser?._id || user._id === authUser._id) {
        return;
      }

      setBusyUserId(user._id);
      try {
        const isFollowing = !!authUser.following?.includes(user._id);
        const response = isFollowing
          ? await unfollowUserRequest(user._id)
          : await followUserRequest(user._id);
        await updateSessionUser(response.viewer);
        setItems((current) =>
          current.map((item) =>
            item._id === response.target._id ? response.target : item,
          ),
        );
        showToast(isFollowing ? "Unfollowed" : "Following", "success");
      } finally {
        setBusyUserId(null);
      }
    },
    [authUser, showToast, updateSessionUser],
  );

  const removeFollower = useCallback(
    (user: User) => {
      Alert.alert(
        "Remove follower",
        `Remove ${user.name} from your followers?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              setBusyUserId(user._id);
              void (async () => {
                try {
                  const response = await removeFollowerRequest(
                    userId,
                    user._id,
                  );
                  await updateSessionUser(response.viewer);
                  setItems((current) =>
                    current.filter((item) => item._id !== user._id),
                  );
                  showToast("Follower removed", "success");
                } finally {
                  setBusyUserId(null);
                }
              })();
            },
          },
        ],
      );
    },
    [showToast, updateSessionUser, userId],
  );

  const openMenu = useCallback(
    (user: User) => {
      const buttons: Array<{
        text: string;
        style?: "default" | "cancel" | "destructive";
        onPress?: () => void;
      }> = [
        { text: "Cancel", style: "cancel" },
        { text: "View Profile", onPress: () => openProfile(user) },
        { text: "Chat", onPress: () => void openChat(user) },
      ];

      if (canRemoveFollower) {
        buttons.push({
          text: "Remove Follower",
          style: "destructive",
          onPress: () => removeFollower(user),
        });
      }

      if (authUser?.role === "admin") {
        buttons.push({
          text: "Block User",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Block user",
              `Block ${user.name}? This will disable their access until unblocked in the admin panel.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Block",
                  style: "destructive",
                  onPress: () => {
                    setBusyUserId(user._id);
                    void (async () => {
                      try {
                        await blockUserRequest(user._id);
                        setItems((current) =>
                          current.filter((item) => item._id !== user._id),
                        );
                        showToast("User blocked", "success");
                      } catch (error) {
                        showToast("Could not block user", "error");
                      } finally {
                        setBusyUserId(null);
                      }
                    })();
                  },
                },
              ],
            );
          },
        });
      }

      buttons.push({
        text: "Report User",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Report submitted",
            "Thanks. This profile will be flagged for review.",
          );
        },
      });

      Alert.alert(user.name, "Choose an action", buttons);
    },
    [
      authUser?.role,
      canRemoveFollower,
      openChat,
      openProfile,
      removeFollower,
      showToast,
    ],
  );

  const emptyBody = debouncedQuery
    ? `No ${kind} match "${debouncedQuery}".`
    : kind === "followers"
      ? "No followers yet. As people connect with this profile, they will appear here."
      : "No following accounts yet.";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.borderLight,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <ChevronLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {kind === "followers" ? "Followers" : "Following"}
            </Text>
            <Text
              style={[
                styles.subtitleHeader,
                { color: theme.colors.textSecondary },
              ]}
            >
              {items.length > 0
                ? `${items.length} visible`
                : "Healthcare network"}
            </Text>
          </View>

          <Pressable
            onPress={() => searchRef.current?.focus()}
            hitSlop={12}
            style={styles.searchIconBtn}
          >
            <Search size={18} color={theme.colors.primary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={16} color={theme.colors.textTertiary} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${kind}`}
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((index) => (
            <RelationSkeleton key={index} theme={theme} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <RelationCard
              item={item}
              theme={theme}
              isFollowing={isFollowingMap.get(item._id) ?? false}
              canRemoveFollower={canRemoveFollower}
              onPressProfile={openProfile}
              onPressChat={openChat}
              onPressToggleFollow={toggleFollow}
              onPressRemoveFollower={removeFollower}
              onPressMenu={openMenu}
              busy={busyUserId === item._id}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.colors.primary}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={handleLoadMore}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Users size={30} color={theme.colors.primary} />}
              title={
                kind === "followers" ? "No followers yet" : "Nothing here yet"
              }
              body={emptyBody}
            />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={9}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    letterSpacing: -0.3,
  },
  subtitleHeader: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },
  searchIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 10,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  skeletonList: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textBlock: {
    flex: 1,
  },
  name: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
    letterSpacing: -0.1,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  meta: {
    marginTop: 3,
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
  },
  menuBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    flexWrap: "wrap",
  },
  primaryBtn: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  secondaryBtn: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
