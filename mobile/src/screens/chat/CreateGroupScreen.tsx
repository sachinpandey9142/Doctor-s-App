import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { Check, ChevronLeft, Plus, Search } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { getFollowersRequest } from "@/services/api/userApi";
import { addGroupMembersRequest } from "@/services/api/chatApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
import type { RootStackParamList } from "@/navigation/types";
import type { User } from "@/types/models";

export function CreateGroupScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CreateGroupScreen">>();
  const currentUser = useAuthStore((state) => state.user);
  const createGroupConversation = useChatStore(
    (state) => state.createGroupConversation,
  );
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const showToast = useToastStore((state) => state.showToast);

  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    route.params?.existingMemberIds || [],
  );
  const [groupName, setGroupName] = useState(route.params?.title || "");

  const groupId = route.params?.groupId;
  const isAddMembersMode = Boolean(groupId);

  useEffect(() => {
    const loadFollowers = async () => {
      if (!currentUser?._id) {
        setLoading(false);
        return;
      }

      try {
        const data = await getFollowersRequest(currentUser._id);
        setFollowers(data);
      } catch (error) {
        showToast(
          extractErrorMessage(error, "Failed to load followers"),
          "error",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadFollowers();
  }, [currentUser?._id, showToast]);

  const filteredFollowers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const visible = followers.filter(
      (follower) =>
        follower._id !== currentUser?._id &&
        !(route.params?.existingMemberIds || []).includes(follower._id),
    );

    if (!query) {
      return visible;
    }

    return visible.filter((follower) => {
      const haystack =
        `${follower.name} ${follower.role} ${follower.specialization} ${follower.hospital}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [
    currentUser?._id,
    followers,
    route.params?.existingMemberIds,
    searchText,
  ]);

  const toggleSelected = (userId: string) => {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleSubmit = async () => {
    if (!groupName.trim() && !isAddMembersMode) {
      showToast("Group name is required", "error");
      return;
    }

    if (selectedIds.length === 0) {
      showToast("Select at least one follower", "error");
      return;
    }

    try {
      setSaving(true);
      if (isAddMembersMode && groupId) {
        const conversation = await addGroupMembersRequest(groupId, selectedIds);
        upsertConversation(conversation);
        navigation.goBack();
      } else {
        const conversation = await createGroupConversation({
          name: groupName.trim(),
          memberIds: selectedIds,
        });
        navigation.replace("ChatScreen", {
          conversationId: conversation._id,
          title: conversation.title || groupName.trim(),
        });
      }
    } catch (error) {
      showToast(extractErrorMessage(error, "Failed to save group"), "error");
    } finally {
      setSaving(false);
    }
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

          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}> 
              {isAddMembersMode ? "Add Followers" : "Create Group"}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}> 
              Followers only, secure by default.
            </Text>
          </View>
        </View>
      </View>

      {!isAddMembersMode ? (
        <View
          style={[
            styles.nameCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Group name
          </Text>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter a group name"
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              styles.nameInput,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.border,
              },
            ]}
          />
        </View>
      ) : null}

      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Search size={15} color={theme.colors.textTertiary} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search followers"
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredFollowers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const selected = selectedIds.includes(item._id);
            return (
              <Pressable
                onPress={() => toggleSelected(item._id)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed
                      ? theme.colors.primaryLight
                      : theme.colors.surface,
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              >
                <Avatar
                  name={item.name}
                  uri={item.profileImage}
                  verified={item.isVerified}
                  size={44}
                />
                <View style={styles.rowBody}>
                  <Text
                    style={[styles.name, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.meta, { color: theme.colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.role}{" "}
                    {item.specialization ? `• ${item.specialization}` : ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: selected
                        ? theme.colors.primary
                        : theme.colors.border,
                      backgroundColor: selected
                        ? theme.colors.primary
                        : "transparent",
                    },
                  ]}
                >
                  {selected ? (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  ) : null}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Plus size={26} color={theme.colors.primary} />}
              title={
                searchText ? "No followers match" : "No followers available"
              }
              body={
                searchText
                  ? "Try a different search."
                  : "You need followers before you can create a group."
              }
            />
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: insets.bottom + 10,
          },
        ]}
      >
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={
            saving ||
            selectedIds.length === 0 ||
            (!isAddMembersMode && !groupName.trim())
          }
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor:
                saving ||
                selectedIds.length === 0 ||
                (!isAddMembersMode && !groupName.trim())
                  ? theme.colors.border
                  : theme.colors.primary,
            },
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {saving
              ? "Saving..."
              : isAddMembersMode
                ? "Add Followers"
                : "Create Group"}
          </Text>
        </Pressable>
      </View>
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
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },
  nameCard: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    padding: 0,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  rowBody: {
    flex: 1,
  },
  name: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 15,
  },
  meta: {
    marginTop: 2,
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  primaryButton: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
  },
});
