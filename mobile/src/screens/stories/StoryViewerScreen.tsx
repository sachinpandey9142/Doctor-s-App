import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { ResizeMode, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { ArrowLeft, Pause, Play, X } from "lucide-react-native";

import { Avatar } from "@/components/common/Avatar";
import type { RootStackParamList } from "@/navigation/types";
import { useStoryStore } from "@/store/storyStore";
import { useAuthStore } from "@/store/authStore";
import {
  createMemoryCollectionRequest,
  getMemoryCollectionsRequest,
  saveStoryToMemoryRequest,
} from "@/services/api/memoryApi";
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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<StoryViewerRoute>();
  const authUser = useAuthStore((state) => state.user);

  const groups = useStoryStore((state) => state.groups);
  const fetchStoryFeed = useStoryStore((state) => state.fetchStoryFeed);
  const markStoryViewed = useStoryStore((state) => state.markStoryViewed);

  const group = useMemo(
    () => groups.find((item) => item.user._id === route.params.userId),
    [groups, route.params.userId],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [saveVisible, setSaveVisible] = useState(false);
  const [memoryCollections, setMemoryCollections] = useState<
    Array<{ _id: string; title: string }>
  >([]);
  const [memoryTitle, setMemoryTitle] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [savingMemory, setSavingMemory] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const viewedIdsRef = useRef(new Set<string>()).current;

  useEffect(() => {
    if (!group) {
      void fetchStoryFeed();
      return;
    }

    const initialIndex = route.params.storyId
      ? Math.max(
          group.stories.findIndex(
            (story) => story._id === route.params.storyId,
          ),
          0,
        )
      : 0;

    setActiveIndex(initialIndex);
  }, [fetchStoryFeed, group, route.params.storyId]);

  const activeStory = group?.stories[activeIndex];
  const canSaveStory = Boolean(
    activeStory &&
    authUser?._id &&
    String(activeStory.userId._id || activeStory.userId) ===
      String(authUser._id),
  );

  const openSaveModal = useCallback(async () => {
    if (!authUser?._id || !activeStory) return;

    const collections = await getMemoryCollectionsRequest(authUser._id);
    setMemoryCollections(
      collections.map((collection) => ({
        _id: collection._id,
        title: collection.title,
      })),
    );
    setSelectedCollectionId(collections[0]?._id || "");
    setMemoryTitle("");
    setSaveVisible(true);
  }, [activeStory, authUser?._id]);

  const handleSaveStory = useCallback(async () => {
    if (!activeStory) return;

    setSavingMemory(true);
    try {
      let collectionId = selectedCollectionId;
      if (!collectionId) {
        const title = memoryTitle.trim();
        if (!title) return;
        const created = await createMemoryCollectionRequest({
          title,
          visibility: "public",
        });
        collectionId = created._id;
      }

      await saveStoryToMemoryRequest(collectionId, activeStory._id);
      setSaveVisible(false);
      setMemoryTitle("");
    } finally {
      setSavingMemory(false);
    }
  }, [activeStory, memoryTitle, selectedCollectionId]);

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

  const onTap = useCallback(
    (event: any) => {
      const x = event?.nativeEvent?.locationX ?? 0;
      if (x > SCREEN_WIDTH / 2) {
        hapticTap();
        goNext();
        return;
      }

      hapticTap();
      goPrevious();
    },
    [goNext, goPrevious],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 6,
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
            friction: 12,
          }).start();
        },
      }),
    [goBack, translateY],
  );

  if (!group || !activeStory) {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.colors.background }]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: "#020617", transform: [{ translateY }] },
      ]}
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
        <Image
          source={{ uri: activeStory.mediaUrl }}
          style={styles.media}
          contentFit="cover"
        />
      )}

      <LinearGradient
        colors={["rgba(2,6,23,0.92)", "rgba(2,6,23,0.14)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topOverlay}
      >
        <View style={styles.progressRow}>
          {group.stories.map((story, index) => {
            const progress =
              index < activeIndex
                ? 1
                : index > activeIndex
                  ? 0
                  : currentProgress;
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
            <Avatar
              name={group.user.name}
              uri={group.user.profileImage}
              size={38}
              verified={group.user.isVerified}
            />
            <View>
              <Text style={styles.userName}>{group.user.name}</Text>
              <Text style={styles.metaText}>
                {formatRelativeTime(activeStory.createdAt)}
              </Text>
            </View>
          </View>

          <Pressable onPress={goBack} style={styles.closeButton}>
            <X size={18} color="#FFFFFF" />
          </Pressable>
          {canSaveStory ? (
            <Pressable
              onPress={() => void openSaveModal()}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          ) : null}
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
        {activeStory.caption ? (
          <Text style={styles.caption}>{activeStory.caption}</Text>
        ) : null}
      </View>

      <View style={styles.pauseHint} pointerEvents="none">
        <View style={[styles.pausePill, { opacity: paused ? 1 : 0.8 }]}>
          {paused ? (
            <Play size={14} color="#FFFFFF" />
          ) : (
            <Pause size={14} color="#FFFFFF" />
          )}
          <Text style={styles.pauseText}>
            {paused
              ? "Paused"
              : activeStory.type === "video"
                ? "Playing video"
                : "Story"}
          </Text>
        </View>
      </View>

      <Modal
        visible={saveVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
            >
              Save to memory
            </Text>
            {memoryCollections.length > 0 ? (
              <View style={styles.collectionList}>
                {memoryCollections.map((collection) => (
                  <Pressable
                    key={collection._id}
                    onPress={() => setSelectedCollectionId(collection._id)}
                    style={[
                      styles.collectionRow,
                      {
                        borderColor:
                          selectedCollectionId === collection._id
                            ? theme.colors.primary
                            : theme.colors.border,
                        backgroundColor:
                          selectedCollectionId === collection._id
                            ? theme.colors.primaryLight
                            : theme.colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.collectionText,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {collection.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <TextInput
              value={memoryTitle}
              onChangeText={setMemoryTitle}
              placeholder="Create a new collection"
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                styles.modalInput,
                {
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setSaveVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.colors.border }]}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSaveStory()}
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: theme.colors.textInverted },
                  ]}
                >
                  {savingMemory ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
  },
  progressFill: {
    backgroundColor: "#FFFFFF",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Manrope_700Bold",
  },
  metaText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    fontFamily: "Manrope_500Medium",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  saveButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.8)",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Manrope_700Bold",
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    top: 118,
    flexDirection: "row",
  },
  leftTapZone: {
    flex: 1,
  },
  rightTapZone: {
    flex: 1,
  },
  captionWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 42,
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
    overflow: "hidden",
  },
  pauseHint: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 82,
    alignItems: "center",
  },
  pausePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.48)",
  },
  pauseText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Manrope_600SemiBold",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    padding: 20,
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    marginBottom: 12,
  },
  collectionList: {
    gap: 10,
    marginBottom: 12,
  },
  collectionRow: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  collectionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnPrimary: {
    borderWidth: 0,
  },
  modalBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
});
