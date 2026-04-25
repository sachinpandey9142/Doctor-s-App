import React, { useEffect, useMemo } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageCircle } from "lucide-react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { formatRelativeTime } from "@/utils/date";
import type { RootStackParamList } from "@/navigation/types";
import type { Conversation, User } from "@/types/models";

export function ChatListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const { conversations, fetchConversations } = useChatStore((state) => state);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const conversationsWithPeer = useMemo(
    () =>
      conversations.map((conversation) => {
        const peer = (conversation.participants || []).find(
          (item) => item._id !== user?._id
        ) as User | undefined;
        return { ...conversation, peer };
      }),
    [conversations, user?._id]
  );

  const openConversation = (conversation: Conversation & { peer?: User }) => {
    navigation.navigate("ChatScreen", {
      conversationId: conversation._id,
      title: conversation.peer?.name || "Conversation"
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 14, borderBottomColor: theme.colors.borderLight }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Messages</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {conversations.length > 0 ? `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}` : "Secure clinical chats"}
        </Text>
      </View>

      <FlatList
        data={conversationsWithPeer}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(index * 35).duration(280).springify()}>
            <Pressable
              onPress={() => openConversation(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: theme.colors.cardBorder,
                  backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.surface
                }
              ]}
            >
              <Avatar
                name={item.peer?.name || "Medical Professional"}
                uri={item.peer?.profileImage}
                verified={item.peer?.isVerified}
                size={50}
              />

              <View style={styles.messageWrap}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {item.peer?.name || "Medical Professional"}
                  </Text>
                  <Text style={[styles.time, { color: theme.colors.textTertiary }]}>
                    {formatRelativeTime(item.updatedAt)}
                  </Text>
                </View>

                <Text numberOfLines={1} style={[styles.preview, { color: theme.colors.textSecondary }]}>
                  {item.lastMessage || "Tap to start the conversation"}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<MessageCircle size={30} color={theme.colors.primary} />}
            title="No conversations yet"
            body="Start a chat by visiting a professional's profile and tapping Message."
            ctaLabel="Find Professionals"
            onCta={() => navigation.navigate("Discover")}
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={9}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1
  },
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 27 },
  subtitle: { marginTop: 3, fontFamily: "Manrope_500Medium", fontSize: 13 },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 8
  },
  row: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    // Subtle card shadow
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  messageWrap: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, flex: 1, marginRight: 6 },
  time: { fontFamily: "Manrope_500Medium", fontSize: 11 },
  preview: { marginTop: 3, fontFamily: "Manrope_500Medium", fontSize: 13 }
});
