import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { ResizeMode, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { ArrowLeft, Pause, Play, X } from "lucide-react-native";

import { Avatar } from "@/components/common/Avatar";
import type { RootStackParamList } from "@/navigation/types";
import { useStoryStore } from "@/store/storyStore";
import type { Story } from "@/types/models";
import { hapticTap } from "@/utils/haptics";

const IMAGE_DURATION = 5000;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type StoryViewerRoute = RouteProp<RootStackParamList, "StoryViewer">;

const formatRelativeTime = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
};

export function StoryViewerScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<StoryViewerRoute>();

  const groups = useStoryStore((state) => state.groups);
  const fetchStoryFeed = useStoryStore((state) => state.fetchStoryFeed);
  const markStoryViewed = useStoryStore((state) => state.markStoryViewed);

  const group = useMemo(() => groups.find((item) => item.user._id === route.params.userId), [groups, route.params.userId]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const viewedIdsRef = useRef(new Set<string>()).current;

  useEffect(() => {
    if (!group) {
      void fetchStoryFeed();
      return;
    }

    const initialIndex = route.params.storyId
      ? Math.max(group.stories.findIndex((story) => story._id === route.params.storyId), 0)
      : 0;

    setActiveIndex(initialIndex);
  }, [fetchStoryFeed, group, route.params.storyId]);

  const activeStory = group?.stories[activeIndex];

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const goNext = useCallback(() => {
    if (!group) return;

    if (activeIndex < group.stories.length - 1) {
      setActiveIndex((value) => value + 1);
      return;
    }

    goBack();
  }, [activeIndex, goBack, group]);

  const goPrevious = useCallback(() => {
    setActiveIndex((value) => {
      if (value <= 0) return value;
      return value - 1;
    });
  }, []);

  useEffect(() => {
    setPaused(false);
    setImageProgress(0);
    setVideoPosition(0);
    setVideoDuration(0);
  }, [activeIndex]);

  useEffect(() => {
    if (!activeStory || viewedIdsRef.has(activeStory._id)) {
      return;
    }

    viewedIdsRef.add(activeStory._id);
    void markStoryViewed(activeStory._id);
  }, [activeStory, markStoryViewed, viewedIdsRef]);

  useEffect(() => {
    if (!activeStory || paused || activeStory.type === "video") {
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / IMAGE_DURATION, 1);
      setImageProgress(progress);

      if (progress >= 1) {
        clearInterval(timer);
        goNext();
      }
    }, 50);

    return () => clearInterval(timer);
  }, [activeStory, goNext, paused]);

  const currentProgress = useMemo(() => {
    if (!activeStory) return 0;
    if (activeStory.type === "video") {
      return videoDuration > 0 ? Math.min(videoPosition / videoDuration, 1) : 0;
    }
    return imageProgress;
  }, [activeStory, imageProgress, videoDuration, videoPosition]);

  const onTap = useCallback((event: any) => {
    const x = event?.nativeEvent?.locationX ?? 0;
    if (x > SCREEN_WIDTH / 2) {
      hapticTap();
      goNext();
      return;
    }

    hapticTap();
    goPrevious();
  }, [goNext, goPrevious]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 110) {
        goBack();
        return;
      }

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12
      }).start();
    }
  }), [goBack, translateY]);

  if (!group || !activeStory) {
    return <View style={[styles.loading, { backgroundColor: theme.colors.background }]} />;
  }

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: "#020617", transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      {activeStory.type === "video" ? (
        <Video
          key={activeStory._id}
          source={{ uri: activeStory.mediaUrl }}
          style={styles.media}
          resizeMode={ResizeMode.COVER}
          shouldPlay={!paused}
          isLooping={false}
          onPlaybackStatusUpdate={(status) => {
            if (!status.isLoaded) return;
            setVideoPosition(status.positionMillis ?? 0);
            setVideoDuration(status.durationMillis ?? 0);

            if (status.didJustFinish) {
              goNext();
            }
          }}
        />
      ) : (
        <Image source={{ uri: activeStory.mediaUrl }} style={styles.media} contentFit="cover" />
      )}

      <LinearGradient colors={["rgba(2,6,23,0.92)", "rgba(2,6,23,0.14)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.topOverlay}>
        <View style={styles.progressRow}>
          {group.stories.map((story, index) => {
            const progress = index < activeIndex ? 1 : index > activeIndex ? 0 : currentProgress;
            return (
              <View key={story._id} style={styles.progressTrack}>
                <View style={[styles.progressFill, { flex: progress }]} />
                <View style={{ flex: Math.max(1 - progress, 0) }} />
              </View>
            );
          })}
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerUser}>
            <Avatar name={group.user.name} uri={group.user.profileImage} size={38} verified={group.user.isVerified} />
            <View>
              <Text style={styles.userName}>{group.user.name}</Text>
              <Text style={styles.metaText}>{formatRelativeTime(activeStory.createdAt)}</Text>
            </View>
          </View>

          <Pressable onPress={goBack} style={styles.closeButton}>
            <X size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.tapLayer} pointerEvents="box-none">
        <Pressable
          style={styles.leftTapZone}
          onPress={() => {
            hapticTap();
            goPrevious();
          }}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={220}
        />
        <Pressable
          style={styles.rightTapZone}
          onPress={() => {
            hapticTap();
            goNext();
          }}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          delayLongPress={220}
        />
      </View>

      <View style={styles.captionWrap} pointerEvents="none">
        {activeStory.caption ? <Text style={styles.caption}>{activeStory.caption}</Text> : null}
      </View>

      <View style={styles.pauseHint} pointerEvents="none">
        <View style={[styles.pausePill, { opacity: paused ? 1 : 0.8 }]}>
          {paused ? <Play size={14} color="#FFFFFF" /> : <Pause size={14} color="#FFFFFF" />}
          <Text style={styles.pauseText}>{paused ? "Paused" : activeStory.type === "video" ? "Playing video" : "Story"}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1
  },
  container: {
    flex: 1
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.18)",
    flexDirection: "row"
  },
  progressFill: {
    backgroundColor: "#FFFFFF"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Manrope_700Bold"
  },
  metaText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    fontFamily: "Manrope_500Medium"
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.55)"
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    top: 118,
    flexDirection: "row"
  },
  leftTapZone: {
    flex: 1
  },
  rightTapZone: {
    flex: 1
  },
  captionWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 42
  },
  caption: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Manrope_600SemiBold",
    backgroundColor: "rgba(2,6,23,0.34)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: "hidden"
  },
  pauseHint: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 82,
    alignItems: "center"
  },
  pausePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.48)"
  },
  pauseText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Manrope_600SemiBold"
  }
});