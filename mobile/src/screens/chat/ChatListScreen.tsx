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
import { useTheme } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle, Plus, Search, X } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { theme } from "@/constants/theme";
const baseShadow = theme.shadow;

import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { formatRelativeTime } from "@/utils/date";
import type { RootStackParamList } from "@/navigation/types";
import type { Conversation, User } from "@/types/models";

export function ChatListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const { conversations, fetchConversations } = useChatStore((state) => state);

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const conversationsWithPeer = useMemo(
    () =>
      conversations.map((conv) => {
        const peer = (conv.participants || []).find(
          (item) => item._id !== user?._id,
        ) as User | undefined;
        return { ...conv, peer };
      }),
    [conversations, user?._id],
  );

  const filtered = useMemo(() => {
    if (!searchText.trim()) return conversationsWithPeer;
    const q = searchText.toLowerCase();
    return conversationsWithPeer.filter((c) => {
      const name = c.isGroup
        ? c.title || "Case Discussion"
        : c.peer?.name || "";
      return name.toLowerCase().includes(q);
    });
  }, [conversationsWithPeer, searchText]);

  const openConversation = (conv: Conversation & { peer?: User }) => {
    navigation.navigate("ChatScreen", {
      conversationId: conv._id,
      title: conv.isGroup
        ? conv.title || "Case Discussion"
        : conv.peer?.name || "Conversation",
    });
  };

  const totalUnread = conversationsWithPeer.reduce(
    (acc, c) => acc + ((c as any).unreadCount || 0),
    0,
  );

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: Conversation & { peer?: User };
      index: number;
    }) => {
      const unread: number = (item as any).unreadCount || 0;
      const name = item.isGroup
        ? item.title || "Case Discussion"
        : item.peer?.name || "Medical Professional";
      return (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index * 35, 200))
            .duration(260)
            .springify()}
        >
          <Pressable
            onPress={() => openConversation(item)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed
                  ? theme.colors.primaryLight
                  : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Avatar
              name={name}
              uri={item.isGroup ? "" : item.peer?.profileImage}
              verified={!item.isGroup && item.peer?.isVerified}
              size={48}
            />
            <View style={styles.messageWrap}>
              <View style={styles.rowBetween}>
                <Text
                  style={[
                    styles.name,
                    {
                      color:
                        unread > 0
                          ? theme.colors.textPrimary
                          : theme.colors.textPrimary,
                    },
                    unread > 0 && styles.nameUnread,
                  ]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <Text
                  style={[styles.time, { color: theme.colors.textTertiary }]}
                >
                  {formatRelativeTime(item.updatedAt)}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.preview,
                    {
                      color:
                        unread > 0
                          ? theme.colors.textPrimary
                          : theme.colors.textSecondary,
                    },
                    unread > 0 && styles.previewUnread,
                  ]}
                >
                  {item.lastMessage || "Tap to start the conversation"}
                </Text>
                {unread > 0 ? (
                  <View
                    style={[
                      styles.unreadBadge,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.unreadBadgeText,
                        { color: theme.colors.textInverted },
                      ]}
                    >
                      {unread > 99 ? "99+" : unread}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      );
    },
    [openConversation, theme],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 14,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.borderLight,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Messages
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {totalUnread > 0
                ? `${totalUnread} unread`
                : conversations.length > 0
                  ? `${conversations.length} conversations`
                  : "Secure clinical chats"}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("CreateGroupScreen")}
            style={({ pressed }) => [
              styles.newGroupButton,
              {
                backgroundColor: pressed
                  ? theme.colors.primaryLight
                  : theme.colors.primary,
              },
            ]}
          >
            <Plus
              size={16}
              color={theme.colors.textInverted}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.newGroupText,
                { color: theme.colors.textInverted },
              ]}
            >
              New Group
            </Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={15} color={theme.colors.textTertiary} strokeWidth={2} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search conversations…"
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            returnKeyType="search"
          />
          {searchText.length > 0 ? (
            <Pressable onPress={() => setSearchText("")}>
              <X size={14} color={theme.colors.textTertiary} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
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
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={9}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 26 },
  subtitle: { marginTop: 3, fontFamily: "Manrope_500Medium", fontSize: 13 },
  newGroupButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  newGroupText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 120,
    gap: 2,
  },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
    ...baseShadow.card,
    elevation: 1,
  },
  messageWrap: { flex: 1 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 15,
    flex: 1,
    marginRight: 6,
  },
  nameUnread: { fontFamily: "SpaceGrotesk_700Bold" },
  time: { fontFamily: "Manrope_500Medium", fontSize: 11 },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 6,
  },
  preview: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  previewUnread: { fontFamily: "Manrope_700Bold" },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    flexShrink: 0,
  },
  unreadBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
  },
});
