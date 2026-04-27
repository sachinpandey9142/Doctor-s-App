import React, { useEffect, useMemo } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const { conversations, fetchConversations } = useChatStore((state) => state);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const conversationsWithPeer = useMemo(
    () => conversations.map((conv) => {
      const peer = (conv.participants || []).find((item) => item._id !== user?._id) as User | undefined;
      return { ...conv, peer };
    }),
    [conversations, user?._id]
  );

  const openConversation = (conv: Conversation & { peer?: User }) => {
    navigation.navigate("ChatScreen", {
      conversationId: conv._id,
      title: conv.isGroup ? (conv.title || "Case Discussion") : (conv.peer?.name || "Conversation")
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Messages</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {conversations.length > 0
            ? `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`
            : "Secure clinical chats"}
        </Text>
      </View>

      <FlatList
        data={conversationsWithPeer}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 35).duration(260).springify()}>
            <Pressable
              onPress={() => openConversation(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.surface,
                  borderColor: theme.colors.border
                }
              ]}
            >
              <Avatar
                name={item.isGroup ? (item.title || "Case Discussion") : (item.peer?.name || "Medical Professional")}
                uri={item.isGroup ? "" : item.peer?.profileImage}
                verified={!item.isGroup && item.peer?.isVerified}
                size={48}
              />
              <View style={styles.messageWrap}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {item.isGroup ? (item.title || "Case Discussion") : (item.peer?.name || "Medical Professional")}
                  </Text>
                  <Text style={[styles.time, { color: theme.colors.textTertiary }]}>
                    {formatRelativeTime(item.updatedAt)}
                  </Text>
                </View>
                <Text numberOfLines={1} style={[styles.preview, { color: theme.colors.textSecondary }]}>
                  {item.lastMessage || "Tap to start the conversation"}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<MessageCircle size={30} color={theme.colors.primary} />}
            title="No conversations yet"
            body="Start a chat by visiting a professional's profile and tapping Message."
            ctaLabel="Find Professionals"
            onCta={() => navigation.navigate("Discover")}
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
    paddingBottom: 14,
    borderBottomWidth: 1
  },
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 26 },
  subtitle: { marginTop: 3, fontFamily: "Manrope_500Medium", fontSize: 13 },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 120,
    gap: 2
  },
  row: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  messageWrap: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, flex: 1, marginRight: 6 },
  time: { fontFamily: "Manrope_500Medium", fontSize: 11 },
  preview: { marginTop: 3, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 19 }
});
