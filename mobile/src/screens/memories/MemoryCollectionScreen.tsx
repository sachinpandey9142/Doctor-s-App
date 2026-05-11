import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Image as ImageIcon,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Settings2,
  Trash2,
  Upload,
  Video as VideoIcon,
  X,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import {
  createMemoryItemRequest,
  deleteMemoryCollectionRequest,
  deleteMemoryItemRequest,
  getMemoryCollectionItemsRequest,
  getMemoryCollectionsRequest,
  reorderMemoryItemsRequest,
  updateMemoryCollectionRequest,
  updateMemoryItemRequest,
} from "@/services/api/memoryApi";
import { uploadMediaRequest } from "@/services/api/uploadApi";
import type { RootStackParamList } from "@/navigation/types";
import type { MemoryCollection, MemoryItem } from "@/types/models";
import { useAuthStore } from "@/store/authStore";
import { hapticSuccess, hapticTap, hapticWarning } from "@/utils/haptics";

type MemoryCollectionRoute = RouteProp<RootStackParamList, "MemoryCollection">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_DURATION = 5000;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export function MemoryCollectionScreen() {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<MemoryCollectionRoute>();
  const authUser = useAuthStore((state) => state.user);

  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionTitle, setCollectionTitle] = useState(
    route.params.title || "Memory Collection",
  );
  const [collectionVisibility, setCollectionVisibility] =
    useState<MemoryCollection["visibility"]>("public");
  const [collectionCover, setCollectionCover] = useState("");
  const [editingCollectionVisible, setEditingCollectionVisible] =
    useState(false);
  const [savingCollection, setSavingCollection] = useState(false);
  const [uploadingItem, setUploadingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MemoryItem | null>(null);
  const [editCaptionVisible, setEditCaptionVisible] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;

  const isOwner = Boolean(
    authUser?._id &&
    route.params.userId &&
    String(route.params.userId) === String(authUser._id),
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const nextItems = await getMemoryCollectionItemsRequest(
        route.params.collectionId,
      );
      setItems(nextItems);
      setCollectionCover((current) => current || nextItems[0]?.mediaUrl || "");
      if (route.params.title) {
        setCollectionTitle(route.params.title);
      }

      if (isOwner && authUser?._id) {
        const collections = await getMemoryCollectionsRequest(authUser._id);
        const currentCollection = collections.find(
          (collection) => collection._id === route.params.collectionId,
        );

        if (currentCollection) {
          setCollectionTitle(currentCollection.title);
          setCollectionVisibility(currentCollection.visibility);
          setCollectionCover(
            currentCollection.coverImage || nextItems[0]?.mediaUrl || "",
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [authUser?._id, isOwner, route.params.collectionId, route.params.title]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const canEdit = isOwner;

  const activeItem = useMemo(
    () => (viewerIndex === null ? null : items[viewerIndex] || null),
    [items, viewerIndex],
  );

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setPaused(false);
    setImageProgress(0);
    setVideoPosition(0);
    setVideoDuration(0);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
    setPaused(false);
    translateY.setValue(0);
  }, [translateY]);

  const goNext = useCallback(() => {
    if (viewerIndex === null) return;
    if (viewerIndex < items.length - 1) {
      setViewerIndex(viewerIndex + 1);
      return;
    }
    closeViewer();
  }, [closeViewer, items.length, viewerIndex]);

  const goPrevious = useCallback(() => {
    if (viewerIndex === null) return;
    if (viewerIndex <= 0) return;
    setViewerIndex(viewerIndex - 1);
  }, [viewerIndex]);

  const pickMedia = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      hapticWarning();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.88,
      allowsEditing: false,
      videoMaxDuration: 90,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const mediaType = asset.type === "video" ? "video" : "image";

    setUploadingItem(true);
    try {
      const url = await uploadMediaRequest(asset.uri);
      await createMemoryItemRequest(route.params.collectionId, {
        mediaUrl: url,
        mediaType,
        caption: "",
      });
      await loadItems();
      hapticSuccess();
    } catch (_error) {
      hapticWarning();
    } finally {
      setUploadingItem(false);
    }
  }, [loadItems, route.params.collectionId]);

  const openCollectionEditor = useCallback(() => {
    setCollectionTitle(route.params.title || collectionTitle);
    setEditingCollectionVisible(true);
  }, [collectionTitle, route.params.title]);

  const handleSaveCollection = useCallback(async () => {
    const title = collectionTitle.trim();
    if (!title) {
      hapticWarning();
      return;
    }

    setSavingCollection(true);
    try {
      const updated = await updateMemoryCollectionRequest(
        route.params.collectionId,
        {
          title,
          visibility: collectionVisibility,
          coverImage: collectionCover || undefined,
        },
      );
      setCollectionTitle(updated.title);
      setCollectionVisibility(updated.visibility);
      setCollectionCover(updated.coverImage || collectionCover);
      setEditingCollectionVisible(false);
      hapticSuccess();
    } catch (_error) {
      hapticWarning();
    } finally {
      setSavingCollection(false);
    }
  }, [
    collectionCover,
    collectionTitle,
    collectionVisibility,
    route.params.collectionId,
  ]);

  const openItemEditor = useCallback((item: MemoryItem) => {
    setSelectedItem(item);
    setEditCaption(item.caption || "");
    setEditCaptionVisible(true);
  }, []);

  const handleSaveCaption = useCallback(async () => {
    if (!selectedItem) return;

    try {
      const updated = await updateMemoryItemRequest(selectedItem._id, {
        caption: editCaption.trim(),
      });
      setItems((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
      setEditCaptionVisible(false);
      setSelectedItem(null);
      hapticSuccess();
    } catch (_error) {
      hapticWarning();
    }
  }, [editCaption, selectedItem]);

  const moveItem = useCallback(
    async (item: MemoryItem, direction: -1 | 1) => {
      const index = items.findIndex((entry) => entry._id === item._id);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= items.length) {
        return;
      }

      const nextIds = [...items];
      const [moved] = nextIds.splice(index, 1);
      nextIds.splice(targetIndex, 0, moved);

      setItems(
        await reorderMemoryItemsRequest(
          route.params.collectionId,
          nextIds.map((entry) => entry._id),
        ),
      );
      hapticTap();
    },
    [items, route.params.collectionId],
  );

  const setCoverFromItem = useCallback(
    async (item: MemoryItem) => {
      const updated = await updateMemoryCollectionRequest(
        route.params.collectionId,
        {
          coverImage: item.mediaUrl,
        },
      );
      setCollectionCover(updated.coverImage || item.mediaUrl);
      hapticSuccess();
    },
    [route.params.collectionId],
  );

  const handleDeleteCollection = useCallback(() => {
    Alert.alert(
      "Delete collection",
      "This will permanently remove the collection and all saved items.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await deleteMemoryCollectionRequest(route.params.collectionId);
              navigation.goBack();
            })();
          },
        },
      ],
    );
  }, [navigation, route.params.collectionId]);

  const renderItem = ({ item, index }: { item: MemoryItem; index: number }) => {
    const thumbnail = item.mediaUrl;

    return (
      <Pressable
        onPress={() => openViewer(index)}
        onLongPress={() => {
          if (!canEdit) return;
          Alert.alert("Memory options", item.caption || "Saved memory", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Edit caption",
              onPress: () => openItemEditor(item),
            },
            {
              text: "Set as cover",
              onPress: () => void setCoverFromItem(item),
            },
            {
              text: "Move earlier",
              onPress: () => void moveItem(item, -1),
            },
            {
              text: "Move later",
              onPress: () => void moveItem(item, 1),
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                void (async () => {
                  await deleteMemoryItemRequest(item._id);
                  await loadItems();
                })();
              },
            },
          ]);
        }}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderLight,
          },
        ]}
      >
        <View style={styles.mediaWrap}>
          <Image
            source={{ uri: thumbnail }}
            style={styles.media}
            contentFit="cover"
            transition={160}
          />
          <LinearGradient
            colors={["rgba(2,6,23,0.0)", "rgba(2,6,23,0.42)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.badgeRow}>
            {item.mediaType === "video" ? (
              <View style={styles.typeBadge}>
                <VideoIcon size={10} color="#FFFFFF" />
                <Text style={styles.typeBadgeText}>Video</Text>
              </View>
            ) : (
              <View style={styles.typeBadge}>
                <ImageIcon size={10} color="#FFFFFF" />
                <Text style={styles.typeBadgeText}>Photo</Text>
              </View>
            )}
            {canEdit ? (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Remove memory",
                    "Delete this saved item from the collection?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          void (async () => {
                            await deleteMemoryItemRequest(item._id);
                            await loadItems();
                          })();
                        },
                      },
                    ],
                  );
                }}
                style={styles.deleteBtn}
                hitSlop={8}
              >
                <Trash2 size={14} color={theme.colors.textInverted} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text
            style={[styles.caption, { color: theme.colors.textPrimary }]}
            numberOfLines={2}
          >
            {item.caption || "Saved memory"}
          </Text>
          <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </Pressable>
    );
  };

  useEffect(() => {
    if (viewerIndex === null) {
      setPaused(false);
      setImageProgress(0);
      setVideoPosition(0);
      setVideoDuration(0);
      translateY.setValue(0);
    }
  }, [translateY, viewerIndex]);

  useEffect(() => {
    if (!activeItem || paused || activeItem.mediaType === "video") {
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
  }, [activeItem, goNext, paused]);

  const currentProgress = useMemo(() => {
    if (!activeItem) return 0;
    if (activeItem.mediaType === "video") {
      return videoDuration > 0 ? Math.min(videoPosition / videoDuration, 1) : 0;
    }
    return imageProgress;
  }, [activeItem, imageProgress, videoDuration, videoPosition]);

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
            closeViewer();
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
    [closeViewer, translateY],
  );

  const viewerTap = useCallback(
    (locationX: number) => {
      if (locationX > SCREEN_WIDTH / 2) {
        hapticTap();
        goNext();
        return;
      }

      hapticTap();
      goPrevious();
    },
    [goNext, goPrevious],
  );

  const headerTitle =
    collectionTitle || route.params.title || "Memory Collection";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.borderLight,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <ArrowLeft size={18} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text
            style={[styles.title, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {items.length} saved item{items.length === 1 ? "" : "s"}
          </Text>
        </View>
        {canEdit ? (
          <>
            <Pressable
              onPress={openCollectionEditor}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Edit3 size={16} color={theme.colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => void pickMedia()}
              style={styles.iconBtn}
              hitSlop={8}
              disabled={uploadingItem}
            >
              {uploadingItem ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Plus size={16} color={theme.colors.primary} />
              )}
            </Pressable>
          </>
        ) : null}
        {canEdit ? (
          <Pressable
            onPress={handleDeleteCollection}
            style={styles.moreBtn}
            hitSlop={8}
          >
            <MoreHorizontal size={18} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            >
              <View style={styles.heroMediaWrap}>
                {collectionCover || items[0]?.mediaUrl ? (
                  <Image
                    source={{ uri: collectionCover || items[0]?.mediaUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={180}
                  />
                ) : (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  />
                )}
                <LinearGradient
                  colors={["rgba(2,6,23,0.02)", "rgba(2,6,23,0.5)"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.heroPill}>
                  <Text
                    style={[
                      styles.heroPillText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {collectionVisibility === "private"
                      ? "Private"
                      : collectionVisibility === "followers"
                        ? "Followers only"
                        : "Public"}
                  </Text>
                </View>
              </View>
              <View style={styles.heroMeta}>
                <View style={styles.heroMetaRow}>
                  <Text
                    style={[
                      styles.heroTitle,
                      { color: theme.colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {headerTitle}
                  </Text>
                  <Text
                    style={[styles.heroCount, { color: theme.colors.primary }]}
                  >
                    {items.length}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.heroBody,
                    { color: theme.colors.textSecondary },
                  ]}
                  numberOfLines={3}
                >
                  Build a persistent highlight reel for conferences, surgeries,
                  research updates, and clinical milestones.
                </Text>
                {canEdit ? (
                  <Pressable
                    onPress={() => void pickMedia()}
                    style={[
                      styles.uploadBtn,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    {uploadingItem ? (
                      <ActivityIndicator color={theme.colors.textInverted} />
                    ) : (
                      <>
                        <Upload size={14} color={theme.colors.textInverted} />
                        <Text
                          style={[
                            styles.uploadText,
                            { color: theme.colors.textInverted },
                          ]}
                        >
                          Add memory
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : null}

            {!loading && items.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <View style={styles.emptyCopy}>
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    No memories yet
                  </Text>
                  <Text
                    style={[
                      styles.emptyBody,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Save a story or upload a photo/video to start building this
                    collection.
                  </Text>
                </View>
                {canEdit ? (
                  <Pressable
                    onPress={() => void pickMedia()}
                    style={[
                      styles.emptyAction,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.emptyActionText,
                        { color: theme.colors.textInverted },
                      ]}
                    >
                      Upload
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={null}
      />

      <Modal
        visible={editingCollectionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCollectionVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
              >
                Edit collection
              </Text>
              <Pressable
                onPress={() => setEditingCollectionVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={16} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 14 }}>
              <View
                style={[
                  styles.inputCard,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.inputLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Collection name
                </Text>
                <TextInput
                  value={collectionTitle}
                  onChangeText={setCollectionTitle}
                  placeholder="Conferences, Research, Surgeries..."
                  placeholderTextColor={theme.colors.textTertiary}
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                />
              </View>
              <View
                style={[
                  styles.segmentWrap,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {(["public", "followers", "private"] as const).map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setCollectionVisibility(item)}
                    style={[
                      styles.segment,
                      collectionVisibility === item && {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color:
                            collectionVisibility === item
                              ? theme.colors.textInverted
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {item === "public"
                        ? "Public"
                        : item === "followers"
                          ? "Followers"
                          : "Private"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditingCollectionVisible(false)}
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
                onPress={() => void handleSaveCollection()}
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                {savingCollection ? (
                  <ActivityIndicator color={theme.colors.textInverted} />
                ) : (
                  <Text
                    style={[
                      styles.modalBtnText,
                      { color: theme.colors.textInverted },
                    ]}
                  >
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editCaptionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditCaptionVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
              >
                Edit caption
              </Text>
              <Pressable
                onPress={() => setEditCaptionVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={16} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View
              style={[
                styles.inputCard,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
            >
              <TextInput
                value={editCaption}
                onChangeText={setEditCaption}
                placeholder="Add a note for this memory"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                style={[
                  styles.captionInput,
                  { color: theme.colors.textPrimary },
                ]}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditCaptionVisible(false)}
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
                onPress={() => void handleSaveCaption()}
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
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={viewerIndex !== null && !!activeItem}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <Animated.View
          style={[styles.viewerRoot, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {activeItem?.mediaType === "video" ? (
            <Video
              key={activeItem._id}
              source={{ uri: activeItem.mediaUrl }}
              style={styles.viewerMedia}
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
              source={{ uri: activeItem?.mediaUrl }}
              style={styles.viewerMedia}
              contentFit="cover"
            />
          )}

          <LinearGradient
            colors={["rgba(2,6,23,0.92)", "rgba(2,6,23,0.14)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.viewerOverlay}
          >
            <View style={styles.progressRow}>
              {items.map((item, index) => {
                const progress =
                  index < (viewerIndex ?? 0)
                    ? 1
                    : index > (viewerIndex ?? 0)
                      ? 0
                      : currentProgress;
                return (
                  <View key={item._id} style={styles.progressTrack}>
                    <View style={[styles.progressFill, { flex: progress }]} />
                    <View style={{ flex: Math.max(1 - progress, 0) }} />
                  </View>
                );
              })}
            </View>

            <View style={styles.viewerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewerTitle} numberOfLines={1}>
                  {headerTitle}
                </Text>
                <Text style={styles.viewerMeta}>
                  {formatDate(
                    activeItem?.createdAt || new Date().toISOString(),
                  )}
                </Text>
              </View>
              <Pressable onPress={closeViewer} style={styles.viewerCloseBtn}>
                <X size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </LinearGradient>

          <View style={styles.viewerTapLayer} pointerEvents="box-none">
            <Pressable
              style={styles.viewerTapZone}
              onPress={() => viewerTap(SCREEN_WIDTH * 0.25)}
              onLongPress={() => setPaused(true)}
              onPressOut={() => setPaused(false)}
              delayLongPress={220}
            />
            <Pressable
              style={styles.viewerTapZone}
              onPress={() => viewerTap(SCREEN_WIDTH * 0.75)}
              onLongPress={() => setPaused(true)}
              onPressOut={() => setPaused(false)}
              delayLongPress={220}
            />
          </View>

          <View style={styles.viewerBottom} pointerEvents="none">
            <View style={styles.pausePill}>
              {paused ? (
                <Play size={14} color="#FFFFFF" />
              ) : (
                <Pause size={14} color="#FFFFFF" />
              )}
              <Text style={styles.pauseText}>
                {paused
                  ? "Paused"
                  : activeItem?.mediaType === "video"
                    ? "Playing video"
                    : "Memory"}
              </Text>
            </View>
            {activeItem?.caption ? (
              <Text style={styles.viewerCaption}>{activeItem.caption}</Text>
            ) : null}
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  moreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1 },
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 },
  subtitle: { marginTop: 2, fontFamily: "Manrope_500Medium", fontSize: 12 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listHeader: {
    gap: 14,
    marginBottom: 16,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  heroMediaWrap: {
    height: 152,
    position: "relative",
    overflow: "hidden",
  },
  heroPill: {
    position: "absolute",
    top: 14,
    left: 14,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  heroPillText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
  heroMeta: {
    padding: 16,
    gap: 10,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTitle: {
    flex: 1,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 19,
    letterSpacing: -0.2,
  },
  heroCount: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  heroBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  uploadBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  listContent: { padding: 16, gap: 12 },
  column: { gap: 12 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  mediaWrap: {
    aspectRatio: 1,
    position: "relative",
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  badgeRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  typeBadge: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15,23,42,0.68)",
  },
  typeBadgeText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
  },
  metaRow: {
    padding: 12,
    gap: 4,
  },
  caption: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    lineHeight: 18,
  },
  date: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyCopy: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
  },
  emptyBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  emptyAction: {
    minWidth: 92,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  emptyActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.58)",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    borderRadius: 24,
    padding: 16,
    gap: 14,
    maxHeight: SCREEN_HEIGHT * 0.78,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.16)",
  },
  inputCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  inputLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
  },
  captionInput: {
    minHeight: 96,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    textAlignVertical: "top",
  },
  segmentWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modalBtnPrimary: {
    borderColor: "transparent",
  },
  modalBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  viewerRoot: {
    flex: 1,
    backgroundColor: "#020617",
  },
  viewerMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  viewerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 999,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  progressFill: {
    backgroundColor: "#FFFFFF",
  },
  viewerHeader: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  viewerTitle: {
    color: "#FFFFFF",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  viewerMeta: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
  },
  viewerCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(15,23,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerTapLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  viewerTapZone: {
    flex: 1,
  },
  viewerBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    gap: 10,
  },
  pausePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.72)",
  },
  pauseText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
  },
  viewerCaption: {
    color: "#FFFFFF",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
});
