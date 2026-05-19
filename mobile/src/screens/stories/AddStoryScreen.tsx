import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import {
  ArrowLeft,
  AtSign,
  Eye,
  Globe,
  Hash,
  ImagePlus,
  MapPin,
  Music,
  Sparkles,
  Smile,
  Video as VideoIcon,
} from "lucide-react-native";

import type { RootStackParamList } from "@/navigation/types";
import { uploadMediaRequest } from "@/services/api/uploadApi";
import { useStoryStore } from "@/store/storyStore";
import { hapticSuccess, hapticTap, hapticWarning } from "@/utils/haptics";

type StoryVisibility = "followers" | "public";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");
const isCompactHeight = screenHeight < 780;
const horizontalSheetPadding = isCompactHeight ? 14 : 16;
const previewCardWidth = Math.round(
  Math.min(
    screenWidth * (isCompactHeight ? 0.56 : 0.58),
    isCompactHeight ? 218 : 232,
  ),
);
const previewCardHeight = Math.round(
  Math.min(
    screenHeight * (isCompactHeight ? 0.31 : 0.32),
    previewCardWidth * 1.18,
  ),
);
const segmentIndicatorWidth = Math.round(
  (screenWidth - horizontalSheetPadding * 2 - 10) / 2,
);

export function AddStoryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const createStory = useStoryStore((state) => state.createStory);
  const visibilityAnimation = useRef(new Animated.Value(0)).current;

  const [localUri, setLocalUri] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<StoryVisibility>("followers");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [captionFocused, setCaptionFocused] = useState(false);

  const canSubmit = useMemo(
    () => !!uploadedUrl && !uploading && !publishing,
    [publishing, uploading, uploadedUrl],
  );

  useEffect(() => {
    Animated.timing(visibilityAnimation, {
      toValue: visibility === "followers" ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visibility, visibilityAnimation]);

  const handleImagePickerResult = async (
    result: ImagePicker.ImagePickerResult,
  ) => {
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const nextType = asset.type === "video" ? "video" : "image";

    setLocalUri(asset.uri);
    setMediaType(nextType);
    setUploadedUrl("");
    setUploading(true);

    try {
      const url = await uploadMediaRequest(asset.uri);
      setUploadedUrl(url);
      hapticSuccess();
    } catch (_error) {
      setLocalUri("");
      setUploadedUrl("");
      hapticWarning();
      Alert.alert(
        "Upload Failed",
        "Could not upload the media. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const pickMedia = async () => {
    Alert.alert("Add Media", "Choose the source for your story", [
      {
        text: "Camera",
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("Permission required", "Camera access is needed.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            quality: 0.8,
            videoMaxDuration: 60,
          });
          void handleImagePickerResult(result);
        },
      },
      {
        text: "Library",
        onPress: async () => {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("Permission required", "Library access is needed.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            quality: 0.8,
            videoMaxDuration: 60,
          });
          void handleImagePickerResult(result);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const insertText = (textToInsert: string) => {
    setCaption(
      (prev) =>
        prev +
        (prev.length > 0 && !prev.endsWith(" ") ? " " : "") +
        textToInsert,
    );
    hapticTap();
  };

  const submitStory = async () => {
    if (!canSubmit) {
      hapticWarning();
      return;
    }

    setPublishing(true);

    try {
      await createStory({
        mediaUrl: uploadedUrl,
        type: mediaType,
        caption: caption.trim(),
        visibility,
      });
      hapticSuccess();
      navigation.goBack();
    } catch (_error) {
      hapticWarning();
    } finally {
      setPublishing(false);
    }
  };

  const indicatorTranslateX = visibilityAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentIndicatorWidth + 4],
  });

  const previewMedia = localUri ? (
    mediaType === "video" ? (
      <Video
        key={localUri}
        source={{ uri: localUri }}
        style={styles.previewMedia}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping={false}
        useNativeControls
      />
    ) : (
      <Image
        source={{ uri: localUri }}
        style={styles.previewMedia}
        contentFit="cover"
      />
    )
  ) : (
    <LinearGradient
      colors={theme.gradients.appBackground}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.previewFallback}
    />
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={theme.gradients.appBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.backgroundGradient}
        />
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbBottom} />

        <ScrollView
          style={styles.scroller}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.previewGroup}>
            <View style={styles.topBar}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.iconButton}
              >
                <ArrowLeft size={20} color={theme.colors.textInverted} />
              </Pressable>
            </View>

            <View style={styles.previewSection}>
              <View style={styles.previewGlow} />
              <Pressable
                onPress={() => {
                  hapticTap();
                  void pickMedia();
                }}
                style={({ pressed }) => [
                  styles.previewCardWrap,
                  pressed && styles.previewCardPressed,
                ]}
              >
                <View style={styles.previewCard}>
                  {previewMedia}
                  <LinearGradient
                    colors={["rgba(4,8,20,0.1)", "rgba(4,8,20,0.82)"]}
                    start={{ x: 0.5, y: 0.3 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.previewOverlay}
                  />

                  <View style={styles.storyProgressRow}>
                    <View
                      style={[styles.storyProgress, styles.storyProgressActive]}
                    />
                    <View style={styles.storyProgress} />
                    <View style={styles.storyProgress} />
                  </View>

                  {!localUri ? (
                    <View style={styles.emptyPreviewCenter}>
                      <BlurView
                        intensity={theme.isDark ? 30 : 60}
                        tint={theme.isDark ? "dark" : "light"}
                        style={styles.uploadOrb}
                      >
                        {uploading ? (
                          <ActivityIndicator
                            size="large"
                            color={theme.colors.textInverted}
                          />
                        ) : (
                          <ImagePlus
                            size={34}
                            color={theme.colors.textInverted}
                          />
                        )}
                      </BlurView>
                      <Text style={styles.emptyPreviewTitle}>
                        {uploading ? "Uploading media" : "Tap to add media"}
                      </Text>
                      <Text style={styles.emptyPreviewSubtitle}>
                        Photo or video
                      </Text>
                    </View>
                  ) : null}

                  <BlurView
                    intensity={theme.isDark ? 20 : 40}
                    tint={theme.isDark ? "dark" : "light"}
                    style={styles.previewBadge}
                  >
                    <Eye size={14} color={theme.colors.textInverted} />
                    <Text style={styles.previewBadgeText}>
                      Your story preview
                    </Text>
                  </BlurView>
                </View>
              </Pressable>
            </View>
          </View>

          <BlurView
            intensity={theme.isDark ? 36 : 60}
            tint={theme.isDark ? "dark" : "light"}
            style={styles.bottomSheet}
          >
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            <Text style={styles.title}>Add story</Text>
            <Text style={styles.subtitle}>
              Share a quick update with your followers or make it public.
            </Text>

            <View style={styles.segmentWrap}>
              <Animated.View
                style={[
                  styles.segmentIndicator,
                  { transform: [{ translateX: indicatorTranslateX }] },
                ]}
              >
                <LinearGradient
                  colors={theme.gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentIndicatorGradient}
                />
              </Animated.View>

              <Pressable
                onPress={() => {
                  hapticTap();
                  setVisibility("followers");
                }}
                style={styles.segment}
              >
                <Eye
                  size={16}
                  color={
                    visibility === "followers"
                      ? "#FFFFFF"
                      : theme.colors.iconMuted
                  }
                />
                <View>
                  <Text
                    style={[
                      styles.segmentTitle,
                      visibility === "followers" && styles.segmentTitleActive,
                    ]}
                  >
                    Followers
                  </Text>
                  <Text
                    style={[
                      styles.segmentSub,
                      visibility === "followers" && styles.segmentSubActive,
                    ]}
                  >
                    Only your followers
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  hapticTap();
                  setVisibility("public");
                }}
                style={styles.segment}
              >
                <Globe
                  size={16}
                  color={
                    visibility === "public" ? "#FFFFFF" : theme.colors.iconMuted
                  }
                />
                <View>
                  <Text
                    style={[
                      styles.segmentTitle,
                      visibility === "public" && styles.segmentTitleActive,
                    ]}
                  >
                    Public
                  </Text>
                  <Text
                    style={[
                      styles.segmentSub,
                      visibility === "public" && styles.segmentSubActive,
                    ]}
                  >
                    Anyone on Doctorsapp
                  </Text>
                </View>
              </Pressable>
            </View>

            <View
              style={[
                styles.captionCard,
                captionFocused && styles.captionCardFocused,
              ]}
            >
              <Text style={styles.captionLabel}>Caption</Text>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Write a short note about your story..."
                placeholderTextColor="rgba(173, 186, 214, 0.52)"
                multiline
                maxLength={150}
                onFocus={() => setCaptionFocused(true)}
                onBlur={() => setCaptionFocused(false)}
                style={styles.captionInput}
              />

              <View style={styles.captionFooter}>
                <View style={styles.captionTools}>
                  <Pressable
                    onPress={() => insertText("😊")}
                    style={({ pressed }) => [styles.captionToolButton, pressed && { opacity: 0.7 }]}
                  >
                    <Smile size={19} color={theme.isDark ? theme.colors.iconMuted : theme.colors.icon} />
                  </Pressable>
                  <Pressable
                    onPress={() => insertText("@")}
                    style={({ pressed }) => [styles.captionToolButton, pressed && { opacity: 0.7 }]}
                  >
                    <AtSign size={19} color={theme.isDark ? theme.colors.iconMuted : theme.colors.icon} />
                  </Pressable>
                </View>
                <Text style={styles.captionCounter}>{caption.length}/150</Text>
              </View>
            </View>

            <View style={styles.chipRow}>
              <Pressable
                onPress={() => {
                  hapticTap();
                  Alert.alert("Location", "Location metadata attached!");
                  insertText("📍 ");
                }}
                style={({ pressed }) => [styles.actionChip, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              >
                <MapPin size={16} color={theme.colors.primary} />
                <Text style={styles.actionChipText}>Location</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  hapticTap();
                  Alert.alert("Music", "Future music catalog integration...");
                }}
                style={({ pressed }) => [styles.actionChip, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              >
                <Music size={16} color={theme.colors.primary} />
                <Text style={styles.actionChipText}>Music</Text>
              </Pressable>
              <Pressable
                onPress={() => insertText("#")}
                style={({ pressed }) => [styles.actionChip, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              >
                <Hash size={16} color={theme.colors.primary} />
                <Text style={styles.actionChipText}>Add hashtag</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                hapticTap();
                void pickMedia();
              }}
              style={({ pressed }) => [
                styles.repickButton,
                pressed && styles.repickPressed,
              ]}
            >
              <VideoIcon size={17} color={theme.colors.primary} />
              <Text style={styles.repickText}>Change media</Text>
            </Pressable>

            <Pressable
              disabled={!canSubmit}
              onPress={submitStory}
              style={({ pressed }) => [
                styles.publishWrap,
                (pressed || !canSubmit) && styles.publishPressed,
              ]}
            >
              <LinearGradient
                colors={
                  canSubmit
                    ? theme.gradients.primary
                    : [theme.colors.border, theme.colors.border]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.publishButton, !canSubmit && { shadowOpacity: 0, elevation: 0 }]}
              >
                {publishing ? (
                  <ActivityIndicator color={theme.colors.textInverted} />
                ) : (
                  <>
                    <Sparkles size={18} color={canSubmit ? "#FFFFFF" : theme.colors.textTertiary} />
                    <Text style={[styles.publishText, !canSubmit && { color: theme.colors.textTertiary }]}>Post story</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </BlurView>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    backgroundGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    bgOrbTop: {
      position: "absolute",
      top: -120,
      left: -80,
      width: 280,
      height: 280,
      borderRadius: 160,
      backgroundColor: theme.colors.glow,
    },
    bgOrbBottom: {
      position: "absolute",
      right: -70,
      bottom: 220,
      width: 240,
      height: 240,
      borderRadius: 140,
      backgroundColor: theme.colors.glowSecondary,
    },
    scroller: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "space-between",
      gap: isCompactHeight ? 8 : 12,
      paddingTop: Platform.OS === "android" ? 6 : 10,
      paddingBottom: isCompactHeight ? 12 : 14,
    },
    previewGroup: {
      flexShrink: 0,
    },
    topBar: {
      paddingHorizontal: 18,
      marginBottom: isCompactHeight ? 6 : 8,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.isDark
        ? "rgba(7, 14, 34, 0.52)"
        : "rgba(255, 255, 255, 0.8)",
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(195, 219, 255, 0.16)"
        : "rgba(0, 0, 0, 0.05)",
    },
    previewSection: {
      alignItems: "center",
      marginBottom: 0,
    },
    previewGlow: {
      position: "absolute",
      top: 18,
      width: previewCardWidth,
      height: previewCardHeight - 12,
      borderRadius: 28,
      backgroundColor: theme.colors.glowSecondary,
    },
    previewCardWrap: {
      width: "100%",
      alignItems: "center",
    },
    previewCardPressed: {
      opacity: 0.95,
      transform: [{ scale: 0.996 }],
    },
    previewCard: {
      width: previewCardWidth,
      height: previewCardHeight,
      borderRadius: 28,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.darkBackground,
      shadowColor: theme.shadow.floating.shadowColor,
      shadowOpacity: theme.shadow.floating.shadowOpacity,
      shadowRadius: theme.shadow.floating.shadowRadius,
      shadowOffset: theme.shadow.floating.shadowOffset,
      elevation: theme.shadow.floating.elevation,
    },
    previewMedia: {
      width: "100%",
      height: "100%",
    },
    previewFallback: {
      width: "100%",
      height: "100%",
    },
    previewOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    storyProgressRow: {
      position: "absolute",
      top: 12,
      left: 12,
      right: 12,
      flexDirection: "row",
      gap: 8,
    },
    storyProgress: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
    },
    storyProgressActive: {
      backgroundColor: "#FFFFFF",
    },
    emptyPreviewCenter: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 12,
    },
    uploadOrb: {
      width: isCompactHeight ? 82 : 94,
      height: isCompactHeight ? 82 : 94,
      borderRadius: isCompactHeight ? 41 : 47,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: 10,
    },
    emptyPreviewTitle: {
      color: "#FFFFFF",
      fontFamily: "Manrope_700Bold",
      fontSize: isCompactHeight ? 22 : 24,
      lineHeight: isCompactHeight ? 28 : 30,
      textAlign: "center",
      letterSpacing: -0.7,
    },
    emptyPreviewSubtitle: {
      marginTop: 6,
      color: "rgba(255, 255, 255, 0.8)",
      fontFamily: "Manrope_600SemiBold",
      fontSize: 14,
      lineHeight: 19,
    },
    previewBadge: {
      position: "absolute",
      bottom: 12,
      alignSelf: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      overflow: "hidden",
    },
    previewBadgeText: {
      color: "#FFFFFF",
      fontFamily: "Manrope_600SemiBold",
      fontSize: 14,
      lineHeight: 20,
    },
    bottomSheet: {
      flexShrink: 0,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginHorizontal: 0,
      paddingTop: 8,
      paddingHorizontal: horizontalSheetPadding,
      paddingBottom: isCompactHeight ? 12 : 14,
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
    },
    handleWrap: {
      alignItems: "center",
      marginBottom: 7,
    },
    handle: {
      width: 56,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_800ExtraBold",
      fontSize: isCompactHeight ? 24 : 27,
      lineHeight: isCompactHeight ? 30 : 32,
      letterSpacing: -0.4,
    },
    subtitle: {
      marginTop: 4,
      marginBottom: 8,
      color: theme.colors.textSecondary,
      fontFamily: "Manrope_500Medium",
      fontSize: 13,
      lineHeight: 18,
    },
    segmentWrap: {
      position: "relative",
      flexDirection: "row",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 18,
      padding: 4,
      gap: 4,
      marginBottom: 8,
    },
    segmentIndicator: {
      position: "absolute",
      top: 4,
      left: 4,
      width: segmentIndicatorWidth,
      height: isCompactHeight ? 47 : 50,
      borderRadius: 15,
      shadowColor: theme.shadow.card.shadowColor,
      shadowOpacity: theme.shadow.card.shadowOpacity,
      shadowRadius: theme.shadow.card.shadowRadius,
      shadowOffset: theme.shadow.card.shadowOffset,
      elevation: theme.shadow.card.elevation,
    },
    segmentIndicatorGradient: {
      width: "100%",
      height: "100%",
      borderRadius: 15,
    },
    segment: {
      flex: 1,
      minHeight: isCompactHeight ? 47 : 50,
      borderRadius: 15,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      zIndex: 2,
    },
    segmentTitle: {
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_700Bold",
      fontSize: 14,
    },
    segmentTitleActive: {
      color: "#FFFFFF",
    },
    segmentSub: {
      fontFamily: "Manrope_500Medium",
      fontSize: 10,
      color: theme.colors.textTertiary,
      lineHeight: 15,
    },
    segmentSubActive: {
      color: "rgba(255, 255, 255, 0.9)",
    },
    captionCard: {
      borderWidth: 1,
      borderRadius: 18,
      borderColor: theme.isDark ? theme.colors.border : "rgba(148, 163, 184, 0.22)",
      backgroundColor: theme.isDark ? theme.colors.inputBackground : "#F8FAFC",
      padding: isCompactHeight ? 8 : 9,
      marginBottom: 8,
    },
    captionCardFocused: {
      borderColor: theme.colors.primaryMid,
      shadowColor: theme.shadow.card.shadowColor,
      shadowOpacity: theme.shadow.card.shadowOpacity,
      shadowRadius: theme.shadow.card.shadowRadius,
      shadowOffset: theme.shadow.card.shadowOffset,
      elevation: theme.shadow.card.elevation,
    },
    captionLabel: {
      fontFamily: "Manrope_800ExtraBold",
      fontSize: 12,
      color: theme.colors.textPrimary,
      letterSpacing: 0.9,
      marginBottom: 5,
    },
    captionInput: {
      minHeight: isCompactHeight ? 48 : 54,
      maxHeight: isCompactHeight ? 68 : 76,
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_500Medium",
      fontSize: 14,
      lineHeight: 19,
      textAlignVertical: "top",
    },
    captionFooter: {
      marginTop: 5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    captionTools: {
      flexDirection: "row",
      gap: 6,
    },
    captionToolButton: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    captionCounter: {
      color: theme.colors.textTertiary,
      fontFamily: "Manrope_600SemiBold",
      fontSize: 13,
    },
    chipRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
    },
    actionChip: {
      flex: 1,
      minHeight: isCompactHeight ? 36 : 39,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: theme.isDark ? theme.colors.border : "rgba(37, 99, 235, 0.16)",
      backgroundColor: theme.isDark ? theme.colors.surfaceMuted : "rgba(37, 99, 235, 0.05)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    actionChipText: {
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_600SemiBold",
      fontSize: 12,
    },
    repickButton: {
      minHeight: isCompactHeight ? 39 : 42,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.isDark ? theme.colors.border : "rgba(37, 99, 235, 0.2)",
      borderRadius: 16,
      backgroundColor: theme.isDark ? theme.colors.surfaceMuted : "rgba(37, 99, 235, 0.07)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 7,
    },
    repickPressed: {
      opacity: 0.9,
    },
    repickText: {
      color: theme.colors.textPrimary,
      fontFamily: "Manrope_700Bold",
      fontSize: 14,
    },
    publishWrap: {
      marginTop: 2,
    },
    publishPressed: {
      opacity: 0.95,
    },
    publishButton: {
      minHeight: isCompactHeight ? 46 : 50,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      shadowColor: theme.shadow.floating.shadowColor,
      shadowOpacity: theme.shadow.floating.shadowOpacity,
      shadowRadius: theme.shadow.floating.shadowRadius,
      shadowOffset: theme.shadow.floating.shadowOffset,
      elevation: theme.shadow.floating.elevation,
    },
    publishText: {
      color: "#FFFFFF",
      fontFamily: "Manrope_700Bold",
      fontSize: 15,
    },
  });
