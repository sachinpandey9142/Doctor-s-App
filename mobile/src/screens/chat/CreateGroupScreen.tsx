import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Check, ImagePlus, Search, Users } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { GlassCard } from "@/components/common/GlassCard";
import { createGroupRequest } from "@/services/api/groupApi";
import { uploadImageRequest } from "@/services/api/uploadApi";
import { getFollowersRequest } from "@/services/api/userApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { hapticTap } from "@/utils/haptics";
import type { RootStackParamList } from "@/navigation/types";
import type { User } from "@/types/models";

export function CreateGroupScreen() {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const upsertConversation = useChatStore((state) => state.upsertConversation);

  const [followers, setFollowers] = useState<User[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [query, setQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadFollowers = async () => {
      if (!user?._id) {
        setLoadingFollowers(false);
        return;
      }

      try {
        const items = await getFollowersRequest(user._id);
        setFollowers(items.filter((item) => item._id !== user._id));
      } finally {
        setLoadingFollowers(false);
      }
    };

    void loadFollowers();
  }, [user?._id]);

  const filteredFollowers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return followers;
    }

    return followers.filter((item) => {
      return [item.name, item.specialization, item.hospital, item.role].some(
        (field) => field.toLowerCase().includes(value),
      );
    });
  }, [followers, query]);

  const selectedMembers = useMemo(
    () => followers.filter((item) => selectedMemberIds.includes(item._id)),
    [followers, selectedMemberIds],
  );

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((item) => item !== memberId)
        : [...current, memberId],
    );
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Photo library access is required to choose a group image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert(
        "Group name required",
        "Give the group a clear name before creating it.",
      );
      return;
    }

    if (selectedMemberIds.length === 0) {
      Alert.alert(
        "Add members",
        "Select at least one follower to start the group.",
      );
      return;
    }

    setSubmitting(true);
    try {
      let groupImage: string | undefined;
      if (imageUri) {
        groupImage = await uploadImageRequest(imageUri);
      }

      const conversation = await createGroupRequest({
        groupName: trimmedName,
        groupImage,
        memberIds: selectedMemberIds,
      });

      upsertConversation(conversation);
      hapticTap();
      navigation.replace("ChatScreen", {
        conversationId: conversation._id,
        title: conversation.groupName || trimmedName,
        avatarUri: conversation.groupImage || groupImage,
        isGroup: true,
        groupName: conversation.groupName || trimmedName,
        groupImage: conversation.groupImage || groupImage,
      });
    } finally {
      setSubmitting(false);
    }
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
          <Users size={26} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Create a group
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Start a follower-only care circle, case room, or study thread.
        </Text>
      </View>

      <GlassCard style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
        >
          Group details
        </Text>
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Group name"
          placeholderTextColor={theme.colors.textSecondary}
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              borderColor: theme.colors.border,
            },
          ]}
        />

        <Pressable
          onPress={pickImage}
          style={[styles.imagePicker, { borderColor: theme.colors.border }]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePickerInner}>
              <ImagePlus size={18} color={theme.colors.primary} />
              <Text
                style={[
                  styles.imagePickerText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Choose a group image
              </Text>
            </View>
          )}
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.section}>
        <View style={styles.rowBetween}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
          >
            Followers
          </Text>
          <Text
            style={[styles.countText, { color: theme.colors.textSecondary }]}
          >
            {selectedMembers.length} selected
          </Text>
        </View>

        <View
          style={[
            styles.searchWrap,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Search size={16} color={theme.colors.primary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Filter followers"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          />
        </View>

        {loadingFollowers ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredFollowers}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const selected = selectedMemberIds.includes(item._id);
              return (
                <Pressable
                  onPress={() => toggleMember(item._id)}
                  style={[
                    styles.memberRow,
                    {
                      borderColor: selected
                        ? theme.colors.primary
                        : theme.colors.border,
                      backgroundColor: selected
                        ? `${theme.colors.primary}12`
                        : theme.colors.surface,
                    },
                  ]}
                >
                  <Avatar
                    name={item.name}
                    uri={item.profileImage}
                    size={44}
                    verified={item.isVerified}
                  />
                  <View style={styles.memberCopy}>
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
                      {item.specialization || item.role}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkWrap,
                      selected && { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    {selected ? <Check size={14} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
        >
          Selected members
        </Text>
        {selectedMembers.length === 0 ? (
          <Text
            style={[styles.emptyState, { color: theme.colors.textSecondary }]}
          >
            No followers selected yet.
          </Text>
        ) : (
          <View style={styles.chipWrap}>
            {selectedMembers.map((member) => (
              <View
                key={member._id}
                style={[
                  styles.chip,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {member.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </GlassCard>

      <Pressable
        onPress={handleCreate}
        disabled={submitting}
        style={[
          styles.createButton,
          {
            backgroundColor: theme.colors.primary,
            opacity: submitting ? 0.8 : 1,
          },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.createButtonText}>Create group</Text>
        )}
      </Pressable>
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
    paddingVertical: 8,
    gap: 8,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 340,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
  },
  imagePicker: {
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 160,
    overflow: "hidden",
  },
  imagePickerInner: {
    flex: 1,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePickerText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  searchWrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: "center",
  },
  listContent: {
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
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  chipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  createButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
  },
});
