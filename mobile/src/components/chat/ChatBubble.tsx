import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";
import { CheckCheck } from "lucide-react-native";

import type { Message } from "@/types/models";
import { formatRelativeTime } from "@/utils/date";

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
}

function ChatBubbleBase({ message, isMine }: ChatBubbleProps) {
  const theme = useTheme();
  const senderName = message.senderId?.name ?? "Someone";
  const timeStr = formatRelativeTime(message.createdAt);

  if (!isMine) {
    return (
      <Animated.View
        entering={FadeInLeft.duration(200).springify().damping(18)}
        style={styles.rowReceived}
      >
        <View style={styles.receivedWrap}>
          <Text style={[styles.senderName, { color: theme.colors.primary }]}>{senderName}</Text>
          <View style={[styles.bubble, styles.receivedBubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
              {timeStr}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInRight.duration(200).springify().damping(18)}
      style={styles.rowSent}
    >
      <View style={styles.sentWrap}>
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
          <View style={styles.sentMeta}>
            <Text style={styles.sentTimestamp}>{timeStr}</Text>
            <CheckCheck size={12} color="rgba(255,255,255,0.75)" strokeWidth={2.5} />
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);

const styles = StyleSheet.create({
  rowReceived: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
    paddingHorizontal: 10
  },
  rowSent: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
    paddingHorizontal: 10
  },
  receivedWrap: {
    maxWidth: "78%",
    alignItems: "flex-start",
    gap: 3
  },
  senderName: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    marginLeft: 14,
    letterSpacing: 0.1
  },
  receivedBubble: {
    borderWidth: 1,
    borderTopLeftRadius: 4,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2
  },
  sentWrap: {
    maxWidth: "78%",
    alignItems: "flex-end"
  },
  sentBubble: {
    borderBottomRightRadius: 4,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5
  },
  bubble: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 4
  },
  messageText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 23
  },
  mediaImage: {
    width: 210,
    height: 155,
    borderRadius: 12,
    marginBottom: 4
  },
  timestamp: {
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    textAlign: "left",
    marginTop: 2
  },
  sentMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 3
  },
  sentTimestamp: {
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.65)"
  }
});
