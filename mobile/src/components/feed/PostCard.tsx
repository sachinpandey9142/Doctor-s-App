import React, { memo, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  ScrollView,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bookmark,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  PlayCircle,
  Send,
  Share2,
  Stethoscope,
  Trash2,
  Users,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "styled-components/native";

import { Avatar } from "@/components/common/Avatar";
import { TypeBadge } from "@/components/common/TypeBadge";
import type { Post } from "@/types/models";
import { formatRelativeTime } from "@/utils/date";
import { hapticLike, hapticTap } from "@/utils/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLike: (postId: string) => void;
  onComment: (post: Post) => void;
  onShare?: (post: Post) => void;
  onAuthorPress?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  onJoinDiscussion?: (post: Post) => void;
  onViewCase?: (post: Post) => void;
  isAdmin?: boolean;
}

// ── Options Bottom Sheet ──────────────────────────────────────────────────────
interface OptionsSheetProps {
  visible: boolean;
  isOwner: boolean;
  onDelete: () => void;
  onReport: () => void;
  onShare: () => void;
  onSave: () => void;
  onClose: () => void;
}

function OptionsSheet({
  visible,
  isOwner,
  onDelete,
  onReport,
  onShare,
  onSave,
  onClose,
}: OptionsSheetProps) {
  const theme = useTheme();
  const sheetY = useSharedValue(300);
  const bgOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      bgOpacity.value = withTiming(1, { duration: 220 });
      sheetY.value = withSpring(0, { damping: 20, stiffness: 280 });
    } else {
      bgOpacity.value = withTiming(0, { duration: 180 });
      sheetY.value = withTiming(300, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.45)" },
            backdropStyle,
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          optStyles.sheet,
          sheetStyle,
          {
            backgroundColor: theme.colors.surfaceElevated,
            shadowColor: theme.colors.textPrimary,
          },
        ]}
      >
        <View
          style={[optStyles.handle, { backgroundColor: theme.colors.border }]}
        />

        {isOwner ? (
          <Pressable style={optStyles.option} onPress={onDelete}>
            <View
              style={[
                optStyles.iconWrap,
                { backgroundColor: theme.colors.errorLight },
              ]}
            >
              <Trash2 size={18} color={theme.colors.error} />
            </View>
            <View>
              <Text
                style={[
                  optStyles.optionLabel,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Delete Post
              </Text>
              <Text
                style={[
                  optStyles.optionSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Permanently remove this post
              </Text>
            </View>
          </Pressable>
        ) : (
          <Pressable style={optStyles.option} onPress={onReport}>
            <View
              style={[
                optStyles.iconWrap,
                { backgroundColor: theme.colors.warningLight },
              ]}
            >
              <Flag size={18} color={theme.colors.warning} />
            </View>
            <View>
              <Text
                style={[
                  optStyles.optionLabel,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Report Post
              </Text>
              <Text
                style={[
                  optStyles.optionSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Flag inappropriate content
              </Text>
            </View>
          </Pressable>
        )}

        <View
          style={[
            optStyles.divider,
            { backgroundColor: theme.colors.borderLight },
          ]}
        />

        <Pressable style={optStyles.option} onPress={onShare}>
          <View
            style={[
              optStyles.iconWrap,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Share2 size={18} color={theme.colors.primary} />
          </View>
          <View>
            <Text
              style={[
                optStyles.optionLabel,
                { color: theme.colors.textPrimary },
              ]}
            >
              Share
            </Text>
            <Text
              style={[
                optStyles.optionSub,
                { color: theme.colors.textSecondary },
              ]}
            >
              Share with colleagues
            </Text>
          </View>
        </Pressable>

        <Pressable style={optStyles.option} onPress={onSave}>
          <View
            style={[
              optStyles.iconWrap,
              { backgroundColor: theme.colors.successLight },
            ]}
          >
            <Bookmark size={18} color={theme.colors.success} />
          </View>
          <View>
            <Text
              style={[
                optStyles.optionLabel,
                { color: theme.colors.textPrimary },
              ]}
            >
              Save Post
            </Text>
            <Text
              style={[
                optStyles.optionSub,
                { color: theme.colors.textSecondary },
              ]}
            >
              Add to your saved items
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[
            optStyles.cancelBtn,
            { backgroundColor: theme.colors.backgroundAlt },
          ]}
          onPress={onClose}
        >
          <Text
            style={[
              optStyles.cancelText,
              { color: theme.colors.textSecondary },
            ]}
          >
            Cancel
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

type PostGestureArgs = {
  liked: boolean;
  postId: string;
  openModal: () => void;
  showBigHeart: (x: number, y: number) => void;
  triggerLikeAnimation: () => void;
  onLike: (postId: string) => void;
  mediaScale: Animated.SharedValue<number>;
  likeScale: Animated.SharedValue<number>;
};

const createPostGesture = ({
  liked,
  postId,
  openModal,
  showBigHeart,
  triggerLikeAnimation,
  onLike,
  mediaScale,
  likeScale,
}: PostGestureArgs) => {
  const singleTap = Gesture.Tap()
    .maxDuration(250)
    .onStart(() => {
      runOnJS(openModal)();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onStart((e) => {
      // Subtle media container bump
      mediaScale.value = withSequence(
        withSpring(0.96, { damping: 15, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 300 }),
      );
      runOnJS(showBigHeart)(e.x, e.y);
      if (!liked) {
        runOnJS(triggerLikeAnimation)();
        runOnJS(onLike)(postId);
      } else {
        likeScale.value = withSequence(withSpring(0.72), withSpring(1));
      }
    });

  return Gesture.Exclusive(doubleTap, singleTap);
};

// ── PostCard ──────────────────────────────────────────────────────────────────
function PostCardBase({
  post,
  currentUserId,
  isAdmin,
  onLike,
  onComment,
  onShare,
  onAuthorPress,
  onDelete,
  onJoinDiscussion,
  onViewCase,
}: PostCardProps) {
  const theme = useTheme();
  const tapXRef = useRef(0);
  const tapYRef = useRef(0);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Animated values
  const likeScale = useSharedValue(1);
  const likeRotate = useSharedValue(0);
  const commentScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);
  const bigHeartScale = useSharedValue(0);
  const bigHeartOpacity = useSharedValue(0);
  const bigHeartX = useSharedValue(SCREEN_WIDTH / 2 - 40);
  const bigHeartY = useSharedValue(100);
  const mediaScale = useSharedValue(1);

  // Modal animated values
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.95);

  const liked = !!currentUserId && post.likes.includes(currentUserId);
  const isOwner = currentUserId === post.userId._id || !!isAdmin;
  const isAnonymous = post.isAnonymous && post.type === "case";
  const hasMedia = !!(
    post.mediaUrl ||
    (post.reportImages && post.reportImages.length > 0)
  );
  const mediaUri = post.mediaUrl || post.reportImages?.[0];

  // Animated styles
  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: likeScale.value },
      { rotate: `${likeRotate.value}deg` },
    ],
  }));
  const commentAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentScale.value }],
  }));
  const shareAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));
  const bookmarkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));
  const bigHeartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bigHeartScale.value }],
    opacity: bigHeartOpacity.value,
    left: bigHeartX.value,
    top: bigHeartY.value,
  }));
  const mediaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mediaScale.value }],
  }));
  const modalAnimStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }],
  }));
  const modalBgAnimStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
  }));

  const pressIn = (sv: Animated.SharedValue<number>) => {
    sv.value = withSpring(0.82, { damping: 12, stiffness: 320 });
  };
  const pressOut = (sv: Animated.SharedValue<number>) => {
    sv.value = withSpring(1, { damping: 14, stiffness: 280 });
  };

  const triggerLikeAnimation = React.useCallback(() => {
    likeScale.value = withSequence(
      withSpring(1.45, { damping: 7, stiffness: 240 }),
      withSpring(0.88, { damping: 12 }),
      withSpring(1, { damping: 14 }),
    );
    likeRotate.value = withSequence(
      withTiming(-12, { duration: 65 }),
      withTiming(12, { duration: 65 }),
      withTiming(0, { duration: 65 }),
    );
  }, [likeScale, likeRotate]);

  const handleLike = () => {
    hapticLike();
    if (!liked) triggerLikeAnimation();
    else likeScale.value = withSequence(withSpring(0.72), withSpring(1));
    onLike(post._id);
  };

  const showBigHeart = React.useCallback((x: number, y: number) => {
    bigHeartX.value = x - 40;
    bigHeartY.value = y - 40;
    bigHeartScale.value = 0;
    bigHeartOpacity.value = 0;
    bigHeartScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 220 }),
      withSpring(1, { damping: 14 }),
      withDelay(380, withSpring(0, { damping: 14 })),
    );
    bigHeartOpacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(450, withTiming(0, { duration: 220 })),
    );
  }, [bigHeartX, bigHeartY, bigHeartScale, bigHeartOpacity]);

  const openModal = React.useCallback(() => {
    setModalVisible(true);
    modalOpacity.value = withTiming(1, { duration: 200 });
    modalScale.value = withSpring(1, { damping: 20, stiffness: 280 });
  }, [modalOpacity, modalScale]);

  const closeModal = React.useCallback(() => {
    modalOpacity.value = withTiming(0, { duration: 150 });
    modalScale.value = withTiming(0.95, { duration: 150 }, () => {
      runOnJS(setModalVisible)(false);
    });
  }, [modalOpacity, modalScale]);

  const mediaGesture = useMemo(
    () =>
      createPostGesture({
        liked,
        postId: post._id,
        openModal,
        showBigHeart,
        triggerLikeAnimation,
        onLike,
        mediaScale,
        likeScale,
      }),
    [
      liked,
      post._id,
      openModal,
      showBigHeart,
      triggerLikeAnimation,
      onLike,
      mediaScale,
      likeScale,
    ],
  );

  const caseGesture = useMemo(
    () =>
      createPostGesture({
        liked,
        postId: post._id,
        openModal,
        showBigHeart,
        triggerLikeAnimation,
        onLike,
        mediaScale,
        likeScale,
      }),
    [
      liked,
      post._id,
      openModal,
      showBigHeart,
      triggerLikeAnimation,
      onLike,
      mediaScale,
      likeScale,
    ],
  );

  const handleLongPress = () => {
    hapticTap();
    setOptionsVisible(true);
  };

  const handleDeleteConfirm = () => {
    setOptionsVisible(false);
    Alert.alert(
      "Delete Post",
      "This will permanently delete your post. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete?.(post),
        },
      ],
    );
  };

  const handleReport = () => {
    setOptionsVisible(false);
    hapticTap();
    Alert.alert("Post Reported", "Thank you. Our team will review this post.", [
      { text: "OK" },
    ]);
  };

  const handleShareAction = async () => {
    setOptionsVisible(false);
    hapticTap();
    if (onShare) {
      onShare(post);
      return;
    }
    const author = isAnonymous ? "Anonymous Case" : post.userId.name;
    await Share.share({
      title: "Doctor's App",
      message: `${author}:\n\n${post.content}`,
    });
  };

  const handleSave = () => {
    setOptionsVisible(false);
    hapticTap();
    Alert.alert("Saved", "Post added to your saved items.", [{ text: "OK" }]);
  };

  return (
    <>
      <OptionsSheet
        visible={optionsVisible}
        isOwner={isOwner}
        onDelete={handleDeleteConfirm}
        onReport={handleReport}
        onShare={handleShareAction}
        onSave={handleSave}
        onClose={() => setOptionsVisible(false)}
      />

      {modalVisible && (
        <Modal
          transparent
          visible={modalVisible}
          animationType="none"
          onRequestClose={closeModal}
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={closeModal}>
            <Animated.View
              style={[
                {
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  justifyContent: "center",
                  padding: 16,
                },
                modalBgAnimStyle,
              ]}
            >
              <TouchableWithoutFeedback>
                <Animated.View
                  style={[
                    {
                      backgroundColor: theme.colors.surface,
                      borderRadius: 14,
                      overflow: "hidden",
                      maxHeight: "90%",
                    },
                    modalAnimStyle,
                  ]}
                >
                  <View
                    style={{
                      padding: 12,
                      flexDirection: "row",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Pressable onPress={closeModal} style={{ padding: 6 }}>
                      <Text
                        style={{
                          fontSize: 18,
                          color: theme.colors.textPrimary,
                        }}
                      >
                        ✕
                      </Text>
                    </Pressable>
                  </View>
                  <ScrollView contentContainerStyle={{ padding: 12 }}>
                    {hasMedia ? (
                      <Image
                        source={{ uri: mediaUri }}
                        style={{ width: "100%", height: 420, borderRadius: 12 }}
                        contentFit="cover"
                      />
                    ) : null}
                    <Text
                      style={{
                        marginTop: 12,
                        fontFamily: "Manrope_700Bold",
                        fontSize: 16,
                        color: theme.colors.textPrimary,
                      }}
                    >
                      {isAnonymous ? "Anonymous Case" : post.userId.name}
                    </Text>
                    {post.content ? (
                      <Text
                        style={{
                          marginTop: 8,
                          fontFamily: "Manrope_500Medium",
                          fontSize: 15,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        {post.content}
                      </Text>
                    ) : null}
                    {post.type === "case" && (
                      <>
                        {post.symptoms ? (
                          <>
                            <Text
                              style={{
                                marginTop: 12,
                                fontFamily: "Manrope_700Bold",
                                color: theme.colors.textPrimary,
                              }}
                            >
                              Symptoms
                            </Text>
                            <Text
                              style={{
                                marginTop: 4,
                                color: theme.colors.textSecondary,
                              }}
                            >
                              {post.symptoms}
                            </Text>
                          </>
                        ) : null}
                        {post.observations ? (
                          <>
                            <Text
                              style={{
                                marginTop: 12,
                                fontFamily: "Manrope_700Bold",
                                color: theme.colors.textPrimary,
                              }}
                            >
                              Observations
                            </Text>
                            <Text
                              style={{
                                marginTop: 4,
                                color: theme.colors.textSecondary,
                              }}
                            >
                              {post.observations}
                            </Text>
                          </>
                        ) : null}
                        {post.reportImages && post.reportImages.length > 0 && (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginTop: 12 }}
                          >
                            {post.reportImages.map((img, idx) => (
                              <Image
                                key={idx}
                                source={{ uri: img }}
                                style={{
                                  width: 280,
                                  height: 200,
                                  borderRadius: 10,
                                  marginRight: 10,
                                }}
                                contentFit="cover"
                              />
                            ))}
                          </ScrollView>
                        )}
                      </>
                    )}
                  </ScrollView>
                </Animated.View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      <Pressable
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.cardBorder,
            shadowColor: theme.shadow.card.shadowColor,
            shadowOpacity: theme.shadow.card.shadowOpacity,
            shadowRadius: theme.shadow.card.shadowRadius,
            elevation: theme.shadow.card.elevation,
          },
        ]}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable
            onPress={
              onAuthorPress && !isAnonymous
                ? () => onAuthorPress(post)
                : undefined
            }
            disabled={!onAuthorPress || isAnonymous}
            style={styles.authorRow}
          >
            <Avatar
              name={isAnonymous ? "Anonymous Case" : post.userId.name}
              uri={isAnonymous ? "" : post.userId.profileImage}
              verified={post.userId.isVerified}
              size={44}
            />
            <View style={styles.authorText}>
              <View style={styles.nameRow}>
                <Text
                  style={[
                    styles.authorName,
                    { color: theme.colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {isAnonymous ? "Anonymous Case" : post.userId.name}
                </Text>
                <TypeBadge type={post.type ?? "text"} />
              </View>
              <Text
                style={[
                  styles.authorMeta,
                  { color: theme.colors.textTertiary },
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {post.userId.role}
                </Text>
                {"  ·  "}
                {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </Pressable>

          <Pressable
            hitSlop={14}
            onPress={() => {
              hapticTap();
              setOptionsVisible(true);
            }}
          >
            <MoreHorizontal size={20} color={theme.colors.textTertiary} />
          </Pressable>
        </View>

        {/* ── Text content ────────────────────────────────────────── */}
        {post.content ? (
          <Text
            style={[styles.content, { color: theme.colors.textPrimary }]}
            numberOfLines={hasMedia ? 3 : 5}
          >
            {post.content}
          </Text>
        ) : null}

        {/* ── Media ── hero element ─────────────────────────────── */}
        {hasMedia ? (
          <GestureDetector gesture={mediaGesture}>
            <Animated.View
              style={[mediaAnimStyle, { borderRadius: 14, overflow: "hidden" }]}
            >
              <View style={styles.mediaContainer}>
                <Image
                  source={{ uri: mediaUri }}
                  style={styles.postImage}
                  contentFit="cover"
                  transition={350}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.35)"]}
                  start={{ x: 0, y: 0.4 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                {post.type === "video" && (
                  <View style={styles.videoOverlay}>
                    <View style={styles.playCircle}>
                      <PlayCircle size={52} color="#FFFFFF" />
                    </View>
                  </View>
                )}
                {/* Position-aware double-tap heart */}
                <Animated.View
                  style={[styles.bigHeart, bigHeartAnimStyle]}
                  pointerEvents="none"
                >
                  <Heart
                    size={84}
                    color="#FFFFFF"
                    fill="#FFFFFF"
                    strokeWidth={0}
                  />
                </Animated.View>
              </View>
            </Animated.View>
          </GestureDetector>
        ) : null}

        {/* ── Case block ──────────────────────────────────────────── */}
        {post.type === "case" ? (
          <GestureDetector gesture={caseGesture}>
            <Animated.View
              style={[mediaAnimStyle, { borderRadius: 12, overflow: "hidden" }]}
            >
              <View
                style={[
                  styles.caseBox,
                  {
                    backgroundColor: theme.colors.badgeCaseLight,
                    borderColor: theme.colors.badgeCase + "40",
                  },
                ]}
              >
                <View style={styles.caseTitleRow}>
                  <View
                    style={[
                      styles.caseIconWrap,
                      { backgroundColor: theme.colors.badgeCase + "25" },
                    ]}
                  >
                    <Stethoscope
                      size={11}
                      color={theme.colors.badgeCase}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text
                    style={[
                      styles.caseTitle,
                      { color: theme.colors.badgeCase },
                    ]}
                  >
                    CASE DISCUSSION
                  </Text>
                </View>
                {post.symptoms ? (
                  <View style={styles.caseSection}>
                    <Text
                      style={[
                        styles.caseKey,
                        { color: theme.colors.badgeCase },
                      ]}
                    >
                      SYMPTOMS
                    </Text>
                    <Text
                      style={[
                        styles.caseValue,
                        { color: theme.colors.textPrimary },
                      ]}
                      numberOfLines={2}
                    >
                      {post.symptoms}
                    </Text>
                  </View>
                ) : null}
                {post.observations ? (
                  <View style={styles.caseSection}>
                    <Text
                      style={[
                        styles.caseKey,
                        { color: theme.colors.badgeCase },
                      ]}
                    >
                      OBSERVATIONS
                    </Text>
                    <Text
                      style={[
                        styles.caseValue,
                        { color: theme.colors.textPrimary },
                      ]}
                      numberOfLines={2}
                    >
                      {post.observations}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.caseActions}>
                  {onViewCase && (
                    <Pressable
                      style={[
                        styles.caseOutlineBtn,
                        { borderColor: theme.colors.badgeCase },
                      ]}
                      onPress={() => {
                        hapticTap();
                        onViewCase(post);
                      }}
                    >
                      <Text
                        style={[
                          styles.caseOutlineBtnText,
                          { color: theme.colors.badgeCase },
                        ]}
                      >
                        View Details
                      </Text>
                    </Pressable>
                  )}
                  {onJoinDiscussion && (
                    <Pressable
                      style={[
                        styles.discussBtn,
                        { backgroundColor: theme.colors.badgeCase },
                      ]}
                      onPress={() => {
                        hapticTap();
                        onJoinDiscussion(post);
                      }}
                    >
                      <Users size={14} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.discussBtnText}>Discuss</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        ) : null}

        {/* ── Actions row ─────────────────────────────────────────── */}
        <View
          style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}
        >
          <AnimatedPressable
            onPress={handleLike}
            onPressIn={() => pressIn(likeScale)}
            onPressOut={() => pressOut(likeScale)}
            style={[
              styles.actionBtn,
              likeAnimStyle,
              liked && { backgroundColor: theme.colors.error + "18" },
            ]}
            hitSlop={8}
          >
            <Heart
              size={20}
              color={liked ? theme.colors.error : theme.colors.textSecondary}
              fill={liked ? theme.colors.error : "transparent"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.actionLabel,
                {
                  color: liked
                    ? theme.colors.error
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {post.likes.length > 0
                ? post.likes.length.toLocaleString()
                : "Like"}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              hapticTap();
              onComment(post);
            }}
            onPressIn={() => pressIn(commentScale)}
            onPressOut={() => pressOut(commentScale)}
            style={[styles.actionBtn, commentAnimStyle]}
            hitSlop={8}
          >
            <MessageCircle
              size={20}
              color={theme.colors.textSecondary}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {post.commentCount > 0 ? post.commentCount : "Comment"}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => void handleShareAction()}
            onPressIn={() => pressIn(shareScale)}
            onPressOut={() => pressOut(shareScale)}
            style={[styles.actionBtn, shareAnimStyle]}
            hitSlop={8}
          >
            <Send
              size={19}
              color={theme.colors.textSecondary}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Share
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => hapticTap()}
            onPressIn={() => pressIn(bookmarkScale)}
            onPressOut={() => pressOut(bookmarkScale)}
            style={[styles.actionBtn, bookmarkAnimStyle, styles.bookmarkBtn]}
            hitSlop={8}
          >
            <Bookmark
              size={20}
              color={theme.colors.textSecondary}
              strokeWidth={2}
            />
          </AnimatedPressable>
        </View>
      </Pressable>
    </>
  );
}

export const PostCard = memo(PostCardBase);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  authorText: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  authorName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15.5,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  authorMeta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12.5,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  roleText: { fontFamily: "Manrope_700Bold", textTransform: "capitalize" },
  content: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 14,
    paddingBottom: 12,
    letterSpacing: 0.1,
  },
  mediaContainer: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    overflow: "hidden",
    height: 240,
  },
  postImage: { width: "100%", height: "100%" },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  bigHeart: {
    position: "absolute",
    width: 84,
    height: 84,
  },
  // ── Case block
  caseBox: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 12,
    padding: 13,
    gap: 10,
  },
  caseTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  caseIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  caseTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#7C3AED",
    textTransform: "uppercase",
  },
  caseSection: { gap: 3 },
  caseKey: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: "#9333EA",
    textTransform: "uppercase",
  },
  caseValue: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13.5,
    lineHeight: 20,
  },
  caseActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  caseOutlineBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7C3AED",
    alignItems: "center",
  },
  caseOutlineBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#7C3AED",
  },
  discussBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#7C3AED",
    paddingVertical: 9,
    borderRadius: 8,
  },
  discussBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  // ── Actions
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnLiked: {},
  bookmarkBtn: { marginLeft: "auto" },
  actionLabel: { fontFamily: "Manrope_700Bold", fontSize: 13 },
});

const optStyles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    paddingTop: 12,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  optionSub: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12.5,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 6,
  },
  cancelBtn: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
  },
});
