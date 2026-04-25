import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
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
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { getPostCommentsRequest } from "@/services/api/postApi";
import { useFeedStore } from "@/store/feedStore";
import { formatRelativeTime } from "@/utils/date";
import type { RootStackParamList } from "@/navigation/types";
import type { Comment } from "@/types/models";

export function CommentsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Comments">>();
  const addComment = useFeedStore((state) => state.addComment);

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

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useLayoutEffect(() => {
    if (route.params.title) {
      navigation.setOptions({
        title: `${route.params.title} Comments`
      });
    }
  }, [navigation, route.params.title]);

  const handleSubmit = async () => {
    if (!commentText.trim()) {
      return;
    }

    setSending(true);
    try {
      const created = await addComment(route.params.postId, commentText);
      setComments((state) => [created, ...state]);
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
        data={comments}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.commentCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <View style={styles.commentHeader}>
              <Avatar
                name={item.userId.name}
                uri={item.userId.profileImage}
                verified={item.userId.isVerified}
                size={40}
              />
              <View style={styles.commentMeta}>
                <Text style={[styles.commentName, { color: theme.colors.textPrimary }]}>{item.userId.name}</Text>
                <Text style={[styles.commentTime, { color: theme.colors.textSecondary }]}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
            </View>
            <Text style={[styles.commentText, { color: theme.colors.textPrimary }]}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {loading ? "Loading comments..." : "No comments yet. Start the discussion."}
          </Text>
        }
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.inputRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add your clinical perspective"
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, { color: theme.colors.textPrimary }]}
          multiline
        />
        <Pressable
          onPress={handleSubmit}
          disabled={sending || !commentText.trim()}
          style={[
            styles.sendButton,
            { backgroundColor: commentText.trim() ? theme.colors.primary : theme.colors.border }
          ]}
        >
          <SendHorizontal size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12
  },
  commentCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  commentMeta: {
    flex: 1
  },
  commentName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15
  },
  commentTime: {
    marginTop: 3,
    fontFamily: "Manrope_500Medium",
    fontSize: 12
  },
  commentText: {
    marginTop: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21
  },
  emptyText: {
    marginTop: 24,
    textAlign: "center",
    fontFamily: "Manrope_500Medium"
  },
  inputRow: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE6FF",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: "Manrope_500Medium"
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  }
});
