import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, UserSearch, X } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";

import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import type { RootStackParamList } from "@/navigation/types";
import {
  followUserRequest,
  getSuggestedUsersRequest,
  searchUsersRequest,
  unfollowUserRequest
} from "@/services/api/userApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { hapticTap } from "@/utils/haptics";
import type { User } from "@/types/models";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Small pressable chip with spring press animation */
function ActionChip({
  label,
  onPress,
  loading,
  primary
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  primary?: boolean;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={loading}
      onPressIn={() => (scale.value = withSpring(0.93, { damping: 14, stiffness: 300 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14, stiffness: 300 }))}
      style={[
        anim,
        styles.chip,
        {
          backgroundColor: primary ? theme.colors.primary : theme.colors.primaryLight,
          borderColor: primary ? theme.colors.primary : theme.colors.primaryMid
        }
      ]}
    >
      <Text style={[styles.chipText, { color: primary ? "#FFFFFF" : theme.colors.primary }]}>
        {loading ? "..." : label}
      </Text>
    </AnimatedPressable>
  );
}

export function SearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authUser = useAuthStore((state) => state.user);
  const updateSessionUser = useAuthStore((state) => state.updateUser);
  const openOrCreateConversation = useChatStore((state) => state.openOrCreateConversation);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [suggested, setSuggested] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [messageUserId, setMessageUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void getSuggestedUsersRequest(12)
      .then((items) => { if (active) setSuggested(items); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(() => {
      void searchUsersRequest(trimmed, 15)
        .then((items) => { if (active) { setResults(items); setLoading(false); } })
        .catch(() => { if (active) setLoading(false); });
    }, 250);

    return () => { active = false; clearTimeout(timeoutId); };
  }, [query]);

  const visibleUsers = useMemo(() => {
    const base = query.trim() ? results : suggested;
    return base.filter((item) => item._id !== authUser?._id);
  }, [authUser?._id, query, results, suggested]);

  const syncUser = useCallback((updated: User) => {
    setResults((s) => s.map((u) => (u._id === updated._id ? updated : u)));
    setSuggested((s) => s.map((u) => (u._id === updated._id ? updated : u)));
  }, []);

  const toggleFollow = async (user: User) => {
    hapticTap();
    setBusyUserId(user._id);
    try {
      const isFollowing = !!authUser?._id && user.followers.includes(authUser._id);
      const res = isFollowing
        ? await unfollowUserRequest(user._id)
        : await followUserRequest(user._id);
      syncUser(res.target);
      await updateSessionUser(res.viewer);
    } finally {
      setBusyUserId(null);
    }
  };

  const openMessage = async (user: User) => {
    setMessageUserId(user._id);
    try {
      const conv = await openOrCreateConversation(user._id);
      navigation.navigate("ChatScreen", { conversationId: conv._id, title: user.name });
    } finally {
      setMessageUserId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Search bar ──────────────────────────────────────────────── */}
      <View style={[styles.searchBar, { paddingTop: insets.top + 10, borderBottomColor: theme.colors.borderLight }]}>
        <View style={[styles.searchInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <Search size={16} color={theme.colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, role, hospital…"
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.input, { color: theme.colors.textPrimary }]}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <X size={15} color={theme.colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <Animated.View entering={FadeIn.duration(200)}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
            {query.trim() ? "Results" : "Suggested Professionals"}
          </Text>
        </Animated.View>
      </View>

      {/* ── List ────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleUsers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isFollowing = !!authUser?._id && item.followers.includes(authUser._id);
            const followBusy = busyUserId === item._id;
            const msgBusy = messageUserId === item._id;

            return (
              <Animated.View entering={FadeInDown.delay(index * 35).duration(260).springify()}>
                <Pressable
                  onPress={() => navigation.navigate("UserProfile", { userId: item._id })}
                  style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
                >
                  {/* ── Profile row ───────────────────────────────── */}
                  <View style={styles.profileRow}>
                    <Avatar name={item.name} uri={item.profileImage} size={52} verified={item.isVerified} />

                    <View style={styles.profileText}>
                      <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.role, { color: theme.colors.primary }]} numberOfLines={1}>
                        {item.role}{item.specialization ? ` · ${item.specialization}` : ""}
                      </Text>
                      {item.hospital ? (
                        <Text style={[styles.hospital, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                          {item.hospital}
                        </Text>
                      ) : null}
                    </View>

                    {/* Inline follow chip on the right */}
                    <ActionChip
                      label={isFollowing ? "Following" : "Follow"}
                      onPress={() => void toggleFollow(item)}
                      loading={followBusy}
                      primary={!isFollowing}
                    />
                  </View>

                  {/* ── Stats row ────────────────────────────────── */}
                  <View style={[styles.statsRow, { borderTopColor: theme.colors.borderLight }]}>
                    <View style={styles.stat}>
                      <Text style={[styles.statVal, { color: theme.colors.textPrimary }]}>
                        {item.followers.length}
                      </Text>
                      <Text style={[styles.statKey, { color: theme.colors.textTertiary }]}>Followers</Text>
                    </View>

                    <View style={[styles.statDivider, { backgroundColor: theme.colors.borderLight }]} />

                    <View style={styles.stat}>
                      <Text style={[styles.statVal, { color: theme.colors.textPrimary }]}>
                        {item.reputationScore ?? 0}
                      </Text>
                      <Text style={[styles.statKey, { color: theme.colors.textTertiary }]}>Reputation</Text>
                    </View>

                    <View style={[styles.statDivider, { backgroundColor: theme.colors.borderLight }]} />

                    {/* Message button inside stats row */}
                    <Pressable
                      onPress={() => void openMessage(item)}
                      disabled={msgBusy}
                      style={styles.msgBtn}
                    >
                      <Text style={[styles.msgText, { color: theme.colors.primary }]}>
                        {msgBusy ? "Opening…" : "Message →"}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<UserSearch size={30} color={theme.colors.primary} />}
              title={query.trim() ? "No professionals found" : "Loading suggestions…"}
              body={
                query.trim()
                  ? `No results for "${query}". Try a different name, specialization, or hospital.`
                  : "Discover verified doctors, nurses, and medical students from your network."
              }
            />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={9}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // ── Search bar area
  searchBar: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
    gap: 8
  },
  input: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 15
  },
  sectionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    letterSpacing: 0.2
  },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 60,
    gap: 10
  },
  // ── User card
  card: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    paddingBottom: 12
  },
  profileText: { flex: 1 },
  name: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 15 },
  role: { marginTop: 3, fontFamily: "Manrope_700Bold", fontSize: 12, textTransform: "capitalize" },
  hospital: { marginTop: 2, fontFamily: "Manrope_500Medium", fontSize: 12 },
  // ── Stats row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  stat: { flex: 1, alignItems: "center" },
  statVal: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 15 },
  statKey: { fontFamily: "Manrope_500Medium", fontSize: 11, marginTop: 1 },
  statDivider: { width: 1, height: 24, marginHorizontal: 4 },
  msgBtn: { flex: 1, alignItems: "center" },
  msgText: { fontFamily: "Manrope_700Bold", fontSize: 13 },
  // ── Action chip (inline follow button)
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 0
  },
  chipText: { fontFamily: "Manrope_700Bold", fontSize: 12 }
});
