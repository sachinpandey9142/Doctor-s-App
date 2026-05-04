import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/store/authStore";
import { useStoryStore } from "@/store/storyStore";
import type { StoryGroup } from "@/types/models";
import { hapticTap } from "@/utils/haptics";

type StoryItem =
  | { kind: "add" }
  | { kind: "group"; group: StoryGroup };

const AVATAR_SIZE = 58;

function StoryBubble({ group }: { group: StoryGroup }) {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const openStory = useCallback(() => {
    hapticTap();
    navigation.navigate("StoryViewer", {
      userId: group.user._id,
      storyId: group.stories[0]?._id
    });
  }, [group.stories, group.user._id, navigation]);

  const ringColors = group.hasUnseen ? ["#2563EB", "#06B6D4", "#8B5CF6"] : [theme.colors.border, theme.colors.border];

  return (
    <Pressable onPress={openStory} style={styles.item}>
      <View style={styles.ringWrap}>
        <LinearGradient colors={ringColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
          <View style={[styles.avatarInner, { borderColor: theme.colors.background }]}>
            <Avatar name={group.user.name} uri={group.user.profileImage} size={AVATAR_SIZE} verified={false} />
          </View>
        </LinearGradient>
      </View>
      <View style={styles.labelStack}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {group.user._id ? group.user.name.split(" ")[0] : "Story"}
          </Text>
          {group.user.isVerified ? <VerifiedBadge size={12} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function AddStoryBubble() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useAuthStore((state) => state.user);

  const openAddStory = useCallback(() => {
    hapticTap();
    navigation.navigate("AddStory");
  }, [navigation]);

  return (
    <Pressable onPress={openAddStory} style={styles.item}>
      <View style={styles.ringWrap}>
        <LinearGradient colors={["#2563EB", "#06B6D4", "#8B5CF6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
          <View style={[styles.avatarInner, { borderColor: theme.colors.background }]}>
            <Avatar name={currentUser?.name || "You"} uri={currentUser?.profileImage} size={AVATAR_SIZE} verified={false} />
            <View style={[styles.addBadge, { backgroundColor: theme.colors.primary }]}>
              <Plus size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.labelStack}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          Your story
        </Text>
      </View>
    </Pressable>
  );
}

export function StoryBar() {
  const groups = useStoryStore((state) => state.groups);
  const loading = useStoryStore((state) => state.loading);
  const fetchStoryFeed = useStoryStore((state) => state.fetchStoryFeed);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!requestedRef.current && !loading && groups.length === 0) {
      requestedRef.current = true;
      void fetchStoryFeed();
    }
  }, [fetchStoryFeed, groups.length, loading]);

  const data = useMemo<StoryItem[]>(() => [{ kind: "add" }, ...groups.map((group) => ({ kind: "group" as const, group }))], [groups]);

  const renderItem = useCallback(({ item }: { item: StoryItem }) => {
    if (item.kind === "add") {
      return <AddStoryBubble />;
    }

    return <StoryBubble group={item.group} />;
  }, []);

  return (
    <FlatList
      horizontal
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => (item.kind === "add" ? "add-story" : `story-${item.group.user._id}`)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
      initialNumToRender={8}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8
  },
  item: {
    width: 72,
    alignItems: "center"
  },
  labelStack: {
    marginTop: 6,
    alignItems: "center"
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  ringWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 2
  },
  ring: {
    flex: 1,
    borderRadius: 33,
    padding: 2
  },
  avatarInner: {
    flex: 1,
    borderRadius: 31,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  label: {
    fontSize: 11,
    fontFamily: "Manrope_600SemiBold"
  },
  subLabel: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: "Manrope_500Medium"
  },
  addBadge: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  }
});