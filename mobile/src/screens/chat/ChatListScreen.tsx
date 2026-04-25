import React, { useEffect, useMemo } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
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

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const conversationsWithPeer = useMemo(
    () =>
      conversations.map((conversation) => {
        const peer = (conversation.participants || []).find((item) => item._id !== user?._id) as User | undefined;
        return { ...conversation, peer };
      }),
    [conversations, user?._id]
  );

  const openConversation = (conversation: Conversation & { peer?: User }) => {
    navigation.navigate("ChatScreen", {
      conversationId: conversation._id,
      title: conversation.peer?.name || "Conversation"
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Messages</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Real-time clinical chats</Text>
      </View>

      <FlatList
        data={conversationsWithPeer}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openConversation(item)}
            style={[styles.row, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Avatar
              name={item.peer?.name || "Medical Professional"}
              uri={item.peer?.profileImage}
              verified={item.peer?.isVerified}
              size={52}
            />
            <View style={styles.messageWrap}>
              <View style={styles.rowBetween}>
                <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {item.peer?.name || "Medical Professional"}
                </Text>
                <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                  {formatRelativeTime(item.updatedAt)}
                </Text>
              </View>
              <Text numberOfLines={1} style={[styles.preview, { color: theme.colors.textSecondary }]}>
                {item.lastMessage || "Start your conversation"}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No conversations yet. Start by opening a chat from a user profile.
          </Text>
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
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 27 },
  subtitle: { marginTop: 4, fontFamily: "Manrope_500Medium", fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 6, gap: 10 },
  row: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  messageWrap: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, flex: 1, marginRight: 8 },
  time: { fontFamily: "Manrope_500Medium", fontSize: 11 },
  preview: { marginTop: 4, fontFamily: "Manrope_500Medium", fontSize: 13 },
  emptyText: { marginTop: 28, textAlign: "center", fontFamily: "Manrope_500Medium" }
});
