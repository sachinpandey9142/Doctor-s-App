import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { ArrowLeft, Camera, Check, Eye, Globe, Video as VideoIcon } from "lucide-react-native";

import type { RootStackParamList } from "@/navigation/types";
import { uploadMediaRequest } from "@/services/api/uploadApi";
import { useStoryStore } from "@/store/storyStore";
import { hapticSuccess, hapticTap, hapticWarning } from "@/utils/haptics";

type StoryVisibility = "followers" | "public";

export function AddStoryScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const createStory = useStoryStore((state) => state.createStory);

  const [localUri, setLocalUri] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<StoryVisibility>("followers");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const canSubmit = useMemo(() => !!uploadedUrl && !uploading && !publishing, [publishing, uploading, uploadedUrl]);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      hapticWarning();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.9,
      allowsEditing: false,
      videoMaxDuration: 60
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

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
    } finally {
      setUploading(false);
    }
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
        visibility
      });
      hapticSuccess();
      navigation.goBack();
    } catch (_error) {
      hapticWarning();
    } finally {
      setPublishing(false);
    }
  };

  const preview = localUri ? (
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
      <Image source={{ uri: localUri }} style={styles.previewMedia} contentFit="cover" />
    )
  ) : (
    <View style={[styles.placeholder, { backgroundColor: theme.colors.backgroundAlt }]}>
      <Pressable style={styles.pickButton} onPress={pickMedia}>
        <LinearGradient colors={["#2563EB", "#06B6D4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pickGradient}>
          {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Camera size={22} color="#FFFFFF" />}
          <Text style={styles.pickText}>{uploading ? "Uploading media" : "Choose photo or video"}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <View style={styles.previewShell}>{preview}</View>

        <View style={[styles.topBar, { paddingTop: 16 }]}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.iconButton, { backgroundColor: "rgba(15,23,42,0.32)" }]}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.bottomSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Add story</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Share a quick update with followers or make it public.
            </Text>

            <View style={[styles.segmentWrap, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}>
              <Pressable
                onPress={() => setVisibility("followers")}
                style={[styles.segment, visibility === "followers" && { backgroundColor: theme.colors.primary }]}
              >
                <Eye size={15} color={visibility === "followers" ? "#FFFFFF" : theme.colors.textSecondary} />
                <Text style={[styles.segmentText, { color: visibility === "followers" ? "#FFFFFF" : theme.colors.textSecondary }]}>Followers</Text>
              </Pressable>
              <Pressable
                onPress={() => setVisibility("public")}
                style={[styles.segment, visibility === "public" && { backgroundColor: theme.colors.primary }]}
              >
                <Globe size={15} color={visibility === "public" ? "#FFFFFF" : theme.colors.textSecondary} />
                <Text style={[styles.segmentText, { color: visibility === "public" ? "#FFFFFF" : theme.colors.textSecondary }]}>Public</Text>
              </Pressable>
            </View>

            <View style={[styles.captionCard, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}>
              <Text style={[styles.captionLabel, { color: theme.colors.textSecondary }]}>Caption</Text>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a short note for your story"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                maxLength={500}
                style={[styles.captionInput, { color: theme.colors.textPrimary }]}
              />
            </View>

            <Pressable onPress={pickMedia} style={[styles.repickButton, { borderColor: theme.colors.border }]}>
              <VideoIcon size={16} color={theme.colors.primary} />
              <Text style={[styles.repickText, { color: theme.colors.textPrimary }]}>Change media</Text>
            </Pressable>
          </ScrollView>

          <Pressable disabled={!canSubmit} onPress={submitStory} style={({ pressed }) => [styles.publishWrap, { opacity: pressed || !canSubmit ? 0.9 : 1 }]}>
            <LinearGradient
              colors={canSubmit ? [theme.colors.primary, "#06B6D4"] : [theme.colors.border, theme.colors.border]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.publishButton}
            >
              {publishing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.publishText}>Post story</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  previewShell: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617"
  },
  previewMedia: {
    width: "100%",
    height: "100%"
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  pickButton: {
    overflow: "hidden",
    borderRadius: 18
  },
  pickGradient: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  pickText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 15
  },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  bottomSheet: {
    marginTop: "auto",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 18
  },
  sheetContent: {
    gap: 14,
    paddingBottom: 16
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    letterSpacing: -0.4
  },
  subtitle: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20
  },
  segmentWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 18,
    padding: 4,
    gap: 4
  },
  segment: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  segmentText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14
  },
  captionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8
  },
  captionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  captionInput: {
    minHeight: 72,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    textAlignVertical: "top"
  },
  repickButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  repickText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14
  },
  publishWrap: {
    marginTop: 2
  },
  publishButton: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  publishText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 15
  }
});