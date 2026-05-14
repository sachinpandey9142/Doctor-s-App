import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetTextInput,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  MessageCircleMore,
  Heart,
  Reply,
  SendHorizontal,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Avatar } from "@/components/common/Avatar";
import { getPostCommentsRequest } from "@/services/api/postApi";
import { likeCommentRequest } from "@/services/api/postApi";
import { reactCommentRequest } from "@/services/api/postApi";
import { useFeedStore } from "@/store/feedStore";
import { useAuthStore } from "@/store/authStore";
import { useCommentSheetStore } from "@/store/commentSheetStore";
import { extractErrorMessage, useToastStore } from "@/store/toastStore";
import { formatRelativeTime } from "@/utils/date";
import type { Comment } from "@/types/models";
import { hapticTap } from "@/utils/haptics";

// Flattened structure for FlatList rendering
interface FlatCommentItem {
  item: Comment;
  depth: number;
  isReply: boolean;
  parentId: string;
  isExpanded: boolean;
  replyCount: number;
}

type ReplyTarget = {
  commentId: string;
  userName: string;
};

type ReactionKey =
  | "helpful"
  | "insightful"
  | "educational"
  | "great_case"
  | "support"
  | "celebrate"
  | "research";

const REACTION_OPTIONS: Array<{
  key: ReactionKey;
  label: string;
  emoji: string;
}> = [
  { key: "helpful", label: "Helpful", emoji: "🩺" },
  { key: "insightful", label: "Insightful", emoji: "💡" },
  { key: "educational", label: "Educational", emoji: "📚" },
  { key: "great_case", label: "Great Case", emoji: "👏" },
  { key: "support", label: "Support", emoji: "❤️" },
  { key: "celebrate", label: "Celebrate", emoji: "🎉" },
  { key: "research", label: "Research", emoji: "🔬" },
];

const updateCommentTree = (
  items: Comment[],
  commentId: string,
  updater: (comment: Comment) => Comment,
): Comment[] => {
  let changed = false;

  const nextItems = items.map((comment) => {
    if (comment._id === commentId) {
      changed = true;
      return updater(comment);
    }

    if (comment.replies?.length) {
      const nextReplies = updateCommentTree(
        comment.replies,
        commentId,
        updater,
      );
      if (nextReplies !== comment.replies) {
        changed = true;
        return {
          ...comment,
          replies: nextReplies,
        };
      }
    }

    return comment;
  });

  return changed ? nextItems : items;
};

const insertReplyIntoTree = (
  items: Comment[],
  parentCommentId: string,
  reply: Comment,
): Comment[] =>
  updateCommentTree(items, parentCommentId, (comment) => {
    const existingReplies = comment.replies ?? [];

    return {
      ...comment,
      replies: [...existingReplies, reply],
      replyCount:
        Math.max(
          comment.replyCount ?? existingReplies.length,
          existingReplies.length,
        ) + 1,
      isExpanded: true,
    };
  });

const toggleCommentLikeInTree = (
  items: Comment[],
  commentId: string,
  userId: string,
): Comment[] =>
  updateCommentTree(items, commentId, (comment) => {
    const likes = comment.likes ?? [];
    const liked = likes.includes(userId);
    const nextReactions: Record<string, string[]> = {};

    Object.entries(comment.reactions ?? {}).forEach(([key, ids]) => {
      const nextIds = (ids ?? []).filter((id) => id !== userId);
      if (nextIds.length > 0) {
        nextReactions[key] = nextIds;
      }
    });

    return {
      ...comment,
      likes: liked ? likes.filter((id) => id !== userId) : [...likes, userId],
      reactions: nextReactions,
    };
  });

const toggleCommentReactionInTree = (
  items: Comment[],
  commentId: string,
  userId: string,
  reaction: ReactionKey,
): Comment[] =>
  updateCommentTree(items, commentId, (comment) => {
    const reactions = comment.reactions ?? {};
    const nextReactions: Record<string, string[]> = {};
    let currentReaction: string | null = null;

    Object.entries(reactions).forEach(([key, ids]) => {
      const nextIds = (ids ?? []).filter((id) => id !== userId);

      if (nextIds.length > 0) {
        nextReactions[key] = nextIds;
      }

      if ((ids ?? []).includes(userId)) {
        currentReaction = key;
      }
    });

    if (currentReaction !== reaction) {
      nextReactions[reaction] = [...(nextReactions[reaction] ?? []), userId];
    }

    return {
      ...comment,
      reactions: nextReactions,
      likes: (comment.likes ?? []).filter((id) => id !== userId),
    };
  });

const clearCommentReactionInTree = (
  items: Comment[],
  commentId: string,
  userId: string,
): Comment[] =>
  updateCommentTree(items, commentId, (comment) => {
    const nextReactions: Record<string, string[]> = {};

    Object.entries(comment.reactions ?? {}).forEach(([key, ids]) => {
      const nextIds = (ids ?? []).filter((id) => id !== userId);
      if (nextIds.length > 0) {
        nextReactions[key] = nextIds;
      }
    });

    return {
      ...comment,
      reactions: nextReactions,
    };
  });

const getCommentPath = (
  items: Comment[],
  targetCommentId: string,
  ancestry: string[] = [],
): string[] | null => {
  for (const comment of items) {
    const nextAncestry = [...ancestry, comment._id];

    if (comment._id === targetCommentId) {
      return nextAncestry;
    }

    if (comment.replies?.length) {
      const match = getCommentPath(
        comment.replies,
        targetCommentId,
        nextAncestry,
      );
      if (match) {
        return match;
      }
    }
  }

  return null;
};

const getCurrentReaction = (
  comment: Comment,
  userId?: string,
): ReactionKey | null => {
  if (!userId) return null;

  const reactions = comment.reactions ?? {};
  const match = Object.entries(reactions).find(([, ids]) =>
    (ids ?? []).includes(userId),
  );

  return (match?.[0] as ReactionKey | undefined) ?? null;
};

const getReactionMeta = (reaction: ReactionKey | null) =>
  REACTION_OPTIONS.find((option) => option.key === reaction) ?? null;

const getReactionEmoji = (reaction: ReactionKey | null) =>
  getReactionMeta(reaction)?.emoji ?? "♡";

const getReactionSummary = (comment: Comment) => {
  const reactions = comment.reactions ?? {};
  const total = Object.values(reactions).reduce(
    (count, ids) => count + (ids?.length ?? 0),
    0,
  );

  const topReactions = Object.entries(reactions)
    .map(([key, ids]) => ({
      key: key as ReactionKey,
      count: ids?.length ?? 0,
      meta:
        REACTION_OPTIONS.find((option) => option.key === key) ??
        REACTION_OPTIONS[0],
    }))
    .filter((reaction) => reaction.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return { total, topReactions };
};

const getReactionCount = (comment: Comment) =>
  Object.values(comment.reactions ?? {}).reduce(
    (total, ids) => total + (ids?.length ?? 0),
    0,
  );

export function CommentBottomSheet() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const { isOpen, postId, postTitle, closeSheet } = useCommentSheetStore();
  const { addComment, addReply } = useFeedStore();
  const authUser = useAuthStore((state) => state.user);
  const showToast = useToastStore((state) => state.showToast);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [reactionMenuCommentId, setReactionMenuCommentId] = useState<
    string | null
  >(null);
  const [reactionTrayHoveredIndex, setReactionTrayHoveredIndex] = useState(-1);
  const [reactionTrayWidth, setReactionTrayWidth] = useState(0);
  const [sheetIndex, setSheetIndex] = useState(-1);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set(),
  );
  const [busyCommentIds, setBusyCommentIds] = useState<Set<string>>(new Set());
  const reactionTraySelectionCommittedRef = useRef(false);

  const reactionTrayOpacity = useSharedValue(0);
  const reactionTrayScale = useSharedValue(0.92);
  const reactionTrayTranslateY = useSharedValue(12);

  const snapPoints = useMemo(() => ["76%", "96%"], []);

  const clearInteractionState = useCallback(() => {
    setReplyTarget(null);
    setReactionMenuCommentId(null);
    setReactionTrayHoveredIndex(-1);
    reactionTraySelectionCommittedRef.current = false;
  }, []);

  useEffect(() => {
    if (reactionMenuCommentId) {
      reactionTrayOpacity.value = withTiming(1, { duration: 140 });
      reactionTrayScale.value = withSpring(1, { damping: 18, stiffness: 240 });
      reactionTrayTranslateY.value = withSpring(0, {
        damping: 18,
        stiffness: 240,
      });
    } else {
      reactionTrayOpacity.value = withTiming(0, { duration: 120 });
      reactionTrayScale.value = withTiming(0.96, { duration: 120 });
      reactionTrayTranslateY.value = withTiming(12, { duration: 120 });
    }
  }, [
    reactionMenuCommentId,
    reactionTrayOpacity,
    reactionTrayScale,
    reactionTrayTranslateY,
  ]);

  const loadComments = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const items = await getPostCommentsRequest(id);
      setComments(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
      setCommentText("");
      clearInteractionState();
      if (postId) {
        void loadComments(postId);
      }
    } else {
      bottomSheetRef.current?.close();
      setComments([]);
      clearInteractionState();
      setExpandedThreads(new Set());
      setBusyCommentIds(new Set());
      setSheetIndex(-1);
    }
  }, [clearInteractionState, isOpen, postId, loadComments]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      setSheetIndex(index);
      if (index === -1 && isOpen) {
        Keyboard.dismiss();
        closeSheet();
      }
    },
    [isOpen, closeSheet],
  );

  const handleSubmit = async () => {
    const trimmedComment = commentText.trim();
    const activeReplyTarget = replyTarget;

    if (!trimmedComment || !postId) return;
    hapticTap();
    setSending(true);
    try {
      const created = activeReplyTarget
        ? await addReply(postId, trimmedComment, activeReplyTarget.commentId)
        : await addComment(postId, trimmedComment);

      if (activeReplyTarget) {
        setComments((prev) =>
          insertReplyIntoTree(prev, activeReplyTarget.commentId, created),
        );
        const path = getCommentPath(comments, activeReplyTarget.commentId) ?? [
          activeReplyTarget.commentId,
        ];
        setExpandedThreads((prev) => {
          const next = new Set(prev);
          path.forEach((commentId) => next.add(commentId));
          return next;
        });
      } else {
        setComments((prev) => [created, ...prev]);
      }
      setCommentText("");
      clearInteractionState();
    } catch (error) {
      showToast(extractErrorMessage(error, "Failed to send comment"), "error");
    } finally {
      setSending(false);
    }
  };

  const handleComposerFocus = useCallback(() => {
    if (sheetIndex !== 1) {
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [sheetIndex]);

  function closeReactionTray() {
    setReactionMenuCommentId(null);
    setReactionTrayHoveredIndex(-1);
    reactionTraySelectionCommittedRef.current = false;
  }

  function selectHoveredReaction(commentId: string) {
    const hovered =
      REACTION_OPTIONS[reactionTrayHoveredIndex] ?? REACTION_OPTIONS[0];
    void handleReactToComment(commentId, hovered.key);
  }

  function commitReactionTraySelection(commentId: string) {
    if (reactionTraySelectionCommittedRef.current) return;
    reactionTraySelectionCommittedRef.current = true;
    void selectHoveredReaction(commentId);
    closeReactionTray();
  }

  const toggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!postId || !authUser?._id) return;
      hapticTap();

      const currentUserId = authUser._id;
      let rollbackSnapshot: Comment[] | null = null;

      setBusyCommentIds((prev) => new Set(prev).add(commentId));

      setComments((prev) => {
        rollbackSnapshot = prev;
        return toggleCommentLikeInTree(prev, commentId, currentUserId);
      });

      try {
        await likeCommentRequest(postId, commentId);
        closeReactionTray();
      } catch (error) {
        if (rollbackSnapshot) {
          setComments(rollbackSnapshot);
        }
        showToast(extractErrorMessage(error, "Failed to update like"), "error");
      } finally {
        setBusyCommentIds((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      }
    },
    [authUser?._id, closeReactionTray, postId, showToast],
  );

  const handleReactToComment = useCallback(
    async (commentId: string, reaction: ReactionKey) => {
      if (!postId || !authUser?._id) return;

      const currentUserId = authUser._id;
      let rollbackSnapshot: Comment[] | null = null;

      setBusyCommentIds((prev) => new Set(prev).add(commentId));

      setComments((prev) => {
        rollbackSnapshot = prev;
        return toggleCommentReactionInTree(
          prev,
          commentId,
          currentUserId,
          reaction,
        );
      });

      try {
        await reactCommentRequest(postId, commentId, reaction);
        closeReactionTray();
      } catch (error) {
        if (rollbackSnapshot) {
          setComments(rollbackSnapshot);
        }
        showToast(
          extractErrorMessage(error, "Failed to update reaction"),
          "error",
        );
      } finally {
        setBusyCommentIds((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      }
    },
    [authUser?._id, closeReactionTray, postId, showToast],
  );

  const toggleThreadExpanded = useCallback((commentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  const openReactionTray = useCallback(
    (commentId: string, reaction: ReactionKey | null) => {
      reactionTraySelectionCommittedRef.current = false;
      setReactionMenuCommentId(commentId);
      setReactionTrayHoveredIndex(
        Math.max(
          REACTION_OPTIONS.findIndex((option) => option.key === reaction),
          0,
        ),
      );
    },
    [],
  );

  // Flatten threaded comments for FlatList rendering
  const flattenComments = useCallback(
    (items: Comment[], depth = 0, parentId = ""): FlatCommentItem[] => {
      const flattened: FlatCommentItem[] = [];

      items.forEach((comment) => {
        const isExpanded = expandedThreads.has(comment._id);
        const replyCount = comment.replies?.length ?? comment.replyCount ?? 0;

        flattened.push({
          item: comment,
          depth,
          isReply: depth > 0,
          parentId,
          isExpanded,
          replyCount,
        });

        // Add replies if expanded
        if (isExpanded && comment.replies?.length) {
          flattened.push(
            ...flattenComments(comment.replies, depth + 1, comment._id),
          );
        }
      });

      return flattened;
    },
    [expandedThreads],
  );

  const flatCommentsList = useMemo(
    () => flattenComments(comments),
    [comments, flattenComments],
  );

  const reactionTrayAnimStyle = useAnimatedStyle(() => ({
    opacity: reactionTrayOpacity.value,
    transform: [
      { translateY: reactionTrayTranslateY.value },
      { scale: reactionTrayScale.value },
    ],
  }));

  const trayPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(({ x }) => {
          if (!reactionMenuCommentId || reactionTrayWidth <= 0) return;

          const itemWidth = reactionTrayWidth / REACTION_OPTIONS.length;
          const nextIndex = Math.max(
            0,
            Math.min(REACTION_OPTIONS.length - 1, Math.floor(x / itemWidth)),
          );

          runOnJS(setReactionTrayHoveredIndex)(nextIndex);
        })
        .onUpdate(({ x }) => {
          if (!reactionMenuCommentId || reactionTrayWidth <= 0) return;

          const itemWidth = reactionTrayWidth / REACTION_OPTIONS.length;
          const nextIndex = Math.max(
            0,
            Math.min(REACTION_OPTIONS.length - 1, Math.floor(x / itemWidth)),
          );

          runOnJS(setReactionTrayHoveredIndex)(nextIndex);
        })
        .onEnd(() => {
          if (!reactionMenuCommentId) return;
          runOnJS(commitReactionTraySelection)(reactionMenuCommentId);
        }),
    [commitReactionTraySelection, reactionMenuCommentId, reactionTrayWidth],
  );

  const renderFooter = useCallback(
    (footerProps: BottomSheetFooterProps) => (
      <BottomSheetFooter {...footerProps} bottomInset={insets.bottom}>
        <View
          style={[
            styles.footerShell,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.borderLight,
              shadowColor: theme.colors.textPrimary,
            },
          ]}
        >
          {replyTarget ? (
            <View
              style={[
                styles.replyBanner,
                {
                  backgroundColor: theme.colors.primaryLight,
                  borderColor: theme.colors.primaryMid,
                },
              ]}
            >
              <View style={styles.replyBannerRow}>
                <Reply size={14} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.replyBannerText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Replying to {replyTarget.userName}
                </Text>
              </View>
              <Pressable onPress={clearInteractionState} hitSlop={10}>
                <Text
                  style={[
                    styles.replyCancel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.inputBar}>
            <Avatar
              name={authUser?.name ?? "Me"}
              uri={authUser?.profileImage}
              size={36}
            />

            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <BottomSheetTextInput
                value={commentText}
                onFocus={handleComposerFocus}
                onChangeText={setCommentText}
                placeholder={
                  replyTarget
                    ? `Reply to ${replyTarget.userName}...`
                    : "Add a comment..."
                }
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.input, { color: theme.colors.textPrimary }]}
                multiline
                maxLength={500}
              />
            </View>

            <Pressable
              onPress={() => void handleSubmit()}
              disabled={sending || !commentText.trim()}
              style={({ pressed }) => [
                styles.sendPressable,
                pressed && styles.sendPressablePressed,
              ]}
            >
              <LinearGradient
                colors={
                  commentText.trim()
                    ? theme.gradients.primary
                    : [theme.colors.border, theme.colors.border]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendBtn}
              >
                <SendHorizontal size={17} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </BottomSheetFooter>
    ),
    [
      authUser?.name,
      authUser?.profileImage,
      commentText,
      clearInteractionState,
      handleComposerFocus,
      handleSubmit,
      insets.bottom,
      replyTarget,
      sending,
      theme,
    ],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.68}
      />
    ),
    [],
  );

  const renderCommentItem = (
    item: Comment,
    depth: number,
    isReply: boolean,
    replyCount: number,
    isExpanded: boolean,
  ) => {
    const indentSize = depth * 12;
    const isRootComment = depth === 0;
    const isBusy = busyCommentIds.has(item._id);
    const currentReaction = getCurrentReaction(item, authUser?._id);
    const currentReactionMeta = getReactionMeta(currentReaction);
    const reactionSummary = getReactionSummary(item);
    const liked = (item.likes ?? []).includes(authUser?._id ?? "");
    const selectedLabel = liked ? "Liked" : "Like";

    return (
      <View
        style={[styles.commentRow, isReply && { marginLeft: indentSize + 44 }]}
      >
        {/* Indentation line for replies */}
        {isReply && (
          <View
            style={[
              styles.threadLine,
              {
                marginLeft: -indentSize - 10,
                borderLeftColor: theme.colors.borderLight,
              },
            ]}
          />
        )}

        <Avatar
          name={item.userId.name}
          uri={item.userId.profileImage}
          verified={item.userId.isVerified}
          size={isReply ? 32 : 40}
        />

        <View style={[styles.commentBody, { flex: 1 }]}>
          <View
            style={[
              styles.bubbleWrap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
                shadowColor: theme.colors.textPrimary,
              },
              isReply && {
                backgroundColor: theme.colors.background,
                borderWidth: 0,
                paddingHorizontal: 12,
                paddingVertical: 10,
                shadowOpacity: 0,
              },
            ]}
          >
            <View style={styles.commentHeaderRow}>
              <View style={styles.identityRow}>
                <Text
                  style={[
                    styles.commentName,
                    { color: theme.colors.textPrimary },
                    isReply && { fontSize: 12 },
                  ]}
                  numberOfLines={1}
                >
                  {item.userId.name}
                </Text>
                {item.userId.role ? (
                  <View
                    style={[
                      styles.rolePill,
                      { backgroundColor: theme.colors.primaryLight },
                      isReply && { paddingHorizontal: 6, paddingVertical: 2 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        { color: theme.colors.primary },
                        isReply && { fontSize: 9 },
                      ]}
                    >
                      {item.userId.role.replace(/-/g, " ")}
                    </Text>
                  </View>
                ) : null}
              </View>
              {item.userId.isVerified ? (
                <View
                  style={[
                    styles.verifyPill,
                    { backgroundColor: theme.colors.successLight },
                    isReply && { width: 16, height: 16 },
                  ]}
                >
                  <Sparkles
                    size={isReply ? 9 : 11}
                    color={theme.colors.success}
                  />
                </View>
              ) : null}
            </View>

            <Text
              style={[
                styles.commentText,
                { color: theme.colors.textPrimary },
                isReply && { fontSize: 13, lineHeight: 20 },
              ]}
            >
              {item.text}
            </Text>

            <View style={styles.commentActionsRow}>
              <Text
                style={[
                  styles.commentTime,
                  { color: theme.colors.textTertiary },
                ]}
              >
                {formatRelativeTime(item.createdAt)}
              </Text>
              <View style={styles.actionGroup}>
                {(item.likes?.length ?? 0) > 0 && (
                  <Text
                    style={[
                      styles.likeCountText,
                      { color: theme.colors.textTertiary },
                      isReply && { fontSize: 9 },
                    ]}
                  >
                    {item.likes?.length ?? 0}
                  </Text>
                )}

                <Pressable
                  onPress={() => void toggleCommentLike(item._id)}
                  onLongPress={() => {
                    hapticTap();
                    openReactionTray(item._id, currentReaction);
                  }}
                  delayLongPress={320}
                  disabled={isBusy}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.actionChip,
                    currentReactionMeta && {
                      backgroundColor: theme.colors.primaryLight,
                    },
                    isBusy && styles.actionChipDisabled,
                    isReply && { paddingHorizontal: 8, paddingVertical: 4 },
                    pressed && styles.actionChipPressed,
                  ]}
                >
                  {currentReactionMeta ? (
                    <Text style={styles.inlineReactionEmoji}>
                      {currentReactionMeta.emoji}
                    </Text>
                  ) : (
                    <Heart
                      size={13}
                      color={
                        liked ? theme.colors.error : theme.colors.textSecondary
                      }
                      fill={liked ? theme.colors.error : "none"}
                    />
                  )}
                  {!currentReactionMeta ? (
                    <Text
                      style={[
                        styles.actionLabel,
                        {
                          color: liked
                            ? theme.colors.error
                            : theme.colors.textSecondary,
                        },
                        isReply && { fontSize: 10 },
                      ]}
                    >
                      {selectedLabel}
                    </Text>
                  ) : null}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setReplyTarget({
                      commentId: item._id,
                      userName: item.userId.name,
                    });
                    clearInteractionState();
                  }}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.actionChip,
                    isReply && { paddingHorizontal: 8, paddingVertical: 4 },
                    pressed && styles.actionChipPressed,
                  ]}
                >
                  <Reply size={13} color={theme.colors.textSecondary} />
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: theme.colors.textSecondary },
                      isReply && { fontSize: 10 },
                    ]}
                  >
                    Reply
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    hapticTap();
                    openReactionTray(item._id, currentReaction);
                  }}
                  disabled={isBusy}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.actionChip,
                    isBusy && styles.actionChipDisabled,
                    isReply && { paddingHorizontal: 8, paddingVertical: 4 },
                    pressed && styles.actionChipPressed,
                  ]}
                >
                  <MessageCircleMore
                    size={13}
                    color={theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: theme.colors.textSecondary },
                      isReply && { fontSize: 10 },
                    ]}
                  >
                    React
                  </Text>
                </Pressable>
              </View>
            </View>

            {reactionSummary.total > 0 ? (
              <View
                style={[
                  styles.reactionSummaryRow,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <View style={styles.reactionIconStack}>
                  {reactionSummary.topReactions.map((reaction) => {
                    return (
                      <View
                        key={reaction.key}
                        style={[
                          styles.reactionMiniIcon,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.borderLight,
                          },
                        ]}
                      >
                        <Text style={styles.reactionMiniEmoji}>
                          {reaction.meta.emoji}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <Text
                  style={[
                    styles.reactionSummaryText,
                    { color: theme.colors.textSecondary },
                    isReply && { fontSize: 9 },
                  ]}
                >
                  {reactionSummary.total} reaction
                  {reactionSummary.total === 1 ? "" : "s"}
                </Text>
              </View>
            ) : null}

            {reactionMenuCommentId === item._id ? (
              <GestureDetector gesture={trayPanGesture}>
                <Animated.View
                  onLayout={(event) =>
                    setReactionTrayWidth(event.nativeEvent.layout.width)
                  }
                  style={[
                    styles.reactionTray,
                    {
                      backgroundColor: theme.colors.surfaceElevated,
                      borderColor: theme.colors.borderLight,
                      shadowColor: theme.colors.textPrimary,
                    },
                    reactionTrayAnimStyle,
                  ]}
                >
                  {REACTION_OPTIONS.map((reactionOption, index) => {
                    const isSelected = reactionTrayHoveredIndex === index;

                    return (
                      <Pressable
                        key={reactionOption.key}
                        onPress={() => {
                          setReactionTrayHoveredIndex(index);
                          commitReactionTraySelection(item._id);
                        }}
                        onPressIn={() => setReactionTrayHoveredIndex(index)}
                        style={[
                          styles.reactionTrayItem,
                          isSelected && {
                            backgroundColor: theme.colors.primaryLight,
                            borderColor: theme.colors.primaryMid,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.reactionTrayEmoji,
                            {
                              backgroundColor: isSelected
                                ? theme.colors.primaryLight
                                : theme.colors.background,
                              borderColor: isSelected
                                ? theme.colors.primaryMid
                                : theme.colors.borderLight,
                              shadowColor: theme.colors.textPrimary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.reactionTrayEmojiText,
                              isSelected && { transform: [{ scale: 1.16 }] },
                            ]}
                          >
                            {reactionOption.emoji}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </Animated.View>
              </GestureDetector>
            ) : null}
          </View>

          {/* Expand/Collapse replies for root comments */}
          {isRootComment && replyCount > 0 && (
            <Pressable
              onPress={() => toggleThreadExpanded(item._id)}
              style={({ pressed }) => [
                styles.expandRepliesBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.expandRepliesContent}>
                {isExpanded ? (
                  <ChevronUp size={14} color={theme.colors.primary} />
                ) : (
                  <ChevronDown size={14} color={theme.colors.primary} />
                )}
                <Text
                  style={[
                    styles.expandRepliesText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {isExpanded
                    ? `Hide ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
                    : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderItem = ({ item: renderData }: { item: FlatCommentItem }) => {
    const { item, depth, isReply, replyCount, isExpanded } = renderData;
    return renderCommentItem(item, depth, isReply, replyCount, isExpanded);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onAnimate={(_, to) => {
        if (to === -1) {
          Keyboard.dismiss();
        }
      }}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      footerComponent={renderFooter}
    >
      <View
        style={[styles.header, { borderBottomColor: theme.colors.borderLight }]}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          {postTitle || "Comments"}
        </Text>
        <Text
          style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}
        >
          Join the discussion with healthcare professionals
        </Text>
      </View>

      <BottomSheetFlatList
        data={flatCommentsList}
        keyExtractor={(item) => `${item.item._id}-${item.depth}`}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? (
              <>
                <View
                  style={[
                    styles.emptyIconWrap,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <MessageCircleMore size={24} color={theme.colors.primary} />
                </View>
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Loading comments...
                </Text>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.emptyIconWrap,
                    { backgroundColor: theme.colors.primaryLight },
                  ]}
                >
                  <MessageCircleMore size={24} color={theme.colors.primary} />
                </View>
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Start the discussion
                </Text>
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  No comments yet. Add the first perspective and keep the
                  clinical conversation moving.
                </Text>
              </>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
  },
  headerSubtitle: {
    marginTop: 3,
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 116,
    gap: 16,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  threadLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    borderLeftWidth: 2,
    opacity: 0.3,
  },
  commentBody: {
    gap: 4,
  },
  bubbleWrap: {
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  commentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roleText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    textTransform: "capitalize",
    letterSpacing: 0.4,
  },
  verifyPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  commentActionsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  actionChipDisabled: {
    opacity: 0.5,
  },
  actionChipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  actionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
  inlineReactionEmoji: {
    fontSize: 12,
    lineHeight: 14,
  },
  likeCountText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
    paddingHorizontal: 6,
  },
  reactionSummaryRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  reactionIconStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  reactionMiniIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginLeft: -4,
  },
  reactionMiniEmoji: {
    fontSize: 9,
    lineHeight: 10,
  },
  reactionSummaryText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
  reactionTray: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 56,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
    padding: 8,
    borderRadius: 22,
    borderWidth: 1,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  reactionTrayItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  reactionTrayEmoji: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  reactionTrayEmojiText: {
    fontSize: 18,
    lineHeight: 20,
  },
  reactionTrayLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    textAlign: "center",
    lineHeight: 9,
    letterSpacing: 0.2,
  },
  footerShell: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === "ios" ? 10 : 14,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  replyBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  replyBannerText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    flexShrink: 1,
  },
  replyCancel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  sendPressable: {
    alignSelf: "flex-end",
  },
  sendPressablePressed: {
    opacity: 0.85,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  commentName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
    flexShrink: 1,
  },
  commentText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  commentTime: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
    flexShrink: 0,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center",
    marginBottom: 2,
  },
  input: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    maxHeight: 100,
  },
  emptyState: {
    marginTop: 24,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
    gap: 10,
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  emptyText: {
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  expandRepliesBtn: {
    marginTop: 8,
    paddingLeft: 4,
    paddingVertical: 6,
  },
  expandRepliesContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expandRepliesText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
