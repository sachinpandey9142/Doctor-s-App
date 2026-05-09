import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { MessageCircleMore, Search, Users } from "lucide-react-native";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { GlassCard } from "@/components/common/GlassCard";
import {
  followUserRequest,
  getFollowersRequest,
  unfollowUserRequest,
} from "@/services/api/userApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import type { RootStackParamList } from "@/navigation/types";
import type { User } from "@/types/models";

type FollowersRoute = RouteProp<RootStackParamList, "Followers">;

const ROLE_LABELS: Record<string, string> = {
  doctor: "Doctor",
  nurse: "Nurse",
  "lab-technician": "Lab Technician",
  "medical-student": "Medical Student",
  "hospital-staff": "Hospital Staff",
  other: "Healthcare Professional",
};

const getProfessionalSummary = (user: User) => {
  const primary =
    user.specialization?.trim() ||
    ROLE_LABELS[user.role] ||
    "Healthcare Professional";
  const secondary =
    user.hospital?.trim() ||
    (user.experience > 0 ? `${user.experience} years experience` : "");

  return secondary ? `${primary} • ${secondary}` : primary;
};

export function FollowersScreen() {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<FollowersRoute>();

  const authUser = useAuthStore((state) => state.user);
  const updateSessionUser = useAuthStore((state) => state.updateUser);
  const openOrCreateConversation = useChatStore(
    (state) => state.openOrCreateConversation,
  );

  const userId = route.params?.userId ?? authUser?._id ?? "";

  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [followBusyUserId, setFollowBusyUserId] = useState<string | null>(null);
  const [messageBusyUserId, setMessageBusyUserId] = useState<string | null>(
    null,
  );

  const loadFollowers = useCallback(
    async (isRefresh = false) => {
      if (!userId) {
        setFollowers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const items = await getFollowersRequest(userId);
        setFollowers(items);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadFollowers();
    }, [loadFollowers]),
  );

  const filteredFollowers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return followers;
    }

    return followers.filter((item) => item.name.toLowerCase().includes(term));
  }, [followers, query]);

  const syncFollower = useCallback((updatedUser: User) => {
    setFollowers((state) =>
      state.map((item) => (item._id === updatedUser._id ? updatedUser : item)),
    );
  }, []);

  const openProfile = useCallback(
    (targetUserId: string) => {
      navigation.navigate("UserProfile", { userId: targetUserId });
    },
    [navigation],
  );

  const toggleFollow = useCallback(
    async (user: User) => {
      if (!authUser?._id || user._id === authUser._id) {
        return;
      }

      setFollowBusyUserId(user._id);
      try {
        const isFollowing = !!authUser.following?.includes(user._id);
        const response = isFollowing
          ? await unfollowUserRequest(user._id)
          : await followUserRequest(user._id);
        syncFollower(response.target);
        await updateSessionUser(response.viewer);
      } finally {
        setFollowBusyUserId(null);
      }
    },
    [authUser?._id, authUser?.following, syncFollower, updateSessionUser],
  );

  const openChat = useCallback(
    async (user: User) => {
      setMessageBusyUserId(user._id);
      try {
        const conversation = await openOrCreateConversation(user._id);
        navigation.navigate("ChatScreen", {
          conversationId: conversation._id,
          title: user.name,
          avatarUri: user.profileImage,
          isGroup: false,
        });
      } finally {
        setMessageBusyUserId(null);
      }
    },
    [navigation, openOrCreateConversation],
  );

  const renderFollower = useCallback(
    ({ item }: { item: User }) => {
      const isFollowing =
        !!authUser?._id && !!authUser.following?.includes(item._id);
      const followBusy = followBusyUserId === item._id;
      const messageBusy = messageBusyUserId === item._id;

      return (
        <GlassCard style={styles.card}>
          <View style={styles.cardInner}>
            <Pressable
              onPress={() => openProfile(item._id)}
              style={styles.profileRow}
            >
              <Avatar
                name={item.name}
                uri={item.profileImage}
                size={56}
                verified={item.isVerified}
              />
              <View style={styles.profileTextWrap}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.name, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <View style={styles.countRow}>
                    <View
                      style={[
                        styles.countChip,
                        { backgroundColor: theme.colors.primaryLight },
                      ]}
                    >
                      <Text
                        style={[
                          styles.countChipText,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {item.followers.length} followers
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.countChip,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.countChipText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {item.following.length} following
                      </Text>
                    </View>
                  </View>
                </View>
                <Text
                  style={[styles.summary, { color: theme.colors.primary }]}
                  numberOfLines={1}
                >
                  {getProfessionalSummary(item)}
                </Text>
              </View>
            </Pressable>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => toggleFollow(item)}
                disabled={followBusy}
                style={({ pressed }) => [
                  styles.followButton,
                  {
                    backgroundColor: isFollowing
                      ? theme.colors.surface
                      : theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                  pressed && !followBusy ? styles.pressed : null,
                  followBusy ? styles.disabled : null,
                ]}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    { color: isFollowing ? theme.colors.primary : "#FFFFFF" },
                  ]}
                >
                  {followBusy
                    ? "Saving..."
                    : isFollowing
                      ? "Following"
                      : "Follow Back"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => openChat(item)}
                disabled={messageBusy}
                style={({ pressed }) => [
                  styles.chatButton,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                  pressed && !messageBusy ? styles.pressed : null,
                  messageBusy ? styles.disabled : null,
                ]}
              >
                <MessageCircleMore size={16} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.chatButtonText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {messageBusy ? "Opening..." : "Chat"}
                </Text>
              </Pressable>
            </View>
          </View>
        </GlassCard>
      );
    },
    [
      authUser?._id,
      authUser?.following,
      followBusyUserId,
      messageBusyUserId,
      navigation,
      openChat,
      openProfile,
      theme.colors,
      toggleFollow,
    ],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Search size={18} color={theme.colors.primary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search followers by name"
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.headerCopy}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Followers
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          People who follow this profile in Doctor&apos;s App.
        </Text>
      </View>

      <FlatList
        data={filteredFollowers}
        keyExtractor={(item) => item._id}
        renderItem={renderFollower}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFollowers(true)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <GlassCard style={styles.emptyCard}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <Users size={20} color={theme.colors.primary} />
              </View>
              <Text
                style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}
              >
                {query.trim() ? "No matching followers" : "No followers yet"}
              </Text>
              <Text
                style={[
                  styles.emptyBody,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {query.trim()
                  ? "Try a different name or clear the search field."
                  : "When people follow this profile, they will appear here."}
              </Text>
            </GlassCard>
          )
        }
        ListFooterComponent={
          loading || refreshing ? null : <View style={styles.bottomSpacer} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
  },
  headerCopy: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
    flexGrow: 1,
  },
  card: {
    marginBottom: 2,
  },
  cardInner: {
    gap: 10,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileTextWrap: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  name: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    flexShrink: 1,
  },
  summary: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
  countChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 0.1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  followButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  followButtonText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  chatButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatButtonText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
  loadingState: {
    paddingTop: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    marginTop: 8,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  emptyBody: {
    marginTop: 8,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  bottomSpacer: {
    height: 24,
  },
});
