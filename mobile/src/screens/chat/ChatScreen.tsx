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
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatBubble } from "@/components/chat/ChatBubble";
import { getSocket } from "@/services/socket/socketClient";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { hapticTap } from "@/utils/haptics";
import type { Message } from "@/types/models";
import type { RootStackParamList } from "@/navigation/types";

export function ChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "ChatScreen">>();

  const user = useAuthStore((state) => state.user);
  const { messagesByConversation, paginationByConversation, fetchMessages, loadOlderMessages, sendMessage } =
    useChatStore((state) => state);

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const conversationId = route.params.conversationId;
  const messages = (messagesByConversation[conversationId] || []).slice().reverse();
  const pagination = paginationByConversation[conversationId];

  useLayoutEffect(() => {
    navigation.setOptions({ title: route.params.title || "Conversation" });
  }, [navigation, route.params.title]);

  useEffect(() => {
    fetchMessages(conversationId);
    const socket = getSocket();
    socket?.emit("joinConversation", { conversationId });
  }, [conversationId, fetchMessages]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    try {
      setSending(true);
      await sendMessage(conversationId, messageText);
      setMessageText("");
      hapticTap();
    } finally {
      setSending(false);
    }
  };

  const handleLoadOlder = useCallback(() => { void loadOlderMessages(conversationId); }, [conversationId, loadOlderMessages]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => <ChatBubble message={item} isMine={item.senderId._id === user?._id} />,
    [user?._id]
  );

  const listFooter = pagination?.loading ? (
    <View style={styles.loadingOlderWrap}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
    </View>
  ) : null;

  const canSend = messageText.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: "#F8FAFC" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesContent}
        inverted
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
        onEndReached={handleLoadOlder}
        onEndReachedThreshold={0.3}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
      />

      {/* ── Input bar ──────────────────────────────────── */}
      <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 10 }]}>
        <View style={[styles.inputWrap, { backgroundColor: "#F1F5F9", borderColor: theme.colors.border }]}>
          <TextInput
            ref={inputRef}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a secure message…"
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.input, { color: theme.colors.textPrimary }]}
            multiline
            maxLength={3000}
            returnKeyType="default"
          />
        </View>

        <Pressable
          onPress={() => void handleSend()}
          disabled={sending || !canSend}
          style={styles.sendBtnWrap}
        >
          <LinearGradient
            colors={canSend ? ["#2563EB", "#06B6D4"] : [theme.colors.border, theme.colors.border]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendBtn}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <SendHorizontal size={18} color="#FFFFFF" strokeWidth={2} />
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesContent: {
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 10
  },
  loadingOlderWrap: { paddingVertical: 12, alignItems: "center" },
  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Floating layer — distinct from message area
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center"
  },
  input: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    maxHeight: 100,
    lineHeight: 22
  },
  sendBtnWrap: {},
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4
  }
});
