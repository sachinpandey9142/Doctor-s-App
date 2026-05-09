import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import type { Message } from "@/types/models";
import { formatRelativeTime } from "@/utils/date";

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
  showSenderAvatar?: boolean;
}

function ChatBubbleBase({
  message,
  isMine,
  showSenderAvatar = false,
}: ChatBubbleProps) {
  const theme = useTheme();
  const senderName = message.senderId?.name ?? "Someone";
  const senderAvatar = message.senderId?.profileImage || "";

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[
        styles.row,
        { justifyContent: isMine ? "flex-end" : "flex-start" },
      ]}
    >
      {/* ── Received bubble ─────────────────────────────────────────── */}
      {!isMine ? (
        <View style={styles.receivedWrap}>
          <View style={styles.receivedHeader}>
            {showSenderAvatar ? (
              <Avatar
                name={senderName}
                uri={senderAvatar}
                size={26}
                verified={!!message.senderId?.isVerified}
              />
            ) : null}
            <Text style={[styles.senderName, { color: theme.colors.primary }]}>
              {senderName}
            </Text>
          </View>

          <View
            style={[
              styles.bubble,
              styles.receivedBubble,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            {message.mediaUrl ? (
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.mediaImage}
                contentFit="cover"
                transition={250}
              />
            ) : null}

            {message.text ? (
              <Text
                style={[
                  styles.messageText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {message.text}
              </Text>
            ) : null}

            <Text
              style={[styles.timestamp, { color: theme.colors.textTertiary }]}
            >
              {formatRelativeTime(message.createdAt)}
            </Text>
          </View>
        </View>
      ) : (
        /* ── Sent bubble ─────────────────────────────────────────────── */
        <View style={styles.sentWrap}>
          <LinearGradient
            colors={theme.gradients.sentBubble}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.sentBubble]}
          >
            {message.mediaUrl ? (
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.mediaImage}
                contentFit="cover"
                transition={250}
              />
            ) : null}

            {message.text ? (
              <Text style={[styles.messageText, { color: "#FFFFFF" }]}>
                {message.text}
              </Text>
            ) : null}

            <Text
              style={[styles.timestamp, { color: "rgba(255,255,255,0.65)" }]}
            >
              {formatRelativeTime(message.createdAt)}
            </Text>
          </LinearGradient>
        </View>
      )}
    </Animated.View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  // ── Received
  receivedWrap: {
    maxWidth: "78%",
    alignItems: "flex-start",
  },
  receivedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    paddingLeft: 2,
  },
  senderName: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  receivedBubble: {
    borderWidth: 1,
    // Simulate a subtle tail on the left
    borderBottomLeftRadius: 4,
  },
  // ── Sent
  sentWrap: {
    maxWidth: "78%",
    alignItems: "flex-end",
  },
  sentBubble: {
    // Simulate a subtle tail on the right
    borderBottomRightRadius: 4,
  },
  // ── Shared bubble styles
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
  mediaImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    marginBottom: 6,
  },
  timestamp: {
    marginTop: 4,
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    textAlign: "right",
  },
});
