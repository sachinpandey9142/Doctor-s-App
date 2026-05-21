import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as DocumentPicker from "expo-document-picker";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  CheckCheck,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  SendHorizontal,
  Smile,
  Users,
  Video,
  X,
} from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInUp,
  LinearTransition,
} from "react-native-reanimated";
import { useTheme } from "styled-components/native";

import BottomSheet from "@gorhom/bottom-sheet";

import { ChatBubble } from "@/components/chat/ChatBubble";
import { MessageContextMenu } from "@/components/chat/MessageContextMenu";
import { AttachmentBottomSheet } from "@/components/chat/AttachmentBottomSheet";
import { PollCreatorModal } from "@/components/chat/PollCreatorModal";
import { ContactPickerModal } from "@/components/chat/ContactPickerModal";
import { Avatar } from "@/components/common/Avatar";
import { getSocket } from "@/services/socket/socketClient";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { hapticTap } from "@/utils/haptics";
import type { Message, User } from "@/types/models";
import type { RootStackParamList } from "@/navigation/types";

const isSameDay = (a?: string, b?: string) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

const dateLabel = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function ChatScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ChatScreen">>();

  const user = useAuthStore((state) => state.user);
  const {
    conversations,
    messagesByConversation,
    paginationByConversation,
    drafts,
    isHydrated,
    hydrateDrafts,
    setDraft,
    fetchMessages,
    loadOlderMessages,
    sendMessage,
    resendMessage,
    removeFailedMessage,
  } = useChatStore((state) => state);

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const attachmentSheetRef = useRef<BottomSheet>(null);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);

  const [isPollModalVisible, setPollModalVisible] = useState(false);
  const [isContactModalVisible, setContactModalVisible] = useState(false);

  const conversationId = route.params.conversationId;
  const messages = useMemo(
    () => (messagesByConversation[conversationId] || []),
    [messagesByConversation, conversationId]
  );
  const pagination = paginationByConversation[conversationId];
  const conversation = conversations.find(
    (item) => item._id === conversationId,
  );
  const isGroup = Boolean(conversation?.isGroup);
  const peer = useMemo(
    () =>
      (conversation?.participants || []).find((item) => item._id !== user?._id),
    [conversation?.participants, user?._id],
  );
  const title =
    route.params.title ||
    conversation?.title ||
    (isGroup ? "Group Chat" : peer?.name || "Conversation");
  
  const isOnline = !isGroup && Boolean(peer?.isOnline);
  const statusText = isTyping
    ? "typing..."
    : isGroup
      ? `${conversation?.participants?.length || 0} members`
      : isOnline
        ? "Online now"
        : peer?.lastSeen
          ? `Last seen ${dateLabel(peer.lastSeen)}`
          : "Offline";

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (!isHydrated) {
      hydrateDrafts();
    }
  }, [isHydrated, hydrateDrafts]);

  useEffect(() => {
    setIsTyping(false);
    setComposerFocused(false);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (drafts[conversationId]) {
      setMessageText(drafts[conversationId]);
    } else {
      setMessageText("");
    }

    fetchMessages(conversationId);
    const socket = getSocket();
    
    const handleConnect = () => {
      socket?.emit("joinConversation", { conversationId });
      socket?.emit("markConversationRead", { conversationId });
    };

    // If socket is already connected, join immediately
    if (socket?.connected) {
      handleConnect();
    }

    const handleUserTyping = ({
      conversationId: cid,
    }: {
      conversationId: string;
    }) => {
      if (cid === conversationId) {
        setIsTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsTyping(false), 2500);
      }
    };

    const handleUserTypingStopped = ({
      conversationId: cid,
    }: {
      conversationId: string;
    }) => {
      if (cid === conversationId) {
        setIsTyping(false);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      }
    };

    const handleMessageReactionUpdated = (payload: { conversationId: string; messageId: string; reactions: Record<string, string[]> }) => {
      useChatStore.getState().updateMessageReactions(payload.conversationId, payload.messageId, payload.reactions);
    };

    socket?.on("connect", handleConnect);
    socket?.on("userTyping", handleUserTyping);
    socket?.on("userTypingStopped", handleUserTypingStopped);
    socket?.on("messageReactionUpdated", handleMessageReactionUpdated);

    return () => {
      socket?.emit("stopTyping", { conversationId });
      socket?.emit("leaveConversation", { conversationId });
      socket?.off("connect", handleConnect);
      socket?.off("userTyping", handleUserTyping);
      socket?.off("userTypingStopped", handleUserTypingStopped);
      socket?.off("messageReactionUpdated", handleMessageReactionUpdated);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [conversationId, fetchMessages]);

  const emitTyping = () => {
    const socket = getSocket();
    socket?.emit("typing", { conversationId });
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);
    setDraft(conversationId, text);
    emitTyping();
  };

  const handleSend = async () => {
    let textToSend = messageText;
    if (!textToSend.trim()) return;
    
    if (replyingToMessage) {
      const quotedText = replyingToMessage.text?.length > 50 
        ? replyingToMessage.text.substring(0, 50) + "..." 
        : replyingToMessage.text;
      const peerName = replyingToMessage.senderId.name.split(" ")[0];
      textToSend = `> Replying to ${peerName}: "${quotedText}"\n\n${textToSend}`;
    }

    // Optimistic UI - clear immediately
    setMessageText("");
    setDraft(conversationId, "");
    setReplyingToMessage(null);
    hapticTap();
    
    try {
      setSending(true);
      await sendMessage(conversationId, textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleOptionsOpen = useCallback((message: Message) => {
    setSelectedMessage(message);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleCopy = useCallback(async (message: Message) => {
    if (message.text) {
      await Clipboard.setStringAsync(message.text);
    }
  }, []);

  const handleForward = useCallback(async (message: Message) => {
    if (message.text) {
      await Share.share({
        message: message.text,
      });
    }
  }, []);

  const handleDelete = useCallback((message: Message) => {
    useChatStore.getState().deleteMessage(conversationId, message._id);
  }, [conversationId]);

  const handleReply = useCallback((message: Message) => {
    setReplyingToMessage(message);
    inputRef.current?.focus();
  }, []);

  const handleAttachmentSelect = async (option: string) => {
    try {
      if (option === "gallery") {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          await sendMessage(conversationId, "", result.assets[0].uri);
        }
      } else if (option === "document") {
        const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
        if (!result.canceled && result.assets[0]) {
          // Sending the document URI as mediaUrl (you might need a backend update to handle files properly, but this simulates it)
          await sendMessage(conversationId, `📄 Shared Document: ${result.assets[0].name}`, result.assets[0].uri);
        }
      } else if (option === "location") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          useToastStore.getState().showToast("Location permission denied");
          return;
        }
        
        // Show loading state or toast here if desired
        const location = await Location.getCurrentPositionAsync({});
        const mapsLink = `https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
        await sendMessage(conversationId, `📍 Shared Location\n${mapsLink}`);
      } else if (option === "contact") {
        setContactModalVisible(true);
      } else if (option === "poll") {
        setPollModalVisible(true);
      } else {
        useToastStore.getState().showToast(`${option} not implemented yet`);
      }
    } catch (e) {
      console.log("Attachment error:", e);
    }
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    const pollData = {
      isPoll: true,
      question,
      options
    };
    await sendMessage(conversationId, JSON.stringify(pollData));
  };

  const handleSelectContact = async (name: string, phone: string) => {
    setContactModalVisible(false);
    await sendMessage(conversationId, `👤 Contact Shared\nName: ${name}\nPhone: ${phone}`);
  };

  const handleLoadOlder = useCallback(() => {
    void loadOlderMessages(conversationId);
  }, [conversationId, loadOlderMessages]);

  const openGroupInfo = useCallback(() => {
    if (isGroup) {
      navigation.navigate("GroupMembersScreen", { conversationId, title });
    }
  }, [conversationId, isGroup, navigation, title]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMine = item.senderId._id === user?._id;
      const previous = messages[index + 1];
      const next = messages[index - 1];
      const isGrouped = Boolean(
        next &&
        next.senderId._id === item.senderId._id &&
        isSameDay(next.createdAt, item.createdAt),
      );
      const showSender =
        !isMine &&
        isGroup &&
        (!previous ||
          previous.senderId._id !== item.senderId._id ||
          !isSameDay(previous.createdAt, item.createdAt));
      const showDate =
        !previous || !isSameDay(previous.createdAt, item.createdAt);

      return (
        <Animated.View layout={LinearTransition.springify().damping(18)}>
          {showDate ? (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {dateLabel(item.createdAt)}
              </Text>
            </View>
          ) : null}
          <ChatBubble
            message={item}
            isMine={isMine}
            showSender={showSender}
            isGrouped={isGrouped}
            onOptionsOpen={handleOptionsOpen}
            onReactionToggle={(msgId, reaction) => {
              useChatStore.getState().toggleMessageReaction(conversationId, msgId, reaction);
            }}
            onRetry={(tempId) => resendMessage(conversationId, tempId)}
            onDeleteFailed={(tempId) => removeFailedMessage(conversationId, tempId)}
          />
        </Animated.View>
      );
    },
    [isGroup, messages, styles, user?._id, conversationId],
  );

  const listFooter = pagination?.loading ? (
    <View style={styles.loadingOlderWrap}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
    </View>
  ) : null;

  const canSend = messageText.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={theme.gradients.chatBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />
      <BlurView
        intensity={theme.isDark ? 26 : 10}
        tint={theme.isDark ? "dark" : "light"}
        style={styles.topGlow}
      />
      <BlurView
        intensity={theme.isDark ? 22 : 8}
        tint={theme.isDark ? "dark" : "light"}
        style={styles.bottomGlow}
      />

      <BlurView
        intensity={theme.isDark ? 24 : 18}
        tint={theme.isDark ? "dark" : "light"}
        style={[styles.header, { paddingTop: insets.top + 5 }]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
        >
          <ArrowLeft size={21} color={theme.colors.icon} strokeWidth={2.4} />
        </Pressable>

        <Pressable
          onPress={openGroupInfo}
          disabled={!isGroup}
          style={styles.headerIdentity}
        >
          <Avatar
            name={title}
            uri={isGroup ? conversation?.image : peer?.profileImage}
            size={38}
            verified={!isGroup && Boolean(peer?.isVerified)}
            online={false}
          />

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.statusRow}>
              {isTyping ? <TypingDots compact /> : null}
              <Text
                style={[styles.headerStatus, isTyping && styles.typingStatus]}
                numberOfLines={1}
              >
                {statusText}
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
          >
            <Phone size={19} color={theme.colors.icon} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
          >
            <Video size={20} color={theme.colors.icon} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
          >
            <MoreVertical
              size={19}
              color={theme.colors.icon}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>
      </BlurView>

      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesContent}
        inverted
        initialNumToRender={24}
        maxToRenderPerBatch={12}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
        onEndReached={handleLoadOlder}
        onEndReachedThreshold={0.25}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View
            entering={FadeIn.duration(220)}
            style={styles.emptyConversation}
          >
            <LinearGradient
              colors={theme.gradients.emptyIcon}
              style={styles.emptyIcon}
            >
              <CheckCheck
                size={26}
                color={theme.colors.primary}
                strokeWidth={2.2}
              />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptyText}>
              Messages are private, secure, and visible here as soon as you send
              them.
            </Text>
          </Animated.View>
        }
        ListHeaderComponent={
          isTyping ? (
            <Animated.View
              entering={FadeInUp.duration(180)}
              style={styles.typingRow}
            >
              <View style={styles.typingBubble}>
                <TypingDots />
              </View>
            </Animated.View>
          ) : null
        }
      />

      <View
        style={[styles.composerOuter, { paddingBottom: insets.bottom + 10 }]}
      >
        <BlurView
          intensity={theme.isDark ? 26 : 16}
          tint={theme.isDark ? "dark" : "light"}
          style={[
            styles.composerBlur,
            composerFocused && styles.composerFocused,
          ]}
        >
          <Pressable
            onPress={() => attachmentSheetRef.current?.snapToIndex(0)}
            style={({ pressed }) => [
              styles.composerIconButton,
              pressed && styles.composerIconPressed,
            ]}
          >
            <Paperclip
              size={19}
              color={theme.colors.composerIcon}
              strokeWidth={2.2}
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            {replyingToMessage && (
              <View style={styles.replyPreview}>
                <View style={styles.replyBar} />
                <View style={styles.replyContent}>
                  <Text style={styles.replyName}>{replyingToMessage.senderId.name}</Text>
                  <Text style={styles.replyText} numberOfLines={1}>
                    {replyingToMessage.text || (replyingToMessage.mediaUrl ? "Photo" : "")}
                  </Text>
                </View>
                <Pressable onPress={() => setReplyingToMessage(null)} style={styles.replyClose}>
                  <X size={16} color={theme.colors.iconMuted} />
                </Pressable>
              </View>
            )}
            <View style={styles.inputWrap}>
              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={({ pressed }) => [
                  styles.emojiButton,
                  pressed && styles.composerIconPressed,
                ]}
              >
              <Smile
                size={18}
                color={theme.colors.iconMuted}
                strokeWidth={2.1}
              />
            </Pressable>
            <TextInput
              ref={inputRef}
              value={messageText}
              onChangeText={handleTextChange}
              placeholder={
                isGroup ? "Message the group..." : "Type a secure message..."
              }
              placeholderTextColor={theme.colors.placeholder}
              style={styles.input}
              multiline
              maxLength={3000}
              returnKeyType="default"
              onFocus={() => setComposerFocused(true)}
              onBlur={() => setComposerFocused(false)}
            />
          </View>
          </View>

          <Pressable
            onPress={() => void handleSend()}
            disabled={sending || !canSend}
            style={({ pressed }) => [
              styles.sendBtnWrap,
              pressed && canSend && styles.sendPressed,
              !canSend && styles.sendDisabled,
            ]}
          >
            <LinearGradient
              colors={
                canSend
                  ? theme.gradients.primary
                  : theme.gradients.inactiveControl
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              {sending ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textInverted}
                />
              ) : canSend ? (
                <SendHorizontal
                  size={19}
                  color={theme.colors.textInverted}
                  strokeWidth={2.5}
                />
              ) : (
                <Mic
                  size={19}
                  color={theme.colors.iconMuted}
                  strokeWidth={2.2}
                />
              )}
            </LinearGradient>
          </Pressable>
        </BlurView>
      </View>
      
      <MessageContextMenu
        message={selectedMessage}
        bottomSheetRef={bottomSheetRef}
        currentUserId={user?._id}
        onClose={() => setSelectedMessage(null)}
        onReact={(messageId, reaction) => {
          useChatStore.getState().toggleMessageReaction(conversationId, messageId, reaction);
        }}
        onReply={handleReply}
        onCopy={handleCopy}
        onForward={handleForward}
        onDelete={handleDelete}
      />
      
      <AttachmentBottomSheet
        bottomSheetRef={attachmentSheetRef}
        onClose={() => {}}
        onSelectOption={handleAttachmentSelect}
      />

      <PollCreatorModal
        visible={isPollModalVisible}
        onClose={() => setPollModalVisible(false)}
        onCreate={handleCreatePoll}
      />

      <ContactPickerModal
        visible={isContactModalVisible}
        onClose={() => setContactModalVisible(false)}
        onSelect={handleSelectContact}
      />
    </KeyboardAvoidingView>
  );
}

function TypingDots({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.typingDots, compact && styles.typingDotsCompact]}>
      <View style={[styles.dot, compact && styles.dotCompact]} />
      <View style={[styles.dot, compact && styles.dotCompact]} />
      <View style={[styles.dot, compact && styles.dotCompact]} />
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
      top: -92,
      right: -62,
      width: 210,
      height: 210,
      borderRadius: 105,
      overflow: "hidden",
      backgroundColor: theme.colors.glow,
    },
    bottomGlow: {
      position: "absolute",
      bottom: 56,
      left: -80,
      width: 190,
      height: 190,
      borderRadius: 95,
      overflow: "hidden",
      backgroundColor: theme.colors.glowSecondary,
    },
    header: {
      paddingHorizontal: 8,
      paddingBottom: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.headerBorder,
      overflow: "hidden",
      backgroundColor: theme.colors.header,
    },
    headerButton: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerButtonPressed: {
      transform: [{ scale: 0.94 }],
      backgroundColor: theme.colors.primaryLight,
    },
    headerIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    avatarShell: {
      width: 38,
      height: 38,
      position: "relative",
    },
    avatar: {
      width: 37,
      height: 37,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: theme.colors.textInverted,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 14,
    },
    onlineDot: {
      position: "absolute",
      right: -1,
      bottom: -1,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.success,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 14,
      lineHeight: 19,
    },
    statusRow: {
      marginTop: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme.colors.success,
    },
    headerStatus: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: "Manrope_600SemiBold",
      fontSize: 11,
      lineHeight: 15,
    },
    typingStatus: {
      color: theme.colors.teal,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    messagesContent: {
      flexGrow: 1,
      justifyContent: "flex-end",
      paddingTop: 10,
      paddingBottom: 8,
    },
    loadingOlderWrap: {
      paddingVertical: 12,
      alignItems: "center",
    },
    dateSeparator: {
      alignSelf: "center",
      marginTop: 7,
      marginBottom: 8,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dateSeparatorText: {
      color: theme.colors.textSecondary,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 10,
      letterSpacing: 0.4,
    },
    typingRow: {
      paddingHorizontal: 18,
      marginBottom: 6,
      alignItems: "flex-start",
    },
    typingBubble: {
      borderRadius: 18,
      borderTopLeftRadius: 7,
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: theme.colors.messageIncoming,
      borderWidth: 1,
      borderColor: theme.colors.messageIncomingBorder,
    },
    typingDots: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    typingDotsCompact: {
      gap: 3,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      opacity: 0.72,
    },
    dotCompact: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    emptyConversation: {
      marginHorizontal: 28,
      marginTop: "auto",
      marginBottom: "auto",
      alignItems: "center",
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 17,
      marginBottom: 6,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontFamily: "Manrope_500Medium",
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
    },
    composerOuter: {
      paddingHorizontal: 10,
      paddingTop: 7,
      backgroundColor: theme.colors.composer,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    composerBlur: {
      minHeight: 57,
      borderRadius: 23,
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 7,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 7,
      backgroundColor: theme.colors.composer,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.cardStrong,
    },
    composerFocused: {
      borderColor: theme.colors.primaryMid,
      backgroundColor: theme.colors.inputFocused,
    },
    composerIconButton: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
    },
    composerIconPressed: {
      opacity: 0.72,
      transform: [{ scale: 0.95 }],
    },
    inputWrap: {
      flex: 1,
      minHeight: 42,
      maxHeight: 112,
      borderRadius: 19,
      paddingLeft: 10,
      paddingRight: 12,
      flexDirection: "row",
      alignItems: "flex-end",
      backgroundColor: theme.colors.composerInput,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    replyPreview: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      marginBottom: 6,
      overflow: "hidden",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    replyBar: {
      width: 4,
      alignSelf: "stretch",
      backgroundColor: theme.colors.primary,
    },
    replyContent: {
      flex: 1,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    replyName: {
      fontFamily: "Manrope_700Bold",
      fontSize: 12,
      color: theme.colors.primary,
      marginBottom: 2,
    },
    replyText: {
      fontFamily: "Manrope_500Medium",
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    replyClose: {
      padding: 8,
    },
    emojiButton: {
      width: 28,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 2,
    },
    input: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_500Medium",
      fontSize: 15,
      lineHeight: 21,
      minHeight: 39,
      maxHeight: 104,
      paddingTop: 9,
      paddingBottom: 8,
      paddingHorizontal: 0,
      textAlignVertical: "center",
    },
    sendBtnWrap: {
      borderRadius: 19,
      shadowColor: theme.shadow.floating.shadowColor,
      shadowOpacity: 0.2,
      shadowRadius: 13,
      shadowOffset: { width: 0, height: 7 },
      elevation: 8,
    },
    sendPressed: {
      transform: [{ scale: 0.92 }],
    },
    sendDisabled: {
      shadowOpacity: 0,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
  });
