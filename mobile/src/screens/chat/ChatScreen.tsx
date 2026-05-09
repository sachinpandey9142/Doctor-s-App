import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  EllipsisVertical,
  MessageCircleMore,
  SendHorizontal,
  Users,
} from "lucide-react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { ChatBubble } from "@/components/chat/ChatBubble";
import {
  clearGroupChatRequest,
  getGroupRequest,
  leaveGroupRequest,
  renameGroupRequest,
} from "@/services/api/groupApi";
import { getSocket } from "@/services/socket/socketClient";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { hapticTap } from "@/utils/haptics";
import type { RootStackParamList } from "@/navigation/types";
import type { Message, User } from "@/types/models";

export function ChatScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "ChatScreen">>();

  const user = useAuthStore((state) => state.user);
  const conversationId = route.params.conversationId;

  const conversationMeta = useChatStore((state) =>
    state.conversations.find((item) => item._id === conversationId),
  );
  const messagesByConversation = useChatStore(
    (state) => state.messagesByConversation,
  );
  const paginationByConversation = useChatStore(
    (state) => state.paginationByConversation,
  );
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const loadOlderMessages = useChatStore((state) => state.loadOlderMessages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const removeConversation = useChatStore((state) => state.removeConversation);
  const clearConversationMessages = useChatStore(
    (state) => state.clearConversationMessages,
  );

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [groupMenuVisible, setGroupMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  const isGroupConversation =
    route.params.isGroup ?? conversationMeta?.isGroup ?? false;

  const peer = useMemo(() => {
    if (isGroupConversation) {
      return undefined;
    }

    return (conversationMeta?.participants || []).find(
      (item: User) => item._id !== user?._id,
    );
  }, [conversationMeta?.participants, isGroupConversation, user?._id]);

  const headerTitle =
    route.params.groupName ||
    conversationMeta?.groupName ||
    route.params.title ||
    peer?.name ||
    "Conversation";

  const headerAvatarUri =
    route.params.groupImage ||
    conversationMeta?.groupImage ||
    route.params.avatarUri ||
    peer?.profileImage ||
    "";

  const memberCount = conversationMeta?.participants?.length || 0;
  const messages = (messagesByConversation[conversationId] || [])
    .slice()
    .reverse();
  const pagination = paginationByConversation[conversationId];

  useEffect(() => {
    fetchMessages(conversationId);

    const socket = getSocket();
    socket?.emit("joinConversation", { conversationId });
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    if (!isGroupConversation) {
      return;
    }

    if (conversationMeta?.groupName) {
      setRenameValue(conversationMeta.groupName);
      return;
    }

    void getGroupRequest(conversationId)
      .then((conversation) => {
        upsertConversation(conversation);
        setRenameValue(conversation.groupName || headerTitle);
      })
      .catch(() => undefined);
  }, [
    conversationId,
    conversationMeta?.groupName,
    headerTitle,
    isGroupConversation,
    upsertConversation,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "",
      headerTitle: () => (
        <View style={styles.headerTitleWrap}>
          <Avatar
            name={headerTitle}
            uri={headerAvatarUri}
            size={34}
            verified={false}
          />
          <View style={styles.headerTextWrap}>
            <Text
              style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {headerTitle}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {isGroupConversation
                ? `${memberCount} members`
                : "Secure conversation"}
            </Text>
          </View>
        </View>
      ),
      headerRight: () =>
        isGroupConversation ? (
          <Pressable
            onPress={() => setGroupMenuVisible(true)}
            style={styles.headerMenuButton}
          >
            <EllipsisVertical size={18} color={theme.colors.primary} />
          </Pressable>
        ) : null,
    });
  }, [
    headerAvatarUri,
    headerTitle,
    isGroupConversation,
    memberCount,
    navigation,
    theme.colors.primary,
    theme.colors.textPrimary,
    theme.colors.textSecondary,
  ]);

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

  const handleLoadOlder = useCallback(() => {
    void loadOlderMessages(conversationId);
  }, [conversationId, loadOlderMessages]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <ChatBubble
        message={item}
        isMine={item.senderId._id === user?._id}
        showSenderAvatar={isGroupConversation}
      />
    ),
    [isGroupConversation, user?._id],
  );

  const keyExtractor = useCallback((item: Message) => item._id, []);

  const listFooter = pagination?.loading ? (
    <View style={styles.loadingOlderWrap}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
    </View>
  ) : null;

  const listHeader =
    messageText.length > 0 ? (
      <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>
        Typing…
      </Text>
    ) : null;

  const closeMenus = () => {
    setGroupMenuVisible(false);
    setRenameVisible(false);
  };

  const handleRename = async () => {
    if (!renameValue.trim()) {
      return;
    }

    setBusyAction(true);
    try {
      const updated = await renameGroupRequest(conversationId, {
        groupName: renameValue.trim(),
      });
      upsertConversation(updated);
      closeMenus();
    } finally {
      setBusyAction(false);
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      "Clear chat",
      "This clears the chat for you only. Messages remain for other group members.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setBusyAction(true);
            try {
              await clearGroupChatRequest(conversationId);
              clearConversationMessages(conversationId);
              await fetchMessages(conversationId);
            } finally {
              setBusyAction(false);
              setGroupMenuVisible(false);
            }
          },
        },
      ],
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave group",
      "You will no longer receive messages from this group.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            setBusyAction(true);
            try {
              await leaveGroupRequest(conversationId);
              removeConversation(conversationId);
              setGroupMenuVisible(false);
              navigation.navigate("MainTabs", { screen: "ChatList" });
            } finally {
              setBusyAction(false);
            }
          },
        },
      ],
    );
  };

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
        inverted
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
        onEndReached={handleLoadOlder}
        onEndReachedThreshold={0.3}
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.inputRow,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a secure message"
          placeholderTextColor={theme.colors.textSecondary}
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              borderColor: theme.colors.border,
            },
          ]}
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
              backgroundColor: messageText.trim()
                ? theme.colors.primary
                : theme.colors.border,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <SendHorizontal size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      <Modal
        transparent
        visible={groupMenuVisible}
        animationType="fade"
        onRequestClose={closeMenus}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeMenus}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => undefined}
          >
            <Text
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              Group options
            </Text>

            <Pressable
              style={styles.modalItem}
              onPress={() =>
                navigation.navigate("GroupMembers", { conversationId })
              }
            >
              <Users size={16} color={theme.colors.primary} />
              <Text
                style={[
                  styles.modalItemText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                View Members
              </Text>
            </Pressable>

            <Pressable
              style={styles.modalItem}
              onPress={() => {
                setRenameValue(headerTitle);
                setRenameVisible(true);
              }}
            >
              <MessageCircleMore size={16} color={theme.colors.primary} />
              <Text
                style={[
                  styles.modalItemText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Rename Group
              </Text>
            </Pressable>

            <Pressable
              style={styles.modalItem}
              onPress={handleClearChat}
              disabled={busyAction}
            >
              <Text
                style={[
                  styles.modalItemText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Clear Chat
              </Text>
            </Pressable>

            <Pressable
              style={styles.modalItem}
              onPress={handleLeaveGroup}
              disabled={busyAction}
            >
              <Text
                style={[styles.modalItemText, { color: theme.colors.error }]}
              >
                Leave Group
              </Text>
            </Pressable>

            <Pressable style={styles.modalItem} onPress={() => undefined}>
              <Text
                style={[
                  styles.modalItemText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Report Group
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={renameVisible}
        animationType="slide"
        onRequestClose={closeMenus}
      >
        <View style={styles.renameBackdrop}>
          <View
            style={[
              styles.renameCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              Rename Group
            </Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Group name"
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.renameInput,
                {
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            />
            <View style={styles.renameActions}>
              <Pressable
                onPress={closeMenus}
                style={[
                  styles.renameAction,
                  { borderColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.renameActionText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleRename()}
                style={[
                  styles.renameAction,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={styles.renameActionTextPrimary}>
                  {busyAction ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 220,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
  headerMenuButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  typingText: {
    marginBottom: 10,
    marginLeft: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
  },
  loadingOlderWrap: {
    paddingVertical: 12,
    alignItems: "center",
  },
  inputRow: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
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
    fontFamily: "Manrope_500Medium",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "rgba(15,23,42,0.28)",
    paddingTop: 90,
    paddingHorizontal: 16,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    marginBottom: 2,
  },
  modalItem: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "rgba(148,163,184,0.08)",
  },
  modalItemText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
  renameBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.3)",
    paddingHorizontal: 16,
  },
  renameCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
  },
  renameActions: {
    flexDirection: "row",
    gap: 10,
  },
  renameAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  renameActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
  renameActionTextPrimary: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
});
