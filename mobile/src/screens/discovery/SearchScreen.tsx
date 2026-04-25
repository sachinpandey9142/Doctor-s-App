import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Sparkles } from "lucide-react-native";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { GlassCard } from "@/components/common/GlassCard";
import type { RootStackParamList } from "@/navigation/types";
import {
  followUserRequest,
  getSuggestedUsersRequest,
  searchUsersRequest,
  unfollowUserRequest
} from "@/services/api/userApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import type { User } from "@/types/models";

export function SearchScreen() {
  const theme = useTheme();
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

    const loadSuggested = async () => {
      setLoading(true);
      try {
        const items = await getSuggestedUsersRequest(12);
        if (active) {
          setSuggested(items);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSuggested();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const trimmed = query.trim();

    if (!trimmed) {
      setLoading(false);
      setResults([]);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const items = await searchUsersRequest(trimmed, 15);
        if (active) {
          setResults(items);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [query]);

  const visibleUsers = useMemo(() => {
    const base = query.trim() ? results : suggested;
    return base.filter((item) => item._id !== authUser?._id);
  }, [authUser?._id, query, results, suggested]);

  const syncUser = (updatedUser: User) => {
    setResults((state) => state.map((item) => (item._id === updatedUser._id ? updatedUser : item)));
    setSuggested((state) => state.map((item) => (item._id === updatedUser._id ? updatedUser : item)));
  };

  const toggleFollow = async (user: User) => {
    setBusyUserId(user._id);
    try {
      const isFollowing = !!authUser?._id && user.followers.includes(authUser._id);
      const response = isFollowing ? await unfollowUserRequest(user._id) : await followUserRequest(user._id);
      syncUser(response.target);
      await updateSessionUser(response.viewer);
    } finally {
      setBusyUserId(null);
    }
  };

  const openProfile = (userId: string) => {
    navigation.navigate("UserProfile", { userId });
  };

  const openMessage = async (user: User) => {
    setMessageUserId(user._id);
    try {
      const conversation = await openOrCreateConversation(user._id);
      navigation.navigate("ChatScreen", {
        conversationId: conversation._id,
        title: user.name
      });
    } finally {
      setMessageUserId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Search size={18} color={theme.colors.primary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search doctors, students, hospitals..."
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
        />
      </View>

      <View style={styles.headingWrap}>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>
          {query.trim() ? "Search Results" : "Suggested Professionals"}
        </Text>
        <Text style={[styles.subheading, { color: theme.colors.textSecondary }]}>
          {query.trim()
            ? "Explore profiles by name, role, specialization, or hospital."
            : "Start with verified and active professionals from the network."}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleUsers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <GlassCard style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Sparkles size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No matches yet</Text>
              <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>
                Try another name, hospital, or specialization.
              </Text>
            </GlassCard>
          }
          renderItem={({ item }) => {
            const isFollowing = !!authUser?._id && item.followers.includes(authUser._id);
            const followLoading = busyUserId === item._id;
            const messageLoading = messageUserId === item._id;

            return (
              <GlassCard style={styles.card}>
                <Pressable onPress={() => openProfile(item._id)} style={styles.profileRow}>
                  <Avatar name={item.name} uri={item.profileImage} size={54} verified={item.isVerified} />
                  <View style={styles.profileTextWrap}>
                    <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.role, { color: theme.colors.primary }]}>
                      {item.role} | {item.specialization || "Medical Professional"}
                    </Text>
                    <Text style={[styles.hospital, { color: theme.colors.textSecondary }]}>
                      {item.hospital || "Hospital not added yet"}
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.metricsRow}>
                  <Text style={[styles.metric, { color: theme.colors.textSecondary }]}>
                    Followers: {item.followers.length}
                  </Text>
                  <Text style={[styles.metric, { color: theme.colors.textSecondary }]}>
                    Reputation: {item.reputationScore}
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => toggleFollow(item)}
                    disabled={followLoading}
                    style={[
                      styles.primaryAction,
                      {
                        backgroundColor: isFollowing ? theme.colors.surface : theme.colors.primary,
                        borderColor: theme.colors.primary
                      }
                    ]}
                  >
                    <Text style={[styles.primaryActionText, { color: isFollowing ? theme.colors.primary : "#FFFFFF" }]}>
                      {followLoading ? "Saving..." : isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => openMessage(item)}
                    disabled={messageLoading}
                    style={[styles.secondaryAction, { borderColor: theme.colors.border }]}
                  >
                    <Text style={[styles.secondaryActionText, { color: theme.colors.textPrimary }]}>
                      {messageLoading ? "Opening..." : "Message"}
                    </Text>
                  </Pressable>
                </View>
              </GlassCard>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
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
    gap: 10
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 15
  },
  headingWrap: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8
  },
  heading: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26
  },
  subheading: {
    marginTop: 6,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12
  },
  card: {
    marginBottom: 2
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  profileTextWrap: {
    flex: 1
  },
  name: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16
  },
  role: {
    marginTop: 4,
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    textTransform: "capitalize"
  },
  hospital: {
    marginTop: 4,
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14
  },
  metric: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  primaryAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14
  },
  secondaryAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)"
  },
  secondaryActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14
  },
  emptyCard: {
    marginTop: 24,
    alignItems: "center"
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center"
  },
  emptyTitle: {
    marginTop: 12,
    textAlign: "center",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17
  },
  emptyBody: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  }
});
