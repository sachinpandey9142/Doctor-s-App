import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Check, CheckCheck, Clock, AlertCircle, Heart } from "lucide-react-native";
import { useTheme } from "styled-components/native";

import type { Message } from "@/types/models";
import { formatRelativeTime } from "@/utils/date";
import { useAuthStore } from "@/store/authStore";
import { hapticTap } from "@/utils/haptics";

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
  showSender?: boolean;
  isGrouped?: boolean;
  isGrouped?: boolean;
  onReactionToggle?: (messageId: string, reaction: string) => void;
  onRetry?: (tempId: string) => void;
  onDeleteFailed?: (tempId: string) => void;
}

function ChatBubbleBase({ message, isMine, showSender = false, isGrouped = false, onReactionToggle, onRetry, onDeleteFailed }: ChatBubbleProps) {
  const theme = useTheme();
  const currentUserId = useAuthStore((s) => s.user?._id);
  const senderName = message.senderId?.name ?? "Someone";
  const timeStr = formatRelativeTime(message.createdAt);
  
  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;
  const isRead = (message.readBy || []).filter(id => String(id) !== String(currentUserId)).length > 0;
  const ReadIcon = isRead ? CheckCheck : Check;
  const readColor = isRead ? "#60A5FA" : theme.colors.messageOutgoingMeta;

  const handleLongPress = () => {
    if (message.status === "failed") {
      // Don't allow reactions on failed messages, maybe delete?
      if (onDeleteFailed && message.tempId) {
        hapticTap();
        onDeleteFailed(message.tempId);
      }
      return;
    }
    if (onReactionToggle) {
      hapticTap();
      onReactionToggle(message._id, "heart");
    }
  };

  const handlePress = () => {
    if (message.status === "failed" && onRetry && message.tempId) {
      hapticTap();
      onRetry(message.tempId);
    }
  };

  if (!isMine) {
    return (
      <Animated.View entering={FadeInLeft.duration(180).springify().damping(18)} style={[styles.row, styles.rowReceived, isGrouped && styles.groupedRow]}>
        <View style={styles.receivedWrap}>
          {showSender ? (
            <Text style={[styles.senderName, { color: theme.colors.primary }]} numberOfLines={1}>
              {senderName}
            </Text>
          ) : null}
          <Pressable style={({ pressed }) => [styles.pressWrap, pressed && styles.pressedBubble]}>
            <View
              style={[
                styles.bubble,
                styles.receivedBubble,
                {
                  backgroundColor: theme.colors.messageIncoming,
                  borderColor: theme.colors.messageIncomingBorder,
                  shadowColor: theme.shadow.card.shadowColor,
                  shadowOpacity: theme.isDark ? 0.16 : 0.08
                },
                isGrouped && styles.receivedGrouped
              ]}
            >
              {message.mediaUrl ? <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} contentFit="cover" transition={250} /> : null}
              {message.text ? <Text style={[styles.receivedText, { color: theme.colors.messageIncomingText }]}>{message.text}</Text> : null}
              <Text style={[styles.receivedTimestamp, { color: theme.colors.messageIncomingMeta }]}>{timeStr}</Text>
            </View>
          </Pressable>
          {hasReactions ? (
            <View style={styles.reactionsWrap}>
              {Object.entries(reactions).map(([key, users]) => {
                if (!users.length) return null;
                const iReacted = users.includes(currentUserId || "");
                return (
                  <View key={key} style={[styles.reactionPill, { backgroundColor: iReacted ? theme.colors.primaryLight : theme.colors.reactionBackground, borderColor: theme.colors.reactionBorder }]}>
                    {key === "heart" ? <Heart size={10} color="#FCA5A5" fill="#FCA5A5" /> : <Text style={{fontSize:10}}>{key}</Text>}
                    <Text style={[styles.reactionText, { color: theme.colors.textPrimary }]}>{users.length}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInRight.duration(180).springify().damping(18)} style={[styles.row, styles.rowSent, isGrouped && styles.groupedRow]}>
      <View style={styles.sentWrap}>
        <Pressable style={({ pressed }) => [styles.pressWrap, pressed && styles.pressedBubble]} onLongPress={handleLongPress} onPress={handlePress}>
          <LinearGradient colors={theme.gradients.sentBubble} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.sentBubble, { shadowColor: theme.shadow.floating.shadowColor, shadowOpacity: theme.isDark ? 0.18 : 0.15 }, isGrouped && styles.sentGrouped, message.status === "failed" && styles.failedBubble]}>
            {message.mediaUrl ? <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} contentFit="cover" transition={250} /> : null}
            {message.text ? <Text style={[styles.sentText, { color: theme.colors.messageOutgoingText }]}>{message.text}</Text> : null}
            <View style={styles.sentMeta}>
              <Text style={[styles.sentTimestamp, { color: theme.colors.messageOutgoingMeta }]}>{timeStr}</Text>
              {message.status === "pending" ? (
                <Clock size={12} color={theme.colors.messageOutgoingMeta} strokeWidth={2} />
              ) : message.status === "failed" ? (
                <AlertCircle size={13} color={theme.colors.error} strokeWidth={2.5} />
              ) : (
                <ReadIcon size={13} color={readColor} strokeWidth={2.5} />
              )}
            </View>
          </LinearGradient>
        </Pressable>
        {hasReactions ? (
          <View style={[styles.reactionsWrap, styles.sentReactionsWrap]}>
            {Object.entries(reactions).map(([key, users]) => {
              if (!users.length) return null;
              const iReacted = users.includes(currentUserId || "");
              return (
                <View key={key} style={[styles.reactionPill, { backgroundColor: iReacted ? theme.colors.primaryLight : theme.colors.reactionBackground, borderColor: theme.colors.reactionBorder }]}>
                  {key === "heart" ? <Heart size={10} color="#FCA5A5" fill="#FCA5A5" /> : <Text style={{fontSize:10}}>{key}</Text>}
                  <Text style={[styles.reactionText, { color: theme.colors.textPrimary }]}>{users.length}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 18,
    marginBottom: 6
  },
  groupedRow: {
    marginBottom: 2
  },
  rowReceived: {
    justifyContent: "flex-start"
  },
  rowSent: {
    justifyContent: "flex-end"
  },
  receivedWrap: {
    maxWidth: "76%",
    alignItems: "flex-start"
  },
  sentWrap: {
    maxWidth: "76%",
    alignItems: "flex-end"
  },
  senderName: {
    marginLeft: 13,
    marginBottom: 4,
    color: "#60A5FA",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 11,
    letterSpacing: 0.1
  },
  pressWrap: {
    position: "relative"
  },
  pressedBubble: {
    opacity: 0.88,
    transform: [{ scale: 0.992 }]
  },
  bubble: {
    borderRadius: 21,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 7,
    gap: 2
  },
  receivedBubble: {
    borderTopLeftRadius: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3
  },
  receivedGrouped: {
    borderTopLeftRadius: 22
  },
  sentBubble: {
    borderTopRightRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 11,
    elevation: 5
  },
  failedBubble: {
    opacity: 0.8,
    borderWidth: 1,
    borderColor: "#EF4444"
  },
  sentGrouped: {
    borderTopRightRadius: 22
  },
  receivedText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 20
  },
  sentText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 20
  },
  mediaImage: {
    width: 220,
    height: 154,
    borderRadius: 16,
    marginBottom: 3
  },
  receivedTimestamp: {
    alignSelf: "flex-end",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 9.5,
    marginTop: 0
  },
  sentMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: 0
  },
  sentTimestamp: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 9.5
  },
  reactionsWrap: {
    position: "absolute",
    bottom: -10,
    right: -12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 2,
  },
  sentReactionsWrap: {
    right: undefined,
    left: -12,
  },
  reactionPill: {
    minWidth: 28,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderWidth: 1,
  },
  reactionText: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 10
  }
});
