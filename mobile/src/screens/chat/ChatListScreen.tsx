import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BellOff,
  CheckCheck,
  MessageCircle,
  Pencil,
  Pin,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";

import { EmptyState } from "@/components/common/EmptyState";
import { Avatar } from "@/components/common/Avatar";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { formatRelativeTime } from "@/utils/date";
import { resolveConversationPeer } from "@/utils/identityResolver";
import type { RootStackParamList } from "@/navigation/types";
import type { Conversation, ResolvedPeerIdentity, User } from "@/types/models";

const CHAT_ROW_HEIGHT = 80;

export function ChatListScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const {
    conversations,
    loadingConversations,
    loadingHeadersByConversation,
    fetchConversations,
  } = useChatStore((state) => state);

  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const conversationsWithPeer = useMemo(
    () =>
      conversations.map((conv) => {
        let peer = conv.peer;
        if (!conv.isGroup && (!peer || String(peer.id) === String(user?._id))) {
          peer = resolveConversationPeer(conv, user?._id);
        }
        return { ...conv, peer: conv.isGroup ? undefined : peer };
      }),
    [conversations, user?._id],
  );

  const filtered = useMemo(() => {
    if (!searchText.trim()) return conversationsWithPeer;
    const q = searchText.toLowerCase();
    return conversationsWithPeer.filter((c) => {
      const name = c.isGroup
        ? c.title || "Case Discussion"
        : c.peer?.displayName || "";
      const lastMessage = c.lastMessage || "";
      return `${name} ${lastMessage}`.toLowerCase().includes(q);
    });
  }, [conversationsWithPeer, searchText]);

  const totalUnread = conversationsWithPeer.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0,
  );

  const openConversation = useCallback(
    (conv: Conversation & { peer?: ResolvedPeerIdentity }) => {
      navigation.navigate("ChatScreen", {
        conversationId: conv._id,
        title: conv.isGroup
          ? conv.title || "Case Discussion"
          : conv.peer?.displayName || "Conversation",
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: Conversation & { peer?: ResolvedPeerIdentity };
      index: number;
    }) => {
      const unread = item.unreadCount || 0;
      const isGroup = Boolean(item.isGroup);
      const isTyping =
        !isGroup && unread === 0 && item._id.charCodeAt(0) % 7 === 0;
      const isPinned = item._id.charCodeAt(0) % 5 === 0;
      const isMuted = item._id.charCodeAt(0) % 6 === 0;
      const isRead = item._id.charCodeAt(0) % 2 === 0;

      // Requirement 2: Remove fallback rendering during loading. True if conversations or specific headers are actively fetching.
      const isHydrating =
        loadingConversations || Boolean(loadingHeadersByConversation[item._id]);

      // Requirement 5: Add proper error states. If peer truly missing after hydration, show "User unavailable".
      const name = isGroup
        ? item.title || "Group Chat"
        : item.peer?.displayName || "User unavailable";

      const preview = isTyping
        ? "typing..."
        : item.lastMessage || "Tap to start the conversation";
      const participantCount = item.participants?.length || 0;
      const avatarUri = isGroup
        ? item.image || ""
        : item.peer?.profileImage || "";

      return (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index * 28, 180)).duration(240)}
          layout={LinearTransition.springify().damping(18)}
        >
          <Pressable
            onPress={() => openConversation(item)}
            disabled={isHydrating}
            android_ripple={{
              color: theme.colors.overlaySoft,
              borderless: false,
            }}
            style={({ pressed }) => [
              styles.chatRow,
              unread > 0 && styles.chatRowUnread,
              pressed && styles.chatRowPressed,
            ]}
          >
            {isHydrating ? (
              <View style={styles.skeletonContainer}>
                <View
                  style={[
                    styles.avatarSkeleton,
                    { backgroundColor: theme.colors.borderLight },
                  ]}
                />
                <View style={styles.skeletonTextWrap}>
                  <View
                    style={[
                      styles.nameSkeleton,
                      { backgroundColor: theme.colors.borderLight },
                    ]}
                  />
                  <View
                    style={[
                      styles.previewSkeleton,
                      { backgroundColor: theme.colors.borderLight },
                    ]}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.avatarShell}>
                  <Avatar
                    name={name}
                    uri={avatarUri}
                    size={52}
                    verified={!isGroup && Boolean(item.peer?.isVerified)}
                    online={!isGroup && Boolean(item.peer?.isOnline)}
                  />
                </View>

                <View style={styles.chatContent}>
                  <View style={styles.chatTopLine}>
                    <View style={styles.nameCluster}>
                      <Text
                        style={[
                          styles.chatName,
                          unread > 0 && styles.chatNameUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      {!isGroup && item.peer?.isVerified ? (
                        <ShieldCheck
                          size={13}
                          color={theme.colors.primary}
                          strokeWidth={2.4}
                        />
                      ) : null}
                    </View>
                    <Text
                      style={[styles.timeText, unread > 0 && styles.timeUnread]}
                    >
                      {formatRelativeTime(item.updatedAt)}
                    </Text>
                  </View>

                  <View style={styles.chatBottomLine}>
                    <View style={styles.previewWrap}>
                      {unread === 0 && !isTyping ? (
                        <CheckCheck
                          size={14}
                          color={
                            isRead
                              ? theme.colors.primary
                              : theme.colors.iconMuted
                          }
                          strokeWidth={2.2}
                        />
                      ) : null}
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.previewText,
                          unread > 0 && styles.previewUnread,
                          isTyping && styles.typingText,
                        ]}
                      >
                        {isGroup && !isTyping && participantCount > 2
                          ? `${participantCount} members  ·  ${preview}`
                          : preview}
                      </Text>
                    </View>

                    <View style={styles.stateCluster}>
                      {isPinned ? (
                        <Pin
                          size={13}
                          color={theme.colors.iconMuted}
                          strokeWidth={2.1}
                        />
                      ) : null}
                      {isMuted ? (
                        <BellOff
                          size={13}
                          color={theme.colors.iconMuted}
                          strokeWidth={2.1}
                        />
                      ) : null}
                      {unread > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {unread > 99 ? "99+" : unread}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </>
            )}
          </Pressable>
        </Animated.View>
      );
    },
    [openConversation, styles, theme],
  );

  const getItemLayout = useCallback(
    (
      _:
        | ArrayLike<Conversation & { peer?: ResolvedPeerIdentity }>
        | null
        | undefined,
      index: number,
    ) => ({
      length: CHAT_ROW_HEIGHT,
      offset: CHAT_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradients.appBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />
      <View style={styles.topGlow} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>
              {totalUnread > 0
                ? `${totalUnread} unread across clinical chats`
                : conversations.length > 0
                  ? `${conversations.length} active conversations`
                  : "Secure clinical chats"}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => navigation.navigate("CreateGroupScreen")}
              style={({ pressed }) => [
                styles.headerIconButton,
                pressed && styles.iconButtonPressed,
              ]}
              accessibilityLabel="Create Group"
            >
              <UsersRound
                size={20}
                color={theme.colors.icon}
                strokeWidth={2.3}
              />
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("NewChatScreen")}
              style={({ pressed }) => [
                styles.headerIconButton,
                styles.headerPrimaryButton,
                pressed && styles.iconButtonPressed,
              ]}
              accessibilityLabel="New Chat"
            >
              <Pencil
                size={20}
                color={theme.colors.primary}
                strokeWidth={2.5}
              />
            </Pressable>
          </View>
        </View>

        <View
          style={[styles.searchBar, searchFocused && styles.searchBarFocused]}
        >
          <Search
            size={17}
            color={
              searchFocused ? theme.colors.primary : theme.colors.iconMuted
            }
            strokeWidth={2.2}
          />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search messages or people"
            placeholderTextColor={theme.colors.placeholder}
            style={styles.searchInput}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchText.length > 0 ? (
            <Pressable
              onPress={() => setSearchText("")}
              hitSlop={10}
              style={({ pressed }) => pressed && styles.clearPressed}
            >
              <X size={15} color={theme.colors.iconMuted} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 104 },
        ]}
        renderItem={renderItem}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.sectionLabel}>Inbox</Text>
              <Text style={styles.sectionMeta}>{filtered.length} chats</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={<MessageCircle size={30} color={theme.colors.primary} />}
            title={searchText ? "No results found" : "No conversations yet"}
            body={
              searchText
                ? `No conversations match "${searchText}".`
                : "Start a chat by visiting a professional's profile and tapping Message."
            }
            ctaLabel={searchText ? undefined : "Find Professionals"}
            onCta={
              searchText ? undefined : () => navigation.navigate("Discover")
            }
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={10}
        getItemLayout={getItemLayout}
        removeClippedSubviews={Platform.OS === "android"}
      />

      <Pressable
        onPress={() => navigation.navigate("CreateGroupScreen")}
        style={({ pressed }) => [
          styles.composeButtonWrap,
          { bottom: insets.bottom + 92 },
          pressed && styles.composePressed,
        ]}
      >
        <BlurView
          intensity={theme.isDark ? 24 : 14}
          tint={theme.isDark ? "dark" : "light"}
          style={styles.composeBlur}
        >
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.composeButton}
          >
            <Pencil
              size={22}
              color={theme.colors.textInverted}
              strokeWidth={2.5}
            />
          </LinearGradient>
        </BlurView>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    background: {
      ...StyleSheet.absoluteFillObject,
    },
    topGlow: {
      position: "absolute",
      top: -90,
      right: -80,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: theme.colors.glow,
    },
    header: {
      paddingHorizontal: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.headerBorder,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    titleBlock: {
      flex: 1,
      paddingRight: 14,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 31,
      lineHeight: 37,
      letterSpacing: 0,
    },
    subtitle: {
      marginTop: 2,
      color: theme.colors.textSecondary,
      fontFamily: "Manrope_600SemiBold",
      fontSize: 13,
      lineHeight: 18,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerIconButton: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerPrimaryButton: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primaryMid,
    },
    iconButtonPressed: {
      transform: [{ scale: 0.96 }],
      backgroundColor: theme.colors.primaryLight,
    },
    searchBar: {
      minHeight: 46,
      borderRadius: 18,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchBarFocused: {
      borderColor: theme.colors.primaryMid,
      ...theme.shadow.card,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_600SemiBold",
      fontSize: 14,
      padding: 0,
    },
    clearPressed: {
      opacity: 0.7,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: 10,
    },
    listHeader: {
      paddingHorizontal: 6,
      paddingTop: 2,
      paddingBottom: 7,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionLabel: {
      color: theme.colors.textSecondary,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    sectionMeta: {
      color: theme.colors.textTertiary,
      fontFamily: "Manrope_600SemiBold",
      fontSize: 12,
    },
    chatRow: {
      minHeight: 74,
      marginBottom: 6,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    chatRowUnread: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primaryMid,
    },
    chatRowPressed: {
      transform: [{ scale: 0.988 }],
      backgroundColor: theme.colors.surfaceMuted,
    },
    skeletonContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    avatarSkeleton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      opacity: 0.6,
    },
    skeletonTextWrap: {
      flex: 1,
      justifyContent: "center",
      gap: 8,
    },
    nameSkeleton: {
      width: 140,
      height: 16,
      borderRadius: 8,
      opacity: 0.6,
    },
    previewSkeleton: {
      width: "80%",
      height: 14,
      borderRadius: 7,
      opacity: 0.6,
    },
    avatarShell: {
      width: 52,
      height: 52,
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    statusRing: {
      position: "absolute",
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: theme.colors.primaryMid,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: theme.colors.textInverted,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 15,
      letterSpacing: 0.2,
    },
    onlineDot: {
      position: "absolute",
      right: 1,
      bottom: 1,
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor: theme.colors.success,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    chatContent: {
      flex: 1,
      minWidth: 0,
    },
    chatTopLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nameCluster: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    chatName: {
      flexShrink: 1,
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_700Bold",
      fontSize: 15,
      lineHeight: 20,
    },
    chatNameUnread: {
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_800ExtraBold",
    },
    timeText: {
      color: theme.colors.textTertiary,
      fontFamily: "Manrope_600SemiBold",
      fontSize: 11,
      flexShrink: 0,
    },
    timeUnread: {
      color: theme.colors.primary,
    },
    chatBottomLine: {
      marginTop: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    previewWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    previewText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: "Manrope_500Medium",
      fontSize: 13,
      lineHeight: 18,
    },
    previewUnread: {
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_700Bold",
    },
    typingText: {
      color: theme.colors.teal,
      fontFamily: "Manrope_700Bold",
    },
    stateCluster: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      flexShrink: 0,
    },
    unreadBadge: {
      minWidth: 21,
      height: 21,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
    },
    unreadBadgeText: {
      color: theme.colors.textInverted,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 10,
    },
    composeButtonWrap: {
      position: "absolute",
      right: 18,
      borderRadius: 24,
      ...theme.shadow.floating,
    },
    composePressed: {
      transform: [{ scale: 0.94 }],
    },
    composeBlur: {
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    composeButton: {
      width: 56,
      height: 56,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
  });
