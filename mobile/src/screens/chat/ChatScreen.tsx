import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SendHorizontal } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import { ChatBubble } from "@/components/chat/ChatBubble";
import { getSocket } from "@/services/socket/socketClient";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { hapticTap } from "@/utils/haptics";
import type { Message } from "@/types/models";
import type { RootStackParamList } from "@/navigation/types";

export function ChatScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "ChatScreen">>();

  const user = useAuthStore((state) => state.user);
  const {
    messagesByConversation,
    paginationByConversation,
    fetchMessages,
    loadOlderMessages,
    sendMessage
  } = useChatStore((state) => state);

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const conversationId = route.params.conversationId;

  // Since the FlatList is inverted, we display messages in reversed order.
  // The store keeps them chronological (oldest → newest), so we reverse for display.
  const messages = (messagesByConversation[conversationId] || []).slice().reverse();
  const pagination = paginationByConversation[conversationId];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: route.params.title || "Conversation"
    });
  }, [navigation, route.params.title]);

  useEffect(() => {
    fetchMessages(conversationId);

    const socket = getSocket();
    socket?.emit("joinConversation", { conversationId });
  }, [conversationId, fetchMessages]);

  const handleSend = async () => {
    if (!messageText.trim()) {
      return;
    }

    try {
      setSending(true);
      await sendMessage(conversationId, messageText);
      setMessageText("");
      hapticTap();
    } finally {
      setSending(false);
    }
  };

  // Called when the inverted FlatList scrolls near the top (i.e., near older messages)
  const handleLoadOlder = useCallback(() => {
    void loadOlderMessages(conversationId);
  }, [conversationId, loadOlderMessages]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <ChatBubble message={item} isMine={item.senderId._id === user?._id} />
    ),
    [user?._id]
  );

  const keyExtractor = useCallback((item: Message) => item._id, []);

  // Loading spinner shown at the "top" of the list (which is the bottom visually due to invert)
  const listFooter = pagination?.loading ? (
    <View style={styles.loadingOlderWrap}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
    </View>
  ) : null;

  // "Typing..." indicator shown at the bottom of the visible list (newest end)
  const listHeader =
    messageText.length > 0 ? (
      <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>Typing…</Text>
    ) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesContent}
        // Invert so newest messages are at the bottom without manual scrollToEnd
        inverted
        // Performance tuning
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
        // Load older messages when user scrolls near the top (= "end" of inverted list)
        onEndReached={handleLoadOlder}
        onEndReachedThreshold={0.3}
        // Footer in inverted list = visually at the top = loading spinner for older msgs
        ListFooterComponent={listFooter}
        // Header in inverted list = visually at the bottom = typing indicator
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.inputRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a secure message"
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          multiline
          maxLength={3000}
          returnKeyType="default"
        />

        <Pressable
          onPress={handleSend}
          disabled={sending || !messageText.trim()}
          style={[
            styles.sendButton,
            {
              backgroundColor: messageText.trim() ? theme.colors.primary : theme.colors.border
            }
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <SendHorizontal size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10
  },
  typingText: {
    marginBottom: 10,
    marginLeft: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 12
  },
  loadingOlderWrap: {
    paddingVertical: 12,
    alignItems: "center"
  },
  inputRow: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: "Manrope_500Medium"
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  }
});
