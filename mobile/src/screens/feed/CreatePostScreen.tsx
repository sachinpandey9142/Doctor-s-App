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
import { CheckCircle, ImagePlus, XCircle } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

import { AnimatedButton } from "@/components/common/AnimatedButton";
import { GlassCard } from "@/components/common/GlassCard";
import { useFeedStore } from "@/store/feedStore";
import { uploadImageRequest } from "@/services/api/uploadApi";
import { hapticSuccess, hapticWarning } from "@/utils/haptics";

type PostTag = "text" | "image" | "video" | "case";

const tags: PostTag[] = ["text", "image", "video", "case"];

export function CreatePostScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const createPost = useFeedStore((state) => state.createPost);

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostTag>("text");
  // localMediaUri holds the local file:// URI for preview only
  const [localMediaUri, setLocalMediaUri] = useState("");
  // uploadedMediaUrl holds the Cloudinary URL returned after upload
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [observations, setObservations] = useState("");
  const [anonymousCase, setAnonymousCase] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!content.trim()) {
      return false;
    }
    if (postType === "case") {
      return !!symptoms.trim() && !!observations.trim();
    }
    return true;
  }, [content, observations, postType, symptoms]);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      hapticWarning();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true
    });

    if (!result.canceled && result.assets?.length) {
      const uri = result.assets[0].uri;
      setLocalMediaUri(uri);
      setUploadedMediaUrl(""); // reset any previous upload

      // Upload immediately so the user doesn't wait at submit time
      setUploading(true);
      try {
        const cloudUrl = await uploadImageRequest(uri);
        setUploadedMediaUrl(cloudUrl);
        hapticSuccess();
      } catch {
        // If upload fails, clear selection so user doesn't get a broken post
        setLocalMediaUri("");
        setUploadedMediaUrl("");
        hapticWarning();
      } finally {
        setUploading(false);
      }
    }
  };

  const clearMedia = () => {
    setLocalMediaUri("");
    setUploadedMediaUrl("");
  };

  const submitPost = async () => {
    if (!canSubmit) {
      hapticWarning();
      return;
    }

    // Block submission if the user selected an image but upload hasn't finished
    if (localMediaUri && !uploadedMediaUrl && !uploading) {
      hapticWarning();
      return;
    }

    try {
      setLoading(true);
      await createPost({
        content,
        mediaUrl: uploadedMediaUrl, // Cloudinary URL, or "" if no image
        type: postType,
        symptoms,
        observations,
        isAnonymous: anonymousCase,
        reportImages: uploadedMediaUrl ? [uploadedMediaUrl] : []
      });

      hapticSuccess();
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const mediaButtonLabel = () => {
    if (uploading) {
      return "Uploading image...";
    }
    if (uploadedMediaUrl) {
      return "Image uploaded ✓";
    }
    if (localMediaUri) {
      return "Upload in progress";
    }
    return "Attach image";
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <GlassCard >
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Share with your medical network</Text>

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What are you learning, observing, or discussing today?"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            style={[styles.textArea, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
          />

          <View style={styles.tagRow}>
            {tags.map((tag) => {
              const active = tag === postType;

              return (
                <Pressable
                  key={tag}
                  onPress={() => setPostType(tag)}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: active ? theme.colors.primary : "rgba(255,255,255,0.75)",
                      borderColor: active ? theme.colors.primary : theme.colors.border
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      {
                        color: active ? "#FFFFFF" : theme.colors.textPrimary
                      }
                    ]}
                  >
                    #{tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Image picker + upload status */}
          <Pressable
            style={[styles.mediaPicker, { borderColor: uploadedMediaUrl ? theme.colors.success : theme.colors.border }]}
            onPress={uploading ? undefined : pickMedia}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : uploadedMediaUrl ? (
              <CheckCircle size={18} color={theme.colors.success} />
            ) : (
              <ImagePlus size={18} color={theme.colors.primary} />
            )}
            <Text style={[styles.mediaText, { color: theme.colors.textSecondary }]}>
              {mediaButtonLabel()}
            </Text>
          </Pressable>

          {/* Image preview with remove button */}
          {localMediaUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: localMediaUri }} style={styles.previewImage} contentFit="cover" />
              {!uploading && (
                <Pressable onPress={clearMedia} style={styles.removeImageButton}>
                  <XCircle size={22} color={theme.colors.error} />
                </Pressable>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.uploadingText}>Uploading to cloud...</Text>
                </View>
              )}
            </View>
          ) : null}

          {postType === "case" ? (
            <View style={styles.caseWrap}>
              <Text style={[styles.caseTitle, { color: theme.colors.primary }]}>Case Details</Text>

              <TextInput
                value={symptoms}
                onChangeText={setSymptoms}
                placeholder="Symptoms"
                placeholderTextColor={theme.colors.textSecondary}
                style={[styles.caseInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
              />

              <TextInput
                value={observations}
                onChangeText={setObservations}
                placeholder="Observations"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                style={[
                  styles.caseInput,
                  styles.caseInputLarge,
                  { borderColor: theme.colors.border, color: theme.colors.textPrimary }
                ]}
              />

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.colors.textSecondary }]}>Post anonymously</Text>
                <Switch value={anonymousCase} onValueChange={setAnonymousCase} trackColor={{ true: theme.colors.primary }} />
              </View>
            </View>
          ) : null}

          <AnimatedButton
            title="Publish"
            loading={loading || uploading}
            disabled={!canSubmit || uploading || (!!localMediaUri && !uploadedMediaUrl)}
            onPress={submitPost}
            style={styles.publishButton}
          />
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    marginBottom: 14
  },
  textArea: {
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    textAlignVertical: "top",
    fontFamily: "Manrope_500Medium"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tagText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12
  },
  mediaPicker: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  mediaText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  },
  previewWrap: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    height: 200
  },
  previewImage: {
    width: "100%",
    height: "100%"
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    padding: 2
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  uploadingText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  },
  caseWrap: {
    marginTop: 16,
    gap: 10
  },
  caseTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15
  },
  caseInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 46,
    paddingHorizontal: 12,
    fontFamily: "Manrope_500Medium"
  },
  caseInputLarge: {
    minHeight: 90,
    textAlignVertical: "top",
    paddingTop: 12
  },
  switchRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  switchLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  },
  publishButton: {
    marginTop: 18
  }
});
