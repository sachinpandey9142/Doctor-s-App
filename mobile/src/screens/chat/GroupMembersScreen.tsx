import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useTheme } from "styled-components/native";
import {
  ArrowRight,
  Plus,
  RefreshCcw,
  Shield,
  Users,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import {
  clearGroupChatRequest,
  getConversationRequest,
  leaveGroupConversationRequest,
  removeGroupMemberRequest,
  renameGroupConversationRequest,
} from "@/services/api/chatApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
import type { RootStackParamList } from "@/navigation/types";
import type { Conversation, User } from "@/types/models";

export function GroupMembersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "GroupMembersScreen">>();
  const currentUser = useAuthStore((state) => state.user);
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const removeConversation = useChatStore((state) => state.removeConversation);
  const showToast = useToastStore((state) => state.showToast);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupName, setGroupName] = useState(route.params.title || "");

  const loadConversation = async () => {
    try {
      setLoading(true);
      const data = await getConversationRequest(route.params.conversationId);
      setConversation(data);
      setGroupName(data.title || route.params.title || "");
      upsertConversation(data);
    } catch (error) {
      showToast(extractErrorMessage(error, "Failed to load group"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConversation();
  }, [route.params.conversationId]);

  const members = useMemo(
    () => conversation?.participants || [],
    [conversation?.participants],
  );
  const admins = useMemo(
    () => new Set((conversation?.admins || []).map((member) => member._id)),
    [conversation?.admins],
  );
  const isAdmin = Boolean(currentUser?._id && admins.has(currentUser._id));
  const isCreator = Boolean(
    currentUser?._id && conversation?.createdBy?._id === currentUser._id,
  );
  const canManage = isAdmin || isCreator;

  const handleRename = async () => {
    if (!conversation || !groupName.trim()) {
      showToast("Group name is required", "error");
      return;
    }

    try {
      setSaving(true);
      const updated = await renameGroupConversationRequest(conversation._id, {
        name: groupName.trim(),
      });
      setConversation(updated);
      upsertConversation(updated);
      showToast("Group updated", "success");
    } catch (error) {
      showToast(extractErrorMessage(error, "Failed to rename group"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = () => {
    if (!conversation) {
      return;
    }

    navigation.navigate("CreateGroupScreen", {
      groupId: conversation._id,
      existingMemberIds: members.map((member) => member._id),
      title: conversation.title || groupName,
    });
  };

  const handleLeave = () => {
    if (!conversation) {
      return;
    }

    Alert.alert("Leave group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await leaveGroupConversationRequest(
              conversation._id,
            );
            removeConversation(conversation._id);
            if (result.deleted) {
              navigation.navigate("MainTabs", { screen: "ChatList" });
            } else {
              navigation.goBack();
            }
          } catch (error) {
            showToast(
              extractErrorMessage(error, "Failed to leave group"),
              "error",
            );
          }
        },
      },
    ]);
  };

  const handleClearChat = () => {
    if (!conversation) {
      return;
    }

    Alert.alert(
      "Clear chat",
      "This clears the conversation history for you. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearGroupChatRequest(conversation._id);
              showToast("Chat cleared", "success");
              navigation.goBack();
            } catch (error) {
              showToast(
                extractErrorMessage(error, "Failed to clear chat"),
                "error",
              );
            }
          },
        },
      ],
    );
  };

  const handleRemoveMember = (member: User) => {
    if (!conversation) {
      return;
    }

    Alert.alert("Remove member", `Remove ${member.name} from the group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const updated = await removeGroupMemberRequest(
              conversation._id,
              member._id,
            );
            if (updated.conversation) {
              setConversation(updated.conversation);
              upsertConversation(updated.conversation);
            }
            showToast("Member removed", "success");
          } catch (error) {
            showToast(
              extractErrorMessage(error, "Failed to remove member"),
              "error",
            );
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 14,
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.borderLight,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backButton}
          >
            <ChevronLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>

          <View
            style={[
              styles.groupIcon,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Users size={20} color={theme.colors.primary} strokeWidth={2.2} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text
              style={[styles.title, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {conversation?.title || route.params.title || "Group"}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {members.length} members • {admins.size} admin
              {admins.size === 1 ? "" : "s"}
            </Text>
          </View>
          <Pressable onPress={loadConversation} style={styles.refreshButton}>
            <RefreshCcw
              size={16}
              color={theme.colors.primary}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Group name
              </Text>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group name"
                placeholderTextColor={theme.colors.textTertiary}
                style={[
                  styles.nameInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                  },
                ]}
                editable={canManage}
              />
              <View style={styles.actionsRow}>
                {canManage ? (
                  <Pressable
                    onPress={() => void handleRename()}
                    style={({ pressed }) => [
                      styles.actionButton,
                      {
                        backgroundColor: pressed
                          ? theme.colors.primaryLight
                          : theme.colors.primary,
                      },
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      {saving ? "Saving..." : "Save Name"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={handleAddMembers}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      backgroundColor: pressed
                        ? theme.colors.primaryLight
                        : theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Plus
                    size={14}
                    color={theme.colors.primary}
                    strokeWidth={2.3}
                  />
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    Add Followers
                  </Text>
                </Pressable>
              </View>
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={handleClearChat}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      backgroundColor: pressed
                        ? theme.colors.primaryLight
                        : theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    Clear Chat
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleLeave}
                  style={({ pressed }) => [
                    styles.destructiveButton,
                    {
                      backgroundColor: pressed ? "#FEE2E2" : "#FEF2F2",
                      borderColor: "#FECACA",
                    },
                  ]}
                >
                  <Text style={styles.destructiveButtonText}>Leave Group</Text>
                </Pressable>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const memberIsMe = item._id === currentUser?._id;
            const memberIsAdmin = admins.has(item._id);
            return (
              <Pressable
                onPress={() =>
                  navigation.navigate("UserProfile", { userId: item._id })
                }
                style={({ pressed }) => [
                  styles.memberRow,
                  {
                    backgroundColor: pressed
                      ? theme.colors.primaryLight
                      : theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Avatar
                  name={item.name}
                  uri={item.profileImage}
                  verified={item.isVerified}
                  size={46}
                />
                <View style={styles.memberBody}>
                  <Text
                    style={[
                      styles.memberName,
                      { color: theme.colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.memberMeta,
                      { color: theme.colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.role}
                    {item.specialization ? ` • ${item.specialization}` : ""}
                    {memberIsMe ? " • You" : ""}
                  </Text>
                </View>
                {memberIsAdmin ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Shield
                      size={12}
                      color={theme.colors.primary}
                      strokeWidth={2.2}
                    />
                  </View>
                ) : null}
                {canManage && !memberIsMe && !memberIsAdmin ? (
                  <Pressable
                    onPress={() => handleRemoveMember(item)}
                    style={styles.removeButton}
                  >
                    <X size={14} color="#DC2626" strokeWidth={2.4} />
                  </Pressable>
                ) : (
                  <ArrowRight
                    size={14}
                    color={theme.colors.textTertiary}
                    strokeWidth={2.1}
                  />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Users size={28} color={theme.colors.primary} />}
              title="No members"
              body="This group does not have any members yet."
            />
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  groupIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
  },
  secondaryButtonText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  destructiveButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  destructiveButtonText: {
    color: "#B91C1C",
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  memberRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberBody: {
    flex: 1,
  },
  memberName: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 15,
  },
  memberMeta: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
