import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Trash2, UserMinus, Users } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { GlassCard } from "@/components/common/GlassCard";
import {
  getGroupRequest,
  leaveGroupRequest,
  removeGroupMemberRequest,
} from "@/services/api/groupApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import type { RootStackParamList } from "@/navigation/types";
import type { Conversation, User } from "@/types/models";

export function GroupMembersScreen() {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "GroupMembers">>();
  const user = useAuthStore((state) => state.user);
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const removeConversation = useChatStore((state) => state.removeConversation);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadGroup = async () => {
      try {
        const data = await getGroupRequest(route.params.conversationId);
        setConversation(data);
        upsertConversation(data);
      } finally {
        setLoading(false);
      }
    };

    void loadGroup();
  }, [route.params.conversationId, upsertConversation]);

  const members = conversation?.participants || [];
  const admins = useMemo(
    () => new Set((conversation?.admins || []).map((admin) => admin._id)),
    [conversation?.admins],
  );
  const isCreator = conversation?.createdBy?._id === user?._id;
  const isAdmin = isCreator || (!!user?._id && admins.has(user._id));

  const handleRemoveMember = (member: User) => {
    Alert.alert("Remove member", `Remove ${member.name} from the group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setBusyUserId(member._id);
          try {
            const updated = await removeGroupMemberRequest(
              route.params.conversationId,
              member._id,
            );
            if (updated) {
              setConversation(updated);
              upsertConversation(updated);
            } else {
              removeConversation(route.params.conversationId);
              navigation.goBack();
            }
          } finally {
            setBusyUserId(null);
          }
        },
      },
    ]);
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave group",
      "You will stop receiving messages from this group.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            setBusyUserId(user?._id || "leave");
            try {
              await leaveGroupRequest(route.params.conversationId);
              removeConversation(route.params.conversationId);
              navigation.navigate("MainTabs", { screen: "ChatList" });
            } finally {
              setBusyUserId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <View
          style={[styles.heroIcon, { backgroundColor: theme.colors.primary }]}
        >
          <Users size={24} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {conversation?.groupName || "Group members"}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Manage who is in the room and keep the conversation tidy.
        </Text>
      </View>

      <GlassCard style={styles.section}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <View style={styles.listWrap}>
            {members.map((member) => {
              const memberIsAdmin = admins.has(member._id);
              const canRemove = isAdmin && member._id !== user?._id;
              const busy = busyUserId === member._id;

              return (
                <View
                  key={member._id}
                  style={[
                    styles.memberRow,
                    { borderColor: theme.colors.border },
                  ]}
                >
                  <Avatar
                    name={member.name}
                    uri={member.profileImage}
                    size={46}
                    verified={member.isVerified}
                  />
                  <View style={styles.memberCopy}>
                    <Text
                      style={[
                        styles.memberName,
                        { color: theme.colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {member.name}
                    </Text>
                    <Text
                      style={[
                        styles.memberMeta,
                        { color: theme.colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {member.specialization || member.role}
                      {memberIsAdmin ? " · Admin" : ""}
                    </Text>
                  </View>
                  {canRemove ? (
                    <Pressable
                      onPress={() => handleRemoveMember(member)}
                      disabled={busy}
                      style={[
                        styles.iconButton,
                        { borderColor: theme.colors.border },
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.primary}
                        />
                      ) : (
                        <UserMinus size={16} color={theme.colors.error} />
                      )}
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
        >
          Group controls
        </Text>
        <Pressable
          onPress={handleLeaveGroup}
          style={[
            styles.destructiveButton,
            { borderColor: theme.colors.error },
          ]}
        >
          <Trash2 size={16} color={theme.colors.error} />
          <Text
            style={[
              styles.destructiveButtonText,
              { color: theme.colors.error },
            ]}
          >
            Leave group
          </Text>
        </Pressable>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  hero: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: "center",
  },
  listWrap: {
    gap: 10,
  },
  memberRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberCopy: {
    flex: 1,
  },
  memberName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  memberMeta: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  destructiveButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  destructiveButtonText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
  },
});
