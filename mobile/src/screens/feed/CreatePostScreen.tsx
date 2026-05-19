import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  ArrowLeft,
  AtSign,
  BadgeCheck,
  Bold,
  Bookmark,
  ChevronDown,
  CirclePlay,
  Globe,
  Hash,
  ImageIcon,
  Inbox,
  Lock,
  Pencil,
  Send,
  Smile,
  Sparkles,
  Search,
  X,
} from "lucide-react-native";

import { Avatar } from "@/components/common/Avatar";
import { GlassCard } from "@/components/common/GlassCard";
import { useAuthStore } from "@/store/authStore";
import { useFeedStore } from "@/store/feedStore";
import { extractErrorMessage, useToastStore } from "@/store/toastStore";
import { uploadMediaRequest } from "@/services/api/uploadApi";
import {
  getSuggestedUsersRequest,
  searchUsersRequest,
} from "@/services/api/userApi";
import { hapticSuccess, hapticTap, hapticWarning } from "@/utils/haptics";
import type { User } from "@/types/models";

type PostTag = "text" | "image" | "video" | "case";
type VisibilityOption = "public" | "connections" | "private";
type ModalKind = "visibility" | "emoji" | "mention" | "hashtag" | null;

interface MediaDraft {
  localUri: string;
  remoteUrl: string;
}

interface DraftState {
  content: string;
  postType: PostTag;
  visibility: VisibilityOption;
  imageMedia: MediaDraft | null;
  videoMedia: MediaDraft | null;
  caseSymptoms: string;
  caseObservations: string;
  boldMode: boolean;
}

const tags: PostTag[] = ["text", "image", "video", "case"];
const MAX_CONTENT_LENGTH = 5000;
const DRAFT_PREFIX = "doctors-app-create-post-draft";

const VISIBILITY_OPTIONS: Array<{
  value: VisibilityOption;
  label: string;
  description: string;
}> = [
  { value: "public", label: "Public", description: "Visible to everyone" },
  {
    value: "connections",
    label: "Connections only",
    description: "Visible to your network",
  },
  { value: "private", label: "Private", description: "Visible only to you" },
];

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "😊",
  "😍",
  "🤝",
  "💡",
  "🩺",
  "📚",
  "🧠",
  "🫀",
  "🫁",
  "💊",
  "🔬",
  "⭐",
  "✨",
  "👏",
  "🙏",
  "⚕️",
  "🩹",
];

const HASHTAG_SUGGESTIONS = [
  "#Cardiology",
  "#CaseDiscussion",
  "#MedicalEducation",
  "#Diagnostics",
  "#Surgery",
  "#Radiology",
  "#PublicHealth",
  "#Pharmacology",
  "#InternalMedicine",
  "#Nursing",
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EMPTY_MEDIA: MediaDraft | null = null;

const clampText = (text: string) => text.slice(0, MAX_CONTENT_LENGTH);

export function CreatePostScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const authUser = useAuthStore((state) => state.user);
  const createPost = useFeedStore((state) => state.createPost);
  const showToast = useToastStore((state) => state.showToast);

  const [content, setContent] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [postType, setPostType] = useState<PostTag>("text");
  const [visibility, setVisibility] = useState<VisibilityOption>("public");
  const [imageMedia, setImageMedia] = useState<MediaDraft | null>(EMPTY_MEDIA);
  const [videoMedia, setVideoMedia] = useState<MediaDraft | null>(EMPTY_MEDIA);
  const [caseSymptoms, setCaseSymptoms] = useState("");
  const [caseObservations, setCaseObservations] = useState("");
  const [boldMode, setBoldMode] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionTriggerPosition, setMentionTriggerPosition] = useState<
    number | null
  >(null);

  const buttonScale = useSharedValue(1);

  const draftStorageKey = useMemo(
    () => `${DRAFT_PREFIX}:${authUser?._id ?? "guest"}`,
    [authUser?._id],
  );

  const authorName = authUser?.name ?? "Dr. Kevin Park";
  const authorSpecialty = authUser?.specialization ?? "Cardiologist";
  const authorAvatar =
    authUser?.profileImage ||
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80";
  const authorVerified = authUser?.isVerified ?? true;

  const activeMedia =
    postType === "image"
      ? imageMedia
      : postType === "video"
        ? videoMedia
        : null;

  const visibilityLabel = useMemo(
    () =>
      VISIBILITY_OPTIONS.find((item) => item.value === visibility)?.label ??
      "Public",
    [visibility],
  );

  const canSubmit = useMemo(() => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return false;
    if (
      (postType === "image" || postType === "video") &&
      !activeMedia?.remoteUrl
    )
      return false;
    if (
      postType === "case" &&
      (!caseSymptoms.trim() || !caseObservations.trim())
    )
      return false;
    return true;
  }, [
    activeMedia?.remoteUrl,
    caseObservations,
    caseSymptoms,
    content,
    postType,
  ]);

  const setContentWithLimit = useCallback(
    (nextText: string) => {
      if (nextText.length > MAX_CONTENT_LENGTH) {
        showToast("Post content cannot exceed 5000 characters", "error");
      }

      const limited = clampText(nextText);
      setContent(limited);
      const cursor = Math.min(selection.start, limited.length);
      setSelection({ start: cursor, end: cursor });
    },
    [selection.start, showToast],
  );

  const insertTextAtSelection = useCallback(
    (textToInsert: string) => {
      const start = selection.start;
      const end = selection.end;
      const nextText = `${content.slice(0, start)}${textToInsert}${content.slice(end)}`;
      const limited = clampText(nextText);
      const cursor = Math.min(start + textToInsert.length, limited.length);
      setContent(limited);
      setSelection({ start: cursor, end: cursor });
    },
    [content, selection.end, selection.start],
  );

  const replaceRange = useCallback(
    (start: number, end: number, replacement: string) => {
      const nextText = `${content.slice(0, start)}${replacement}${content.slice(end)}`;
      const limited = clampText(nextText);
      const cursor = Math.min(start + replacement.length, limited.length);
      setContent(limited);
      setSelection({ start: cursor, end: cursor });
    },
    [content],
  );

  const clearDraft = useCallback(async () => {
    await AsyncStorage.removeItem(draftStorageKey).catch(() => {});
  }, [draftStorageKey]);

  useEffect(() => {
    let active = true;

    const hydrateDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(draftStorageKey);
        if (!active) return;

        if (raw) {
          const draft = JSON.parse(raw) as DraftState;
          setContent(draft.content ?? "");
          setSelection({
            start: (draft.content ?? "").length,
            end: (draft.content ?? "").length,
          });
          setPostType(draft.postType ?? "text");
          setVisibility(draft.visibility ?? "public");
          setImageMedia(draft.imageMedia ?? EMPTY_MEDIA);
          setVideoMedia(draft.videoMedia ?? EMPTY_MEDIA);
          setCaseSymptoms(draft.caseSymptoms ?? "");
          setCaseObservations(draft.caseObservations ?? "");
          setBoldMode(Boolean(draft.boldMode));
          setDraftEnabled(true);
        }
      } catch {
        // Ignore malformed drafts and continue with defaults.
      } finally {
        if (active) setDraftHydrated(true);
      }
    };

    void hydrateDraft();

    return () => {
      active = false;
    };
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftHydrated) return;

    const payload: DraftState = {
      content,
      postType,
      visibility,
      imageMedia,
      videoMedia,
      caseSymptoms,
      caseObservations,
      boldMode,
    };

    if (!draftEnabled) {
      void AsyncStorage.removeItem(draftStorageKey).catch(() => {});
      return;
    }

    const timeoutId = setTimeout(() => {
      AsyncStorage.setItem(draftStorageKey, JSON.stringify(payload)).catch(
        () => {},
      );
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [
    boldMode,
    caseObservations,
    caseSymptoms,
    content,
    draftEnabled,
    draftHydrated,
    draftStorageKey,
    imageMedia,
    postType,
    videoMedia,
    visibility,
  ]);

  useEffect(() => {
    if (activeModal !== "mention") return;

    let active = true;
    setMentionLoading(true);

    const loadSuggestions = async () => {
      try {
        const trimmed = mentionQuery.trim();
        const users = trimmed
          ? await searchUsersRequest(trimmed, 12)
          : await getSuggestedUsersRequest(12);
        if (active) {
          setMentionUsers(users.filter((user) => user._id !== authUser?._id));
        }
      } catch {
        if (active) setMentionUsers([]);
      } finally {
        if (active) setMentionLoading(false);
      }
    };

    const timeoutId = setTimeout(
      () => {
        void loadSuggestions();
      },
      mentionQuery.trim() ? 250 : 0,
    );

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [activeModal, authUser?._id, mentionQuery]);

  const handlePostTypeChange = (tag: PostTag) => {
    hapticTap();
    setPostType(tag);
  };

  const setMediaForType = (
    media: MediaDraft | null,
    type: "image" | "video",
  ) => {
    if (type === "image") {
      setImageMedia(media);
    } else {
      setVideoMedia(media);
    }
  };

  const pickMedia = async (type: "image" | "video") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Media library permission is required", "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === "image"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
      allowsEditing: type === "image",
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setMediaUploading(true);
    try {
      const remoteUrl = await uploadMediaRequest(asset.uri);
      setMediaForType(
        {
          localUri: asset.uri,
          remoteUrl,
        },
        type,
      );
      hapticSuccess();
    } catch (error) {
      setMediaForType(EMPTY_MEDIA, type);
      showToast(extractErrorMessage(error, "Media upload failed"), "error");
      hapticWarning();
    } finally {
      setMediaUploading(false);
    }
  };

  const clearMedia = (type: "image" | "video") => {
    hapticTap();
    setMediaForType(EMPTY_MEDIA, type);
  };

  const openMentionPicker = () => {
    insertTextAtSelection("@");
    setMentionTriggerPosition(selection.start);
    setMentionQuery("");
    setActiveModal("mention");
  };

  const openHashtagPicker = () => {
    insertTextAtSelection("#");
    setMentionTriggerPosition(selection.start);
    setMentionQuery("");
    setActiveModal("hashtag");
  };

  const chooseMention = (user: User) => {
    if (mentionTriggerPosition !== null) {
      replaceRange(
        mentionTriggerPosition,
        mentionTriggerPosition + 1,
        `@${user.name} `,
      );
    } else {
      insertTextAtSelection(`@${user.name} `);
    }
    setActiveModal(null);
    setMentionTriggerPosition(null);
    setMentionQuery("");
  };

  const chooseHashtag = (tag: string) => {
    if (mentionTriggerPosition !== null) {
      replaceRange(
        mentionTriggerPosition,
        mentionTriggerPosition + 1,
        `${tag} `,
      );
    } else {
      insertTextAtSelection(`${tag} `);
    }
    setActiveModal(null);
    setMentionTriggerPosition(null);
  };

  const openEmojiPicker = () => setActiveModal("emoji");
  const openVisibilityPicker = () => setActiveModal("visibility");

  const submitPost = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      showToast("Post content is required", "error");
      hapticWarning();
      return;
    }

    if (
      postType === "case" &&
      (!caseSymptoms.trim() || !caseObservations.trim())
    ) {
      showToast("Case posts require symptoms and observations", "error");
      hapticWarning();
      return;
    }

    if (
      (postType === "image" || postType === "video") &&
      !activeMedia?.remoteUrl
    ) {
      showToast(
        postType === "image" ? "Please add an image" : "Please add a video",
        "error",
      );
      hapticWarning();
      return;
    }

    try {
      setLoading(true);

      await createPost({
        content: trimmedContent,
        type: postType,
        visibility,
        mediaUrl: activeMedia?.remoteUrl ?? "",
        symptoms: postType === "case" ? caseSymptoms.trim() : undefined,
        observations: postType === "case" ? caseObservations.trim() : undefined,
        reportImages: activeMedia?.remoteUrl ? [activeMedia.remoteUrl] : [],
        isAnonymous: false,
      });

      showToast("Post published", "success");
      hapticSuccess();
      setContent("");
      setSelection({ start: 0, end: 0 });
      setPostType("text");
      setVisibility("public");
      setImageMedia(EMPTY_MEDIA);
      setVideoMedia(EMPTY_MEDIA);
      setCaseSymptoms("");
      setCaseObservations("");
      setBoldMode(false);
      setDraftEnabled(false);
      await clearDraft();
      navigation.goBack();
    } catch (error) {
      showToast(extractErrorMessage(error, "Failed to publish post"), "error");
      hapticWarning();
    } finally {
      setLoading(false);
    }
  };

  const onPressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const onPressOut = () => {
    buttonScale.value = withSpring(1);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const tabIconColor = (active: boolean) =>
    active ? "#FFFFFF" : theme.colors.textSecondary;

  const renderTabIcon = (tag: PostTag, active: boolean) => {
    const color = tabIconColor(active);
    switch (tag) {
      case "text":
        return <Pencil size={14} color={color} />;
      case "image":
        return <ImageIcon size={14} color={color} />;
      case "video":
        return <CirclePlay size={14} color={color} />;
      case "case":
        return <Inbox size={14} color={color} />;
      default:
        return null;
    }
  };

  const renderMediaSection = () => {
    if (postType !== "image" && postType !== "video") return null;

    const media = activeMedia;
    const mediaType = postType;

    if (!media?.remoteUrl) {
      return (
        <Pressable
          onPress={() => void pickMedia(mediaType)}
          style={[
            styles.mediaPicker,
            { borderColor: theme.colors.tabBarBorder },
          ]}
        >
          {mediaUploading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <>
              {mediaType === "image" ? (
                <ImageIcon size={20} color={theme.colors.textSecondary} />
              ) : (
                <CirclePlay size={20} color={theme.colors.textSecondary} />
              )}
              <Text
                style={[
                  styles.mediaPickerText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Add {mediaType === "image" ? "Image" : "Video"}
              </Text>
            </>
          )}
        </Pressable>
      );
    }

    return (
      <View style={styles.mediaPreviewWrap}>
        {mediaType === "image" ? (
          <Image
            source={{ uri: media.remoteUrl }}
            style={styles.mediaPreview}
            contentFit="cover"
          />
        ) : (
          <Video
            source={{ uri: media.remoteUrl }}
            style={styles.mediaPreview}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping={false}
            useNativeControls
          />
        )}

        <Pressable
          onPress={() => clearMedia(mediaType)}
          style={styles.mediaClearBadge}
        >
          <X size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  };

  const renderCaseSection = () => {
    if (postType !== "case") return null;

    return (
      <View style={styles.caseFields}>
        <View
          style={[
            styles.caseInputCard,
            { borderColor: theme.colors.tabBarBorder },
          ]}
        >
          <Text
            style={[styles.caseLabel, { color: theme.colors.textSecondary }]}
          >
            Symptoms
          </Text>
          <TextInput
            value={caseSymptoms}
            onChangeText={setCaseSymptoms}
            placeholder="E.g., Fever, persistent cough"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            style={[styles.caseInput, { color: theme.colors.textPrimary }]}
          />
        </View>

        <View
          style={[
            styles.caseInputCard,
            { borderColor: theme.colors.tabBarBorder },
          ]}
        >
          <Text
            style={[styles.caseLabel, { color: theme.colors.textSecondary }]}
          >
            Observations
          </Text>
          <TextInput
            value={caseObservations}
            onChangeText={setCaseObservations}
            placeholder="E.g., Elevated HR, clear lungs"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            style={[
              styles.caseInput,
              styles.caseInputTall,
              { color: theme.colors.textPrimary },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderMainComposer = () => {
    const boldStyle = boldMode ? styles.textAreaBold : undefined;
    return (
      <View
        style={[
          styles.composerCard,
          { borderColor: theme.colors.tabBarBorder },
        ]}
      >
        {renderMediaSection()}
        {renderCaseSection()}

        <TextInput
          value={content}
          onChangeText={setContentWithLimit}
          onSelectionChange={(event) =>
            setSelection(event.nativeEvent.selection)
          }
          placeholder="Share your knowledge..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={MAX_CONTENT_LENGTH}
          style={[
            styles.textArea,
            boldStyle,
            { color: theme.colors.textPrimary },
          ]}
        />

        <View style={styles.composerFooter}>
          <View style={styles.toolbarRow}>
            <Pressable
              onPress={openEmojiPicker}
              style={[
                styles.toolbarBtn,
                { borderColor: theme.colors.tabBarBorder },
              ]}
            >
              <Smile size={15} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={openMentionPicker}
              style={[
                styles.toolbarBtn,
                { borderColor: theme.colors.tabBarBorder },
              ]}
            >
              <AtSign size={15} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={openHashtagPicker}
              style={[
                styles.toolbarBtn,
                { borderColor: theme.colors.tabBarBorder },
              ]}
            >
              <Hash size={15} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => setBoldMode((current) => !current)}
              style={[
                styles.toolbarBtn,
                boldMode && {
                  borderColor: theme.colors.primary,
                  backgroundColor: "rgba(59,130,246,0.18)",
                },
              ]}
            >
              <Bold
                size={15}
                color={
                  boldMode ? theme.colors.primary : theme.colors.textSecondary
                }
              />
            </Pressable>
          </View>

          <Text
            style={[styles.counterText, { color: theme.colors.textSecondary }]}
          >
            {content.length}/{MAX_CONTENT_LENGTH}
          </Text>
        </View>
      </View>
    );
  };

  const renderModal = () => {
    if (!activeModal) return null;

    return (
      <Modal
        transparent
        animationType="fade"
        visible
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActiveModal(null)}
          />

          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.cardBorder,
              },
            ]}
          >
            {activeModal === "visibility" ? (
              <>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Select visibility
                </Text>
                <View style={styles.optionList}>
                  {VISIBILITY_OPTIONS.map((option) => {
                    const selected = visibility === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setVisibility(option.value);
                          setActiveModal(null);
                          hapticTap();
                        }}
                        style={[
                          styles.optionRow,
                          selected && {
                            borderColor: theme.colors.primary,
                            backgroundColor: theme.colors.primaryLight,
                          },
                        ]}
                      >
                        <View>
                          <Text
                            style={[
                              styles.optionLabel,
                              { color: theme.colors.textPrimary },
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text
                            style={[
                              styles.optionDescription,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {option.description}
                          </Text>
                        </View>
                        {selected ? (
                          <BadgeCheck size={18} color={theme.colors.primary} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {activeModal === "emoji" ? (
              <>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Choose an emoji
                </Text>
                <View style={styles.emojiGrid}>
                  {EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        insertTextAtSelection(emoji);
                        setActiveModal(null);
                        hapticTap();
                      }}
                      style={[
                        styles.emojiChip,
                        { borderColor: theme.colors.cardBorder },
                      ]}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {activeModal === "mention" ? (
              <>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Mention a colleague
                </Text>
                <View
                  style={[
                    styles.modalSearch,
                    {
                      borderColor: theme.colors.cardBorder,
                      backgroundColor: theme.colors.inputBackground,
                    },
                  ]}
                >
                  <Search size={16} color={theme.colors.textTertiary} />
                  <TextInput
                    value={mentionQuery}
                    onChangeText={setMentionQuery}
                    placeholder="Search users"
                    placeholderTextColor={theme.colors.textTertiary}
                    style={[
                      styles.modalSearchInput,
                      { color: theme.colors.textPrimary },
                    ]}
                  />
                </View>

                <ScrollView
                  style={styles.modalScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  {mentionLoading ? (
                    <View style={styles.modalLoadingRow}>
                      <ActivityIndicator color={theme.colors.primary} />
                    </View>
                  ) : mentionUsers.length ? (
                    mentionUsers.map((user) => (
                      <Pressable
                        key={user._id}
                        onPress={() => chooseMention(user)}
                        style={[
                          styles.userRow,
                          { borderColor: theme.colors.cardBorder },
                        ]}
                      >
                        <Avatar
                          name={user.name}
                          uri={user.profileImage}
                          size={40}
                          verified={user.isVerified}
                        />
                        <View style={styles.userRowText}>
                          <Text
                            style={[
                              styles.userName,
                              { color: theme.colors.textPrimary },
                            ]}
                          >
                            {user.name}
                          </Text>
                          <Text
                            style={[
                              styles.userMeta,
                              { color: theme.colors.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {user.role}
                            {user.specialization
                              ? ` · ${user.specialization}`
                              : ""}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <Text
                      style={[
                        styles.modalEmpty,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      No users found
                    </Text>
                  )}
                </ScrollView>
              </>
            ) : null}

            {activeModal === "hashtag" ? (
              <>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Add a hashtag
                </Text>
                <View
                  style={[
                    styles.modalSearch,
                    {
                      borderColor: theme.colors.cardBorder,
                      backgroundColor: theme.colors.inputBackground,
                    },
                  ]}
                >
                  <Hash size={16} color={theme.colors.textTertiary} />
                  <TextInput
                    value={mentionQuery}
                    onChangeText={setMentionQuery}
                    placeholder="Search hashtags"
                    placeholderTextColor={theme.colors.textTertiary}
                    style={[
                      styles.modalSearchInput,
                      { color: theme.colors.textPrimary },
                    ]}
                  />
                </View>

                <View style={styles.hashtagGrid}>
                  {HASHTAG_SUGGESTIONS.filter((item) =>
                    item
                      .toLowerCase()
                      .includes(mentionQuery.trim().toLowerCase()),
                  ).map((tag) => (
                    <Pressable
                      key={tag}
                      onPress={() => chooseHashtag(tag)}
                      style={[
                        styles.hashtagChip,
                        {
                          borderColor: theme.colors.cardBorder,
                          backgroundColor: theme.colors.surfaceMuted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.hashtagText,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <Pressable
              onPress={() => setActiveModal(null)}
              style={styles.modalCloseButton}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#071126", "#091A3A", "#081328"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + 10 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              { borderColor: theme.colors.tabBarBorder },
            ]}
          >
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text
              style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
            >
              Create Post
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              Share knowledge, help others, grow together
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.tabContainer,
            {
              borderColor: theme.colors.tabBarBorder,
              backgroundColor: theme.colors.tabBar,
            },
          ]}
        >
          {tags.map((tag) => {
            const active = tag === postType;
            return (
              <Pressable
                key={tag}
                onPress={() => handlePostTypeChange(tag)}
                style={styles.tabChip}
              >
                {active ? (
                  <LinearGradient
                    colors={["#2D8CFF", "#5B2DFF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.activeTabPill}
                  >
                    {renderTabIcon(tag, active)}
                    <Text style={[styles.tabText, styles.tabTextActive]}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.inactiveTabPill}>
                    {renderTabIcon(tag, active)}
                    <Text
                      style={[
                        styles.tabText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <GlassCard
          padded={false}
          style={[styles.card, { borderColor: theme.colors.tabBarBorder }]}
        >
          <View style={styles.authorRow}>
            <View style={styles.authorLeft}>
              <Image
                source={{ uri: authorAvatar }}
                style={styles.avatar}
                contentFit="cover"
              />
              <View>
                <View style={styles.nameRow}>
                  <Text
                    style={[
                      styles.authorName,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {authorName}
                  </Text>
                  {authorVerified ? (
                    <BadgeCheck size={14} color="#3B82F6" fill="#3B82F6" />
                  ) : null}
                </View>
                <View style={styles.specialtyBadge}>
                  <Text style={styles.specialtyText}>{authorSpecialty}</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={openVisibilityPicker}
              style={[
                styles.visibilityBtn,
                { borderColor: theme.colors.tabBarBorder },
              ]}
            >
              <Globe size={14} color={theme.colors.textSecondary} />
              <Text
                style={[
                  styles.visibilityText,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {visibilityLabel}
              </Text>
              <ChevronDown size={14} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {renderMainComposer()}
        </GlassCard>

        <GlassCard
          padded={false}
          style={[
            styles.infoCardShell,
            { borderColor: theme.colors.tabBarBorder },
          ]}
        >
          <View style={styles.tipsRow}>
            <View style={styles.infoLeft}>
              <View style={styles.tipsTitleRow}>
                <Sparkles size={14} color="#67B7FF" />
                <Text
                  style={[
                    styles.tipsTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Post tips
                </Text>
              </View>
              <Text
                style={[styles.tipsText, { color: theme.colors.textSecondary }]}
              >
                Clear, helpful posts get more views and help more medical
                professionals.
              </Text>
            </View>

            <View
              style={[
                styles.illustrationWrap,
                { borderColor: theme.colors.tabBarBorder },
              ]}
            >
              <View
                style={[styles.illustrationLine, styles.illustrationLineWide]}
              />
              <View
                style={[styles.illustrationLine, styles.illustrationLineShort]}
              />
              <Pencil
                size={16}
                color="#7A5CFF"
                style={styles.illustrationPen}
              />
            </View>
          </View>
        </GlassCard>

        <GlassCard
          padded={false}
          style={[
            styles.draftCardShell,
            { borderColor: theme.colors.tabBarBorder },
          ]}
        >
          <View style={styles.draftRow}>
            <View style={styles.draftLeft}>
              <View style={styles.draftTitleRow}>
                <Bookmark size={14} color="#8FAEFF" />
                <Text
                  style={[
                    styles.draftTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Save draft
                </Text>
              </View>
              <Text
                style={[
                  styles.draftSubtitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Save and continue later
              </Text>
            </View>
            <Switch
              value={draftEnabled}
              onValueChange={setDraftEnabled}
              trackColor={{ false: "#374151", true: "#60A5FA" }}
              thumbColor="#F1F5F9"
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          {
            borderTopColor: theme.colors.borderLight,
            paddingBottom: insets.bottom + 14,
          },
        ]}
      >
        <AnimatedPressable
          onPress={submitPost}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={!canSubmit || loading || mediaUploading}
          style={[buttonAnimatedStyle, styles.publishBtnWrapper]}
        >
          <LinearGradient
            colors={["#3B82F6", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.publishGradient}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textInverted} />
            ) : (
              <View style={styles.publishContent}>
                <Send size={18} color="#FFFFFF" />
                <Text style={styles.publishText}>Publish Post</Text>
                <View style={styles.publishSparkles}>
                  <Sparkles size={13} color="#DDE8FF" />
                  <Sparkles size={11} color="#FFFFFF" />
                </View>
              </View>
            )}
          </LinearGradient>
        </AnimatedPressable>

        <View style={styles.footerNote}>
          <Lock size={13} color={theme.colors.textSecondary} />
          <Text
            style={[styles.footerText, { color: theme.colors.textSecondary }]}
          >
            Your post will follow our{" "}
          </Text>
          <Pressable
            onPress={() => {
              /* TODO: navigate to community guidelines screen or open the URL */
            }}
          >
            <Text style={styles.guidelinesText}>community guidelines</Text>
          </Pressable>
        </View>
      </View>

      {renderModal()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071126" },
  contentContainer: { paddingHorizontal: 14, paddingBottom: 194 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,19,40,0.72)",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 30,
    lineHeight: 34,
  },
  headerSubtitle: {
    marginTop: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 3,
    marginBottom: 12,
    justifyContent: "space-between",
    borderWidth: 1,
  },
  tabChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
  },
  activeTabPill: {
    flex: 1,
    borderRadius: 11,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  inactiveTabPill: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  tabTextActive: { color: "#FFFFFF" },
  card: {
    padding: 10,
    borderRadius: 18,
    backgroundColor: "rgba(9,20,45,0.64)",
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  authorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  authorName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  specialtyBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(76,88,255,0.18)",
  },
  specialtyText: {
    fontFamily: "Manrope_600SemiBold",
    color: "#AFAFFF",
    fontSize: 10,
  },
  visibilityBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(8,20,44,0.7)",
  },
  visibilityText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
  },
  composerCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    minHeight: 260,
    justifyContent: "space-between",
    backgroundColor: "rgba(9,20,45,0.6)",
    gap: 10,
  },
  mediaPicker: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(10,24,51,0.4)",
  },
  mediaPickerText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
  },
  mediaPreviewWrap: {
    height: 170,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  mediaPreview: { width: "100%", height: "100%" },
  mediaClearBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
  },
  caseFields: {
    gap: 10,
  },
  caseInputCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(10,24,51,0.45)",
  },
  caseLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  caseInput: {
    minHeight: 38,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    textAlignVertical: "top",
  },
  caseInputTall: { minHeight: 54 },
  textArea: {
    minHeight: 160,
    fontSize: 16,
    textAlignVertical: "top",
    fontFamily: "Manrope_500Medium",
  },
  textAreaBold: {
    fontFamily: "Manrope_700Bold",
  },
  composerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  toolbarRow: {
    flexDirection: "row",
    gap: 6,
  },
  toolbarBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,24,51,0.66)",
  },
  counterText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
  },
  infoCardShell: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    backgroundColor: "rgba(9,20,45,0.58)",
    marginBottom: 10,
  },
  tipsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  infoLeft: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  tipsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tipsTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
  },
  tipsText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  illustrationWrap: {
    width: 68,
    height: 56,
    borderRadius: 11,
    borderWidth: 1,
    backgroundColor: "rgba(11,29,63,0.72)",
    justifyContent: "center",
    paddingHorizontal: 8,
    position: "relative",
    marginLeft: 8,
    flexShrink: 0,
  },
  illustrationLine: {
    height: 3,
    borderRadius: 4,
    backgroundColor: "rgba(115,149,255,0.9)",
    marginBottom: 4,
  },
  illustrationLineWide: { width: 32 },
  illustrationLineShort: { width: 22 },
  illustrationPen: {
    position: "absolute",
    right: 5,
    bottom: 5,
  },
  draftCardShell: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    backgroundColor: "rgba(9,20,45,0.58)",
  },
  draftRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  draftLeft: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    marginRight: 10,
  },
  draftTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  draftTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
  },
  draftSubtitle: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    backgroundColor: "rgba(7,17,38,0.9)",
  },
  publishBtnWrapper: {
    borderRadius: 999,
    overflow: "hidden",
  },
  publishGradient: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  publishContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  publishText: {
    color: "#FFFFFF",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  publishSparkles: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 2,
    marginLeft: 2,
  },
  footerNote: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  footerText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
  },
  guidelinesText: {
    fontFamily: "Manrope_700Bold",
    color: "#4A8DFF",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.7)",
    justifyContent: "flex-end",
    padding: 14,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    maxHeight: "80%",
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  modalSearch: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
  },
  optionList: {
    gap: 10,
  },
  optionRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
  },
  optionDescription: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.04)",
  },
  emojiText: {
    fontSize: 22,
  },
  modalScroll: {
    maxHeight: 280,
  },
  modalLoadingRow: {
    paddingVertical: 16,
    alignItems: "center",
  },
  userRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  userRowText: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
  },
  userMeta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  modalEmpty: {
    textAlign: "center",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    paddingVertical: 18,
  },
  hashtagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hashtagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hashtagText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  modalCloseButton: {
    alignSelf: "center",
    paddingVertical: 4,
  },
  modalCloseText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
  },
});
