import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Heart, MessageCircle, MoreHorizontal, Share2, Stethoscope } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring
} from "react-native-reanimated";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { GlassCard } from "@/components/common/GlassCard";
import { TypeBadge } from "@/components/common/TypeBadge";
import type { Post } from "@/types/models";
import { formatRelativeTime } from "@/utils/date";
import { hapticTap } from "@/utils/haptics";

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
  const likeScale = useSharedValue(1);

  const liked = !!currentUserId && post.likes.includes(currentUserId);
  const isAnonymous = post.isAnonymous && post.type === "case";

  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }]
  }));

  const handleLike = () => {
    hapticTap();
    likeScale.value = withSequence(withSpring(1.35, { damping: 10 }), withSpring(1, { damping: 12 }));
    onLike(post._id);
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
              <Text style={[styles.rolePill, { color: theme.colors.textSecondary }]}>
                {post.userId.role}
              </Text>
              {"  ·  "}
              {formatRelativeTime(post.createdAt)}
            </Text>
          </View>
        </Pressable>

        <Pressable hitSlop={8} style={styles.moreButton}>
          <MoreHorizontal size={18} color={theme.colors.textTertiary} />
        </Pressable>
      </View>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <View style={styles.body}>
        <Text style={[styles.content, { color: theme.colors.textPrimary }]}>{post.content}</Text>

        {/* Post image */}
        {post.mediaUrl ? (
          <Image
            source={{ uri: post.mediaUrl }}
            style={styles.postImage}
            contentFit="cover"
            transition={300}
          />
        ) : null}

        {/* Case details */}
        {post.type === "case" ? (
          <View style={[styles.caseBox, { backgroundColor: theme.colors.badgeCaseLight, borderColor: "#C4B5FD" }]}>
            <View style={styles.caseTitleRow}>
              <Stethoscope size={14} color={theme.colors.badgeCase} />
              <Text style={[styles.caseTitle, { color: theme.colors.badgeCase }]}>Case Discussion</Text>
            </View>
            {post.symptoms ? (
              <View style={styles.caseRow}>
                <Text style={[styles.caseKey, { color: theme.colors.textSecondary }]}>Symptoms</Text>
                <Text style={[styles.caseValue, { color: theme.colors.textPrimary }]}>{post.symptoms}</Text>
              </View>
            ) : null}
            {post.observations ? (
              <View style={[styles.caseRow, { marginTop: 4 }]}>
                <Text style={[styles.caseKey, { color: theme.colors.textSecondary }]}>Observations</Text>
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
        {/* Like */}
        <Animated.View style={likeAnimStyle}>
          <Pressable onPress={handleLike} style={styles.actionButton} hitSlop={6}>
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
          </Pressable>
        </Animated.View>

        {/* Comment */}
        <Pressable onPress={() => onComment(post)} style={styles.actionButton} hitSlop={6}>
          <MessageCircle size={20} color={theme.colors.textTertiary} strokeWidth={2} />
          <Text style={[styles.actionLabel, { color: theme.colors.textSecondary }]}>
            {post.commentCount > 0 ? post.commentCount : "Comment"}
          </Text>
        </Pressable>

        {/* Share */}
        <Pressable
          onPress={onShare ? () => onShare(post) : undefined}
          style={styles.actionButton}
          hitSlop={6}
        >
          <Share2 size={20} color={theme.colors.textTertiary} strokeWidth={2} />
          <Text style={[styles.actionLabel, { color: theme.colors.textSecondary }]}>Share</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

export const PostCard = memo(PostCardBase);

const styles = StyleSheet.create({
  container: {
    marginBottom: 12
  },
  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12
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
  rolePill: {
    fontFamily: "Manrope_700Bold",
    textTransform: "capitalize",
    fontSize: 12
  },
  moreButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  // ── Body
  body: {
    paddingHorizontal: 16,
    paddingBottom: 14
  },
  content: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24
  },
  postImage: {
    marginTop: 12,
    width: "100%",
    height: 220,
    borderRadius: 14
  },
  // ── Case box
  caseBox: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12
  },
  caseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8
  },
  caseTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13
  },
  caseRow: {
    flexDirection: "column"
  },
  caseKey: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  caseValue: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 1
  },
  // ── Divider
  divider: {
    height: 1,
    marginHorizontal: 16
  },
  // ── Actions
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 36
  },
  actionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13
  }
});
