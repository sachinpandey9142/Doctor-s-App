import React, { useCallback, useEffect } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bell, Briefcase, Heart, MessageCircle, UserPlus2 } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/navigation/types";
import { useNotificationStore } from "@/store/notificationStore";
import type { NotificationItem } from "@/types/models";
import { formatRelativeTime } from "@/utils/date";

export function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead } = useNotificationStore((state) => state);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const iconForType = (type: NotificationItem["type"]) => {
    switch (type) {
      case "like":
        return <Heart size={16} color={theme.colors.error} fill={theme.colors.error} />;
      case "comment":
        return <MessageCircle size={16} color={theme.colors.primary} />;
      case "job":
        return <Briefcase size={16} color={theme.colors.warning} />;
      case "follow":
        return <UserPlus2 size={16} color={theme.colors.primary} />;
      default:
        return <Bell size={16} color={theme.colors.teal} />;
    }
  };

  const openNotification = useCallback(
    async (item: NotificationItem) => {
      if (!item.isRead) {
        await markAsRead(item._id);
      }

      switch (item.type) {
        case "message":
          navigation.navigate("ChatScreen", { conversationId: item.referenceId, title: item.triggerUserId?.name || "Conversation" });
          return;
        case "like":
        case "comment":
          navigation.navigate("Comments", { postId: item.referenceId, title: item.triggerUserId?.name || "Post" });
          return;
        case "follow":
          if (item.triggerUserId?._id) {
            navigation.navigate("UserProfile", { userId: item.triggerUserId._id });
          }
          return;
        case "job":
          navigation.navigate("MainTabs", { screen: "Jobs" });
          return;
        default:
          return;
      }
    },
    [markAsRead, navigation]
  );

  const emptyState = loading ? (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Loading notifications...</Text>
    </View>
  ) : (
    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No notifications yet.</Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Activity Alerts</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Unread: {unreadCount}</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(260)}>
            <Pressable
              onPress={() => void openNotification(item)}
              style={[styles.card, { borderColor: item.isRead ? theme.colors.border : theme.colors.primary, backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.iconWrap}>{iconForType(item.type)}</View>
              <View style={styles.textWrap}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>{item.body}</Text>
                <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
        ListEmptyComponent={emptyState}
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
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 26 },
  subtitle: { marginTop: 4, fontFamily: "Manrope_500Medium", fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 120, gap: 10 },
  loadingWrap: { marginTop: 28, alignItems: "center", gap: 10 },
  card: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", gap: 10 },
  iconWrap: { width: 30, alignItems: "center", paddingTop: 2 },
  textWrap: { flex: 1 },
  cardTitle: { fontFamily: "Manrope_700Bold", fontSize: 14 },
  cardBody: { marginTop: 2, fontFamily: "Manrope_500Medium", fontSize: 13, lineHeight: 19 },
  time: { marginTop: 6, fontFamily: "Manrope_500Medium", fontSize: 11 },
  emptyText: { textAlign: "center", fontFamily: "Manrope_500Medium" }
});
