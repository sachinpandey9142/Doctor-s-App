import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SendHorizontal } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import { getPostCommentsRequest } from "@/services/api/postApi";
import { useFeedStore } from "@/store/feedStore";
import { useAuthStore } from "@/store/authStore";
import { formatRelativeTime } from "@/utils/date";
import type { RootStackParamList } from "@/navigation/types";
import type { Comment } from "@/types/models";
import { hapticTap } from "@/utils/haptics";

export function CommentsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Comments">>();
  const addComment = useFeedStore((state) => state.addComment);
  const authUser = useAuthStore((state) => state.user);
  const flatListRef = useRef<FlatList>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getPostCommentsRequest(route.params.postId);
      setComments(items);
    } finally {
      setLoading(false);
    }
  }, [route.params.postId]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  useLayoutEffect(() => {
    if (route.params.title) {
      navigation.setOptions({ title: `${route.params.title}` });
    }
  }, [navigation, route.params.title]);

  const handleSubmit = async () => {
    if (!commentText.trim()) return;
    hapticTap();
    setSending(true);
    try {
      const created = await addComment(route.params.postId, commentText);
      setComments((prev) => [created, ...prev]);
      setCommentText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={comments}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Avatar name={item.userId.name} uri={item.userId.profileImage} verified={item.userId.isVerified} size={38} />
            <View style={styles.commentBody}>
              <View style={[styles.bubbleWrap, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.commentName, { color: theme.colors.textPrimary }]}>{item.userId.name}</Text>
                <Text style={[styles.commentText, { color: theme.colors.textPrimary }]}>{item.text}</Text>
              </View>
              <Text style={[styles.commentTime, { color: theme.colors.textTertiary }]}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {loading ? "Loading comments..." : "No comments yet. Start the discussion."}
          </Text>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Input bar */}
      <View style={[styles.inputBar, { borderTopColor: theme.colors.borderLight, backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 8 }]}>
        <Avatar name={authUser?.name ?? "Me"} uri={authUser?.profileImage} size={36} />
        <View style={[styles.inputWrap, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.input, { color: theme.colors.textPrimary }]}
            multiline
            maxLength={500}
          />
        </View>
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={sending || !commentText.trim()}
        >
          <LinearGradient
            colors={commentText.trim() ? ["#2563EB", "#06B6D4"] : [theme.colors.border, theme.colors.border]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendBtn}
          >
            <SendHorizontal size={17} color="#FFFFFF" strokeWidth={2} />
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  commentBody: {
    flex: 1,
    gap: 4
  },
  bubbleWrap: {
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  commentName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    marginBottom: 4
  },
  commentText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21
  },
  commentTime: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
    marginLeft: 4
  },
  emptyText: {
    marginTop: 32,
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    fontSize: 14
  },
  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center"
  },
  input: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    maxHeight: 100
  }
});
