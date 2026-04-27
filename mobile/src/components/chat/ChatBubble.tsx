import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";

import type { Message } from "@/types/models";
import { formatRelativeTime } from "@/utils/date";

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
}

function ChatBubbleBase({ message, isMine }: ChatBubbleProps) {
  const theme = useTheme();
  const senderName = message.senderId?.name ?? "Someone";

  if (!isMine) {
    return (
      <Animated.View
        entering={FadeInLeft.duration(200).springify().damping(18)}
        style={[styles.row, { justifyContent: "flex-start" }]}
      >
        <View style={styles.receivedWrap}>
          <Text style={[styles.senderName, { color: theme.colors.primary }]}>{senderName}</Text>
          <View style={[styles.bubble, styles.receivedBubble]}>
            {message.mediaUrl ? (
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.mediaImage}
                contentFit="cover"
                transition={250}
              />
            ) : null}
            {message.text ? (
              <Text style={[styles.messageText, { color: theme.colors.textPrimary }]}>
                {message.text}
              </Text>
            ) : null}
            <Text style={[styles.timestamp, { color: theme.colors.textTertiary }]}>
              {formatRelativeTime(message.createdAt)}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInRight.duration(200).springify().damping(18)}
      style={[styles.row, { justifyContent: "flex-end" }]}
    >
      <View style={styles.sentWrap}>
        {/* Brand-identity gradient: blue → teal */}
        <LinearGradient
          colors={["#2563EB", "#06B6D4"]}
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
          <Text style={styles.sentTimestamp}>
            {formatRelativeTime(message.createdAt)}
          </Text>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    // More breathing room between messages — makes chat feel human, not cramped
    marginBottom: 12,
    paddingHorizontal: 8
  },
  receivedWrap: {
    maxWidth: "78%",
    alignItems: "flex-start",
    gap: 3
  },
  senderName: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11.5,
    marginLeft: 16,
    letterSpacing: 0.1
  },
  receivedBubble: {
    // Clean, slightly warm white surface — distinct from background
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EDF3",
    borderTopLeftRadius: 5,
    // Subtle shadow so received bubbles "float" off background
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2
  },
  sentWrap: {
    maxWidth: "78%",
    alignItems: "flex-end"
  },
  sentBubble: {
    borderBottomRightRadius: 5,
    // Stronger shadow using brand color for sent — makes it pop
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
    gap: 3
  },
  messageText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 22
  },
  mediaImage: {
    width: 210,
    height: 155,
    borderRadius: 10,
    marginBottom: 4
  },
  timestamp: {
    marginTop: 3,
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    textAlign: "left"
  },
  sentTimestamp: {
    marginTop: 3,
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.62)",
    textAlign: "right"
  }
});
