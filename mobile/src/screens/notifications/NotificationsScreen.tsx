import React, { useCallback, useEffect } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bell, Briefcase, Heart, MessageCircle, UserPlus2 } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/common/EmptyState";
import type { RootStackParamList } from "@/navigation/types";
import { useNotificationStore } from "@/store/notificationStore";
import type { NotificationItem } from "@/types/models";
import { formatRelativeTime } from "@/utils/date";

export function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead } = useNotificationStore((s) => s);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const iconForType = (type: NotificationItem["type"]) => {
    const size = 15;
    switch (type) {
      case "like": return <Heart size={size} color={theme.colors.error} fill={theme.colors.error} />;
      case "comment": return <MessageCircle size={size} color={theme.colors.primary} />;
      case "job": return <Briefcase size={size} color="#D97706" />;
      case "follow": return <UserPlus2 size={size} color={theme.colors.teal} />;
      default: return <Bell size={size} color={theme.colors.primary} />;
    }
  };

  const iconBgForType = (type: NotificationItem["type"]): string => {
    switch (type) {
      case "like": return theme.colors.errorLight;
      case "comment": return theme.colors.primaryLight;
      case "job": return "#FEF3C7";
      case "follow": return theme.colors.tealLight;
      default: return theme.colors.primaryLight;
    }
  };

  const accentForType = (type: NotificationItem["type"]): string => {
    switch (type) {
      case "like": return theme.colors.error;
      case "comment": return theme.colors.primary;
      case "job": return "#D97706";
      case "follow": return theme.colors.teal;
      default: return theme.colors.primary;
    }
  };

  const openNotification = useCallback(
    async (item: NotificationItem) => {
      if (!item.isRead) await markAsRead(item._id);
      switch (item.type) {
        case "message":
          navigation.navigate("ChatScreen", { conversationId: item.referenceId, title: item.triggerUserId?.name || "Conversation" });
          return;
        case "like":
        case "comment":
          navigation.navigate("Comments", { postId: item.referenceId, title: item.triggerUserId?.name || "Post" });
          return;
        case "follow":
          if (item.triggerUserId?._id) navigation.navigate("UserProfile", { userId: item.triggerUserId._id });
          return;
        case "job":
          navigation.navigate("MainTabs", { screen: "Jobs" });
          return;
        default: return;
      }
    },
    [markAsRead, navigation]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Notifications</Text>
          {unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 35).duration(260).springify()}>
            <Pressable
              onPress={() => void openNotification(item)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? theme.colors.primaryLight : theme.colors.surface,
                  borderColor: theme.colors.border
                }
              ]}
            >
              {/* Unread accent bar */}
              {!item.isRead ? (
                <View style={[styles.unreadBar, { backgroundColor: accentForType(item.type) }]} />
              ) : null}

              <View style={[styles.iconCircle, { backgroundColor: iconBgForType(item.type) }]}>
                {iconForType(item.type)}
              </View>

              <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                  <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.time, { color: theme.colors.textTertiary }]}>
                    {formatRelativeTime(item.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : (
            <EmptyState
              icon={<Bell size={28} color={theme.colors.primary} />}
              title="No notifications yet"
              body="When someone likes your post, follows you, or sends a message — it'll appear here."
            />
          )
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
    paddingBottom: 14,
    borderBottomWidth: 1
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 26 },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5
  },
  badgeText: { fontFamily: "Manrope_700Bold", fontSize: 11, color: "#FFFFFF" },
  subtitle: { marginTop: 3, fontFamily: "Manrope_500Medium", fontSize: 13 },
  listContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 120, gap: 8 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    position: "relative"
  },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14
  },
  iconCircle: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0
  },
  textWrap: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  cardTitle: { fontFamily: "Manrope_700Bold", fontSize: 14, flex: 1 },
  cardBody: { marginTop: 2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 19 },
  time: { fontFamily: "Manrope_500Medium", fontSize: 11, flexShrink: 0 },
  loadingWrap: { paddingTop: 40, alignItems: "center" }
});
