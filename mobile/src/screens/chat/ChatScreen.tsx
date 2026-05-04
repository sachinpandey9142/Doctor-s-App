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
import { SendHorizontal, Paperclip } from "lucide-react-native";
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
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversationId = route.params.conversationId;
  const messages = (messagesByConversation[conversationId] || []).slice().reverse();
  const pagination = paginationByConversation[conversationId];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View>
          <Text style={[headerStyles.title, { color: theme.colors.textPrimary }]}>
            {route.params.title || "Conversation"}
          </Text>
          <View style={headerStyles.statusRow}>
            <View style={headerStyles.onlineDot} />
            <Text style={[headerStyles.statusText, { color: theme.colors.textSecondary }]}>Online</Text>
          </View>
        </View>
      )
    });
  }, [navigation, route.params.title, theme.colors]);

  useEffect(() => {
    fetchMessages(conversationId);
    const socket = getSocket();
    socket?.emit("joinConversation", { conversationId });

    // Listen for typing events
    socket?.on("userTyping", ({ conversationId: cid }: { conversationId: string }) => {
      if (cid === conversationId) {
        setIsTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsTyping(false), 2500);
      }
    });

    return () => {
      socket?.off("userTyping");
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [conversationId, fetchMessages]);

  const emitTyping = () => {
    const socket = getSocket();
    socket?.emit("typing", { conversationId });
  };

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
    ({ item }: { item: Message }) => (
      <ChatBubble
        message={item}
        isMine={item.senderId._id === user?._id}
      />
    ),
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
      style={[styles.container, { backgroundColor: "#F0F4FF" }]}
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
        ListHeaderComponent={
          isTyping ? (
            <View style={[styles.typingBubble, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, { backgroundColor: theme.colors.textTertiary }]} />
                <View style={[styles.dot, { backgroundColor: theme.colors.textTertiary, marginHorizontal: 3 }]} />
                <View style={[styles.dot, { backgroundColor: theme.colors.textTertiary }]} />
              </View>
            </View>
          ) : null
        }
      />

      {/* ── Input bar ──────────────────────────────────── */}
      <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={[styles.attachBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <Paperclip size={17} color={theme.colors.textSecondary} strokeWidth={2} />
        </Pressable>

        <View style={[styles.inputWrap, { backgroundColor: "#F1F5F9", borderColor: theme.colors.border }]}>
          <TextInput
            ref={inputRef}
            value={messageText}
            onChangeText={(t) => { setMessageText(t); emitTyping(); }}
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

const headerStyles = StyleSheet.create({
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#10B981" },
  statusText: { fontFamily: "Manrope_500Medium", fontSize: 11 }
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesContent: {
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 10
  },
  loadingOlderWrap: { paddingVertical: 12, alignItems: "center" },
  typingBubble: {
    alignSelf: "flex-start",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 10,
    marginBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2
  },
  typingDots: { flexDirection: "row", alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 48,
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
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8
  }
});
