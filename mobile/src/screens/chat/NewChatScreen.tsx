import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import {
  ChevronLeft,
  Search,
  UsersRound,
  UserPlus,
  RefreshCw,
  AlertCircle,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import {
  getFollowersRequest,
  getFollowingRequest,
  getSuggestedUsersRequest,
} from "@/services/api/userApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
import type { RootStackParamList } from "@/navigation/types";
import type { User } from "@/types/models";

export function NewChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const currentUser = useAuthStore((state) => state.user);
  const openOrCreateConversation = useChatStore(
    (state) => state.openOrCreateConversation,
  );
  const showToast = useToastStore((state) => state.showToast);

  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  const loadContacts = async (isRefresh = false) => {
    if (!currentUser?._id) {
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      // Fetch followers and following concurrently
      const [followers, followingRes] = await Promise.all([
        getFollowersRequest(currentUser._id).catch(() => [] as User[]),
        getFollowingRequest(currentUser._id).catch(() => ({ data: [] as User[] })),
      ]);

      const following = Array.isArray(followingRes?.data) ? followingRes.data : [];

      // Merge and deduplicate by _id
      const map = new Map<string, User>();
      [...followers, ...following].forEach((u) => {
        if (u && u._id && u._id !== currentUser._id) {
          map.set(u._id, u);
        }
      });

      let merged = Array.from(map.values());

      // If user has no followers/following, fetch suggested users as fallback/suggestions
      if (merged.length === 0) {
        const suggested = await getSuggestedUsersRequest(15).catch(() => [] as User[]);
        suggested.forEach((u) => {
          if (u && u._id && u._id !== currentUser._id) {
            map.set(u._id, u);
          }
        });
        merged = Array.from(map.values());
      }

      setContacts(merged);
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to load contacts");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadContacts();
  }, [currentUser?._id]);

  const filteredContacts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((user) => {
      const name = (user.name || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      const spec = (user.specialization || "").toLowerCase();
      const hospital = (user.hospital || "").toLowerCase();
      const email = (user.email || "").toLowerCase();

      return (
        name.includes(query) ||
        role.includes(query) ||
        spec.includes(query) ||
        hospital.includes(query) ||
        email.includes(query)
      );
    });
  }, [contacts, searchText]);

  const handleStartChat = async (user: User) => {
    if (startingChatId) return;

    try {
      setStartingChatId(user._id);
      const conversation = await openOrCreateConversation(user._id);

      navigation.replace("ChatScreen", {
        conversationId: conversation._id,
        title: conversation.peer?.displayName || user.name,
      });
    } catch (err) {
      showToast(
        extractErrorMessage(err, `Failed to start chat with ${user.name}`),
        "error",
      );
      setStartingChatId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
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
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              New Chat
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {contacts.length > 0
                ? `${contacts.length} available contacts`
                : "Select contact or create group"}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.inputBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={18} color={theme.colors.textTertiary} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search name, role, or specialty..."
            placeholderTextColor={theme.colors.placeholder}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading contacts...
          </Text>
        </View>
      ) : error && contacts.length === 0 ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color={theme.colors.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>
            Something went wrong
          </Text>
          <Text style={[styles.errorDesc, { color: theme.colors.textSecondary }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => void loadContacts()}
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          >
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadContacts(true)}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            !searchText ? (
              <View style={styles.headerSection}>
                <Pressable
                  onPress={() => navigation.navigate("CreateGroupScreen")}
                  style={({ pressed }) => [
                    styles.actionRow,
                    {
                      backgroundColor: pressed
                        ? theme.colors.surfaceMuted
                        : theme.colors.card,
                      borderColor: theme.colors.cardBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.actionIconWrap,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <UsersRound size={22} color={theme.colors.primary} strokeWidth={2.3} />
                  </View>
                  <View style={styles.actionTextWrap}>
                    <Text style={[styles.actionTitle, { color: theme.colors.textPrimary }]}>
                      New Group
                    </Text>
                    <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                      Create a secure clinical group chat
                    </Text>
                  </View>
                </Pressable>

                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  Contacts & Connections
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isStarting = startingChatId === item._id;
            return (
              <Pressable
                onPress={() => void handleStartChat(item)}
                disabled={Boolean(startingChatId)}
                style={({ pressed }) => [
                  styles.contactRow,
                  {
                    backgroundColor: pressed
                      ? theme.colors.surfaceMuted
                      : theme.colors.card,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.avatarContainer}>
                  <Avatar
                    name={item.name}
                    uri={item.profileImage}
                    verified={item.isVerified}
                    size={48}
                  />
                  {item.isOnline ? <View style={[styles.onlineDot, { borderColor: theme.colors.card }]} /> : null}
                </View>

                <View style={styles.contactInfo}>
                  <Text
                    style={[styles.contactName, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.contactMeta, { color: theme.colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.role || "Medical Professional"}
                    {item.specialization ? ` • ${item.specialization}` : ""}
                  </Text>
                  {item.hospital ? (
                    <Text
                      style={[styles.contactHospital, { color: theme.colors.textTertiary }]}
                      numberOfLines={1}
                    >
                      {item.hospital}
                    </Text>
                  ) : null}
                </View>

                {isStarting ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<UserPlus size={32} color={theme.colors.primary} />}
              title={searchText ? "No contacts match" : "No connections found"}
              body={
                searchText
                  ? "Try searching for a different name or specialty."
                  : "Follow colleagues or discover healthcare professionals to start messaging."
              }
            />
          }
          keyboardShouldPersistTaps="handled"
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
  },
  errorTitle: {
    marginTop: 16,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
  },
  errorDesc: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 10,
  },
  headerSection: {
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
  },
  actionSubtitle: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarContainer: {
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
  },
  contactInfo: {
    flex: 1,
    justifyContent: "center",
  },
  contactName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    marginBottom: 2,
  },
  contactMeta: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },
  contactHospital: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
  },
});
