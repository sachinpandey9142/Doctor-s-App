import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";
import {
  ArrowLeft,
  SendHorizontal,
  Stethoscope,
  Users,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
} from "react-native-reanimated";

import { Avatar } from "@/components/common/Avatar";
import { getSocket } from "@/services/socket/socketClient";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { hapticTap } from "@/utils/haptics";
import { formatRelativeTime } from "@/utils/date";
import type { Message } from "@/types/models";
import type { RootStackParamList } from "@/navigation/types";

type RouteParams = RouteProp<RootStackParamList, "CaseDiscussionThread">;

export function CaseDiscussionThreadScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();

  const { conversationId, title, caseAuthor, caseSnippet } = route.params;

  const user = useAuthStore((s) => s.user);
  const {
    messagesByConversation,
    paginationByConversation,
    fetchMessages,
    loadOlderMessages,
    sendMessage,
  } = useChatStore((s) => s);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const messages = useMemo(() => {
    const ordered = (messagesByConversation[conversationId] || [])
      .slice()
      .reverse();
    return Array.from(
      new Map(ordered.map((message) => [message._id, message])).values(),
    );
  }, [conversationId, messagesByConversation]);
  const pagination = paginationByConversation[conversationId];

  useEffect(() => {
    fetchMessages(conversationId);
    const socket = getSocket();
    socket?.emit("joinConversation", { conversationId });

    return () => {
      socket?.emit("leaveConversation", { conversationId });
    };
  }, [conversationId, fetchMessages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const draft = text.trim();
    setText("");
    setSending(true);
    try {
      hapticTap();
      await sendMessage(conversationId, draft);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMine = item.senderId._id === user?._id;
      return (
        <Animated.View
          entering={(isMine ? FadeInRight : FadeInLeft)
            .duration(200)
            .springify()
            .damping(18)}
          style={[
            styles.msgRow,
            isMine ? styles.msgRowRight : styles.msgRowLeft,
          ]}
        >
          {!isMine && (
            <Avatar
              name={item.senderId.name}
              uri={item.senderId.profileImage}
              size={32}
            />
          )}
          <View
            style={[
              styles.msgBubble,
              isMine ? styles.msgBubbleMine : styles.msgBubbleOther,
            ]}
          >
            {!isMine && (
              <Text style={styles.msgSenderName}>{item.senderId.name}</Text>
            )}
            {isMine ? (
              <LinearGradient
                colors={["#2563EB", "#06B6D4"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bubbleGradient}
              >
                <Text style={styles.msgTextMine}>{item.text}</Text>
                <Text style={styles.msgTimeMine}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.bubbleOtherInner}>
                <Text
                  style={[styles.msgText, { color: theme.colors.textPrimary }]}
                >
                  {item.text}
                </Text>
                <Text
                  style={[styles.msgTime, { color: theme.colors.textTertiary }]}
                >
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      );
    },
    [user?._id, theme],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.borderLight,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitle}>
          <View style={styles.headerIconRow}>
            <View style={styles.headerIcon}>
              <Stethoscope size={12} color="#7C3AED" />
            </View>
            <Text style={[styles.headerLabel, { color: "#7C3AED" }]}>
              CASE DISCUSSION
            </Text>
          </View>
          <Text
            style={[styles.headerName, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {title || "Case Discussion"}
          </Text>
          {caseAuthor ? (
            <Text
              style={[styles.headerSub, { color: theme.colors.textSecondary }]}
            >
              Posted by {caseAuthor}
            </Text>
          ) : null}
        </View>
        <View style={styles.participantsIcon}>
          <Users size={16} color={theme.colors.textSecondary} />
        </View>
      </View>

      {/* ── Case Preview Card ────────────────────────────────────── */}
      {caseSnippet ? (
        <View
          style={[
            styles.casePreview,
            { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" },
          ]}
        >
          <Stethoscope size={12} color="#7C3AED" />
          <Text style={styles.casePreviewText} numberOfLines={2}>
            {caseSnippet}
          </Text>
        </View>
      ) : null}

      {/* ── Messages ─────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {pagination?.loading && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={{ marginVertical: 8 }}
          />
        )}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, index) => `${item._id}-${index}`}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
          inverted
          onEndReached={() => void loadOlderMessages(conversationId)}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={7}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Stethoscope size={32} color="#DDD6FE" />
              <Text style={styles.emptyTitle}>Start the discussion</Text>
              <Text style={styles.emptyBody}>
                Share your thoughts, questions, or insights on this clinical
                case.
              </Text>
            </View>
          }
        />

        {/* ── Input ────────────────────────────────────────────────── */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.borderLight,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="Add to the discussion..."
            placeholderTextColor={theme.colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={800}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
          >
            <LinearGradient
              colors={["#2563EB", "#06B6D4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendGradient}
            >
              <SendHorizontal size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1 },
  headerIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  headerIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9.5,
    letterSpacing: 1,
  },
  headerName: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 16 },
  headerSub: { fontFamily: "Manrope_500Medium", fontSize: 12, marginTop: 1 },
  participantsIcon: { padding: 4 },
  // Case preview
  casePreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  casePreviewText: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    color: "#7C3AED",
    lineHeight: 20,
  },
  // Messages
  messageList: { paddingHorizontal: 14, paddingTop: 12 },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
  },
  msgRowLeft: { justifyContent: "flex-start" },
  msgRowRight: { justifyContent: "flex-end" },
  msgBubble: { maxWidth: "76%" },
  msgBubbleMine: { alignItems: "flex-end" },
  msgBubbleOther: { alignItems: "flex-start" },
  msgSenderName: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: "#2563EB",
    marginBottom: 3,
    marginLeft: 14,
  },
  bubbleGradient: {
    borderRadius: 18,
    borderBottomRightRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOtherInner: {
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgText: { fontFamily: "Manrope_500Medium", fontSize: 15, lineHeight: 22 },
  msgTextMine: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 22,
    color: "#FFFFFF",
  },
  msgTime: {
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    marginTop: 3,
    textAlign: "left",
  },
  msgTimeMine: {
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    marginTop: 3,
    color: "rgba(255,255,255,0.6)",
    textAlign: "right",
  },
  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    color: "#0F172A",
    marginTop: 14,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  // Input
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    maxHeight: 110,
    lineHeight: 22,
  },
  sendBtn: { marginBottom: 2 },
  sendGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
