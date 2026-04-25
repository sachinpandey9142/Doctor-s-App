import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Heart, MessageCircle, MoreHorizontal, Share2, Stethoscope } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { GlassCard } from "@/components/common/GlassCard";
import { TypeBadge } from "@/components/common/TypeBadge";
import type { Post } from "@/types/models";
import { formatRelativeTime } from "@/utils/date";
import { hapticTap } from "@/utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLike: (postId: string) => void;
  onComment: (post: Post) => void;
  onShare?: (post: Post) => void;
  onAuthorPress?: (post: Post) => void;
}

function PostCardBase({ post, currentUserId, onLike, onComment, onShare, onAuthorPress }: PostCardProps) {
  const theme = useTheme();

  // ── Like micro-interaction: pop up then settle ───────────────────────────
  const likeScale = useSharedValue(1);
  const likeRotate = useSharedValue(0);

  // ── Action button press feedback ─────────────────────────────────────────
  const commentScale = useSharedValue(1);
  const shareScale = useSharedValue(1);

  const liked = !!currentUserId && post.likes.includes(currentUserId);
  const isAnonymous = post.isAnonymous && post.type === "case";

  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }, { rotate: `${likeRotate.value}deg` }]
  }));

  const commentAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentScale.value }]
  }));

  const shareAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }]
  }));

  const handleLike = () => {
    hapticTap();

    if (!liked) {
      // Bouncy heart burst: grow → wobble → settle
      likeScale.value = withSequence(
        withSpring(1.45, { damping: 8, stiffness: 260 }),
        withSpring(0.9, { damping: 12, stiffness: 300 }),
        withSpring(1, { damping: 14, stiffness: 260 })
      );
      likeRotate.value = withSequence(
        withTiming(-12, { duration: 80 }),
        withTiming(12, { duration: 80 }),
        withTiming(0, { duration: 80 })
      );
    } else {
      // Subtle shrink on unlike
      likeScale.value = withSequence(
        withSpring(0.75, { damping: 12 }),
        withSpring(1, { damping: 14 })
      );
    }

    onLike(post._id);
  };

  const pressIn = (sv: Animated.SharedValue<number>) => {
    sv.value = withSpring(0.88, { damping: 14, stiffness: 300 });
  };

  const pressOut = (sv: Animated.SharedValue<number>) => {
    sv.value = withSpring(1, { damping: 14, stiffness: 300 });
  };

  return (
    <GlassCard style={styles.container} padded={false}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={onAuthorPress && !isAnonymous ? () => onAuthorPress(post) : undefined}
          disabled={!onAuthorPress || isAnonymous}
          style={styles.authorRow}
        >
          <Avatar
            name={isAnonymous ? "Anonymous Case" : post.userId.name}
            uri={isAnonymous ? "" : post.userId.profileImage}
            verified={post.userId.isVerified}
            size={42}
          />

          <View style={styles.authorText}>
            <View style={styles.nameRow}>
              <Text style={[styles.authorName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {isAnonymous ? "Anonymous Case" : post.userId.name}
              </Text>
              <TypeBadge type={post.type ?? "text"} />
            </View>
            <Text style={[styles.authorMeta, { color: theme.colors.textTertiary }]}>
              <Text style={{ color: theme.colors.textSecondary, fontFamily: "Manrope_700Bold", textTransform: "capitalize" }}>
                {post.userId.role}
              </Text>
              {"  ·  "}
              {formatRelativeTime(post.createdAt)}
            </Text>
          </View>
        </Pressable>

        <Pressable hitSlop={10} style={styles.moreButton}>
          <MoreHorizontal size={18} color={theme.colors.textTertiary} />
        </Pressable>
      </View>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <View style={styles.body}>
        <Text style={[styles.content, { color: theme.colors.textPrimary }]}>{post.content}</Text>

        {post.mediaUrl ? (
          <Image
            source={{ uri: post.mediaUrl }}
            style={styles.postImage}
            contentFit="cover"
            transition={300}
          />
        ) : null}

        {post.type === "case" ? (
          <View style={[styles.caseBox, { backgroundColor: theme.colors.badgeCaseLight, borderColor: "#C4B5FD" }]}>
            <View style={styles.caseTitleRow}>
              <Stethoscope size={13} color={theme.colors.badgeCase} />
              <Text style={[styles.caseTitle, { color: theme.colors.badgeCase }]}>Case Discussion</Text>
            </View>
            {post.symptoms ? (
              <View style={styles.caseRow}>
                <Text style={[styles.caseKey, { color: theme.colors.textTertiary }]}>SYMPTOMS</Text>
                <Text style={[styles.caseValue, { color: theme.colors.textPrimary }]}>{post.symptoms}</Text>
              </View>
            ) : null}
            {post.observations ? (
              <View style={[styles.caseRow, { marginTop: 6 }]}>
                <Text style={[styles.caseKey, { color: theme.colors.textTertiary }]}>OBSERVATIONS</Text>
                <Text style={[styles.caseValue, { color: theme.colors.textPrimary }]}>{post.observations}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        {/* Like — main micro-interaction */}
        <AnimatedPressable
          onPress={handleLike}
          onPressIn={() => pressIn(likeScale)}
          style={[styles.actionButton, likeAnimStyle]}
          hitSlop={8}
        >
          <Heart
            size={20}
            color={liked ? theme.colors.error : theme.colors.textTertiary}
            fill={liked ? theme.colors.error : "transparent"}
            strokeWidth={liked ? 0 : 2}
          />
          <Text
            style={[
              styles.actionLabel,
              { color: liked ? theme.colors.error : theme.colors.textSecondary }
            ]}
          >
            {post.likes.length > 0 ? post.likes.length : "Like"}
          </Text>
        </AnimatedPressable>

        {/* Comment */}
        <AnimatedPressable
          onPress={() => onComment(post)}
          onPressIn={() => pressIn(commentScale)}
          onPressOut={() => pressOut(commentScale)}
          style={[styles.actionButton, commentAnimStyle]}
          hitSlop={8}
        >
          <MessageCircle size={20} color={theme.colors.textTertiary} strokeWidth={2} />
          <Text style={[styles.actionLabel, { color: theme.colors.textSecondary }]}>
            {post.commentCount > 0 ? post.commentCount : "Comment"}
          </Text>
        </AnimatedPressable>

        {/* Share */}
        <AnimatedPressable
          onPress={onShare ? () => onShare(post) : undefined}
          onPressIn={() => pressIn(shareScale)}
          onPressOut={() => pressOut(shareScale)}
          style={[styles.actionButton, shareAnimStyle]}
          hitSlop={8}
        >
          <Share2 size={20} color={theme.colors.textTertiary} strokeWidth={2} />
          <Text style={[styles.actionLabel, { color: theme.colors.textSecondary }]}>Share</Text>
        </AnimatedPressable>
      </View>
    </GlassCard>
  );
}

export const PostCard = memo(PostCardBase);

const styles = StyleSheet.create({
  container: {
    marginBottom: 10
  },
  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  authorText: {
    flex: 1
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap"
  },
  authorName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
    flexShrink: 1
  },
  authorMeta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    marginTop: 2
  },
  moreButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center"
  },
  // ── Body
  body: {
    paddingHorizontal: 14,
    paddingBottom: 12
  },
  content: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24
  },
  postImage: {
    marginTop: 10,
    width: "100%",
    height: 210,
    borderRadius: 14
  },
  // ── Case box
  caseBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 6
  },
  caseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2
  },
  caseTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12
  },
  caseRow: {},
  caseKey: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 0.6
  },
  caseValue: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 1
  },
  // ── Divider
  divider: {
    height: 1,
    marginHorizontal: 14
  },
  // ── Actions
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 34
  },
  actionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13
  }
});
