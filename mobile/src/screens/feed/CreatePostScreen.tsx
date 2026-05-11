import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useTheme } from "styled-components/native";
import { ImagePlus, XCircle, PlayCircle, Video } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { GlassCard } from "@/components/common/GlassCard";
import { useFeedStore } from "@/store/feedStore";
import { uploadImageRequest } from "@/services/api/uploadApi";
import { hapticSuccess, hapticWarning, hapticTap } from "@/utils/haptics";

type PostTag = "text" | "image" | "video" | "case";
const tags: PostTag[] = ["text", "image", "video", "case"];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CreatePostScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const createPost = useFeedStore((state) => state.createPost);

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostTag>("text");
  
  const [localMediaUri, setLocalMediaUri] = useState("");
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const [symptoms, setSymptoms] = useState("");
  const [observations, setObservations] = useState("");
  const [notes, setNotes] = useState("");
  const [anonymousCase, setAnonymousCase] = useState(false);
  const [loading, setLoading] = useState(false);

  const buttonScale = useSharedValue(1);

  const canSubmit = useMemo(() => {
    if (!content.trim()) return false;
    if (postType === "case") return !!symptoms.trim() && !!observations.trim();
    if (postType === "image" || postType === "video") return !!localMediaUri || !!uploadedMediaUrl;
    return true;
  }, [content, observations, postType, symptoms, localMediaUri, uploadedMediaUrl]);

  const handlePostTypeChange = (tag: PostTag) => {
    hapticTap();
    setPostType(tag);
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      hapticWarning();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: postType === "video" ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true
    });

    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      setLocalMediaUri(uri);
      setUploadedMediaUrl("");
      setUploading(true);
      try {
        const cloudUrl = await uploadImageRequest(uri); 
        setUploadedMediaUrl(cloudUrl);
        hapticSuccess();
      } catch {
        setLocalMediaUri("");
        setUploadedMediaUrl("");
        hapticWarning();
      } finally {
        setUploading(false);
      }
    }
  };

  const clearMedia = () => {
    hapticTap();
    setLocalMediaUri("");
    setUploadedMediaUrl("");
  };

  const submitPost = async () => {
    if (!canSubmit) {
      hapticWarning();
      return;
    }
    if (localMediaUri && !uploadedMediaUrl && !uploading) {
      hapticWarning();
      return;
    }

    try {
      setLoading(true);
      const finalObservations = notes.trim() ? `${observations}\n\n**Notes / Advice:**\n${notes}` : observations;
      
      await createPost({
        content,
        mediaUrl: uploadedMediaUrl,
        type: postType,
        symptoms,
        observations: finalObservations,
        isAnonymous: anonymousCase,
        reportImages: uploadedMediaUrl ? [uploadedMediaUrl] : []
      });

      hapticSuccess();
      setContent("");
      setSymptoms("");
      setObservations("");
      setNotes("");
      clearMedia();
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const onPressIn = () => { buttonScale.value = withSpring(0.95); };
  const onPressOut = () => { buttonScale.value = withSpring(1); };
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.tabContainer}>
          {tags.map((tag) => {
            const active = tag === postType;
            return (
              <Pressable
                key={tag}
                onPress={() => handlePostTypeChange(tag)}
                style={[
                  styles.tabChip,
                  active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
              >
                <Text style={[styles.tabText, active && { color: theme.colors.textInverted }, !active && { color: theme.colors.textSecondary }]}>
                  {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <GlassCard padded={false} style={[styles.card, { borderColor: theme.colors.border }]}>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Share your knowledge..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            style={[styles.textArea, { color: theme.colors.textPrimary }]}
          />

          {(postType === "image" || postType === "video" || postType === "case") && !localMediaUri && (
            <Pressable
              style={[
                styles.mediaPickerDashed,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt }
              ]}
              onPress={uploading ? undefined : pickMedia}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  {postType === "video" ? <Video size={24} color={theme.colors.textSecondary} /> : <ImagePlus size={24} color={theme.colors.textSecondary} />}
                  <Text style={[styles.mediaText, { color: theme.colors.textSecondary }]}>
                    Add {postType === "video" ? "Video" : "Image"}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {localMediaUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: localMediaUri }} style={styles.previewImage} contentFit="cover" />
              {postType === "video" && (
                <View style={styles.videoOverlay}>
                  <PlayCircle size={48} color="#FFFFFF" opacity={0.8} />
                </View>
              )}
              {!uploading && (
                <Pressable onPress={clearMedia} style={styles.removeImageBadge}>
                  <XCircle size={28} color={theme.colors.error} fill="#FFFFFF" />
                </Pressable>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color={theme.colors.textInverted} />
                  <Text style={[styles.uploadingText, { color: theme.colors.textInverted }]}>Uploading to cloud...</Text>
                </View>
              )}
            </View>
          ) : null}

          {postType === "case" ? (
            <View style={styles.caseWrap}>
              <View style={[styles.caseInputCard, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}>
                <Text style={[styles.caseLabel, { color: theme.colors.textSecondary }]}>Symptoms</Text>
                <TextInput
                  value={symptoms}
                  onChangeText={setSymptoms}
                  placeholder="E.g., Fever, persistent cough"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  style={[styles.caseInput, { color: theme.colors.textPrimary }]}
                />
              </View>

              <View style={[styles.caseInputCard, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}>
                <Text style={[styles.caseLabel, { color: theme.colors.textSecondary }]}>Observations</Text>
                <TextInput
                  value={observations}
                  onChangeText={setObservations}
                  placeholder="E.g., Elevated HR, clear lungs"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  style={[styles.caseInput, { color: theme.colors.textPrimary, minHeight: 60 }]}
                />
              </View>

              <View style={[styles.caseInputCard, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}>
                <Text style={[styles.caseLabel, { color: theme.colors.textSecondary }]}>Notes / Advice</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional context or recommendations"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  style={[styles.caseInput, { color: theme.colors.textPrimary }]}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.colors.textSecondary }]}>Post anonymously</Text>
                <Switch value={anonymousCase} onValueChange={setAnonymousCase} trackColor={{ true: theme.colors.primary }} />
              </View>
            </View>
          ) : null}
        </GlassCard>
      </ScrollView>

      <View style={[styles.actionBar, { borderTopColor: theme.colors.borderLight, backgroundColor: theme.colors.background }]}>
        <AnimatedPressable
          onPress={submitPost}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={!canSubmit || uploading || (!!localMediaUri && !uploadedMediaUrl) || loading}
          style={[buttonAnimatedStyle, styles.publishBtnWrapper]}
        >
          <LinearGradient
            colors={
              (!canSubmit || uploading || (!!localMediaUri && !uploadedMediaUrl) || loading)
                ? [theme.colors.border, theme.colors.border]
                : theme.gradients.primary
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.publishGradient}
          >
            {loading || uploading ? (
              <ActivityIndicator color={theme.colors.textInverted} />
            ) : (
              <Text style={[styles.publishText, { color: theme.colors.textInverted }]}>Publish Post</Text>
            )}
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 110 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
    justifyContent: "space-between",
    borderWidth: 1,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent"
  },
  tabText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13
  },
  card: {
    padding: 16,
    borderRadius: 18
  },
  textArea: {
    minHeight: 120,
    fontSize: 17,
    textAlignVertical: "top",
    fontFamily: "Manrope_500Medium"
  },
  mediaPickerDashed: {
    marginTop: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 18,
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  mediaText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15
  },
  previewWrap: {
    marginTop: 16,
    borderRadius: 18,
    overflow: "hidden",
    height: 240,
    width: "100%",
    position: "relative"
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  removeImageBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center"
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  uploadingText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14
  },
  caseWrap: {
    marginTop: 16,
    gap: 12
  },
  caseInputCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12
  },
  caseLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4
  },
  caseInput: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    minHeight: 24,
    textAlignVertical: "top"
  },
  switchRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  switchLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    elevation: 12
  },
  publishBtnWrapper: {
    borderRadius: 18,
    overflow: "hidden"
  },
  publishGradient: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center"
  },
  publishText: {
    color: "#FFFFFF",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17
  }
});
