import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "styled-components/native";

import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { API_BASE_URL } from "@/constants/config";

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
  verified?: boolean;
  online?: boolean;
  loading?: boolean;
}

type AvatarLoadState = "idle" | "loading" | "loaded" | "error";

// 8 vibrant but not garish pastel backgrounds — deterministic by initial
const PALETTE = [
  { bg: "#DBEAFE", text: "#1D4ED8" }, // blue
  { bg: "#D1FAE5", text: "#065F46" }, // emerald
  { bg: "#EDE9FE", text: "#5B21B6" }, // violet
  { bg: "#FEE2E2", text: "#991B1B" }, // rose
  { bg: "#FEF3C7", text: "#92400E" }, // amber
  { bg: "#CFFAFE", text: "#164E63" }, // cyan
  { bg: "#FCE7F3", text: "#831843" }, // pink
  { bg: "#F1F5F9", text: "#334155" }, // slate
];

// A tiny blur hash placeholder so images feel instant on load
const BLUR_HASH = "LGFFaXYk^6#M@-5c,1J5@[or[Q6.";

// Global in-memory cache of loaded/error states across the entire app
const avatarLoadCache = new Map<string, Exclude<AvatarLoadState, "idle" | "loading">>();

const resolveAvatarUri = (value?: string): string => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // If it's already a full http/https URL, return it directly without re-encoding.
  // Re-encoding breaks S3/Firebase/Cloudinary signed URLs or storage paths.
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  const baseOrigin = API_BASE_URL.replace(/\/api$/, "").replace(/\/+$/, "");
  // If it's a relative path, ensure spaces are encoded if any
  const cleanPath = trimmed.replace(/\s+/g, "%20");
  if (cleanPath.startsWith("/")) {
    return `${baseOrigin}${cleanPath}`;
  }

  return `${baseOrigin}/${cleanPath}`;
};

function AvatarBase({
  name,
  uri,
  size = 44,
  verified = false,
  online = false,
  loading = false,
}: AvatarProps) {
  const theme = useTheme();
  const resolvedUri = useMemo(() => resolveAvatarUri(uri), [uri]);

  // Synchronous state management to prevent async race conditions / stale state in FlatLists
  const [state, setState] = useState(() => {
    const cached = resolvedUri ? avatarLoadCache.get(resolvedUri) : undefined;
    return {
      uri: resolvedUri,
      status: cached ?? (resolvedUri ? ("loading" as AvatarLoadState) : ("idle" as AvatarLoadState)),
      errorCount: 0,
    };
  });

  // Synchronous prop-change synchronization (React official pattern for derived state)
  if (state.uri !== resolvedUri) {
    const cached = resolvedUri ? avatarLoadCache.get(resolvedUri) : undefined;
    setState({
      uri: resolvedUri,
      status: cached ?? (resolvedUri ? "loading" : "idle"),
      errorCount: 0,
    });
  }

  const initials = useMemo(() => {
    const words = (name || "M").split(" ").filter(Boolean);
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
  }, [name]);

  const colorEntry = PALETTE[initials.charCodeAt(0) % PALETTE.length];

  // Intelligent error retry logic with exponential backoff
  const handleError = () => {
    if (!resolvedUri) return;
    if (state.errorCount < 2) {
      setTimeout(() => {
        setState((prev) =>
          prev.uri === resolvedUri
            ? { ...prev, errorCount: prev.errorCount + 1, status: "loading" }
            : prev,
        );
      }, 1000 * (state.errorCount + 1));
    } else {
      avatarLoadCache.set(resolvedUri, "error");
      setState((prev) => (prev.uri === resolvedUri ? { ...prev, status: "error" } : prev));
    }
  };

  const isLoaded = state.status === "loaded";
  const isLoading = state.status === "loading" || loading;
  const isError = state.status === "error";
  const isIdle = !resolvedUri || state.status === "idle";

  // Fallback initials appear ONLY if no image exists OR image fails permanently
  const showFallbackInitials = isIdle || isError;
  // Loading placeholder appears while image is loading
  const showLoadingPlaceholder = state.status === "loading" && !isLoaded;
  // Image component mounts if URI exists and hasn't permanently failed
  const showImage = Boolean(resolvedUri) && !isError;

  // Verified ring: 2px primary-colored border around the whole avatar
  const ringSize = size + (verified ? 4 : 0);

  return (
    <View style={[styles.wrapper, { width: ringSize, height: ringSize }]}>
      {/* Verified ring */}
      {verified ? (
        <View
          style={[
            styles.ring,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: theme.colors.primary,
            },
          ]}
        />
      ) : null}

      {/* Inner container for avatar content */}
      <View
        style={[
          styles.inner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colorEntry.bg,
          },
        ]}
      >
        {/* 1. Fallback Initials: ALWAYS rendered underneath the Image when applicable */}
        {showFallbackInitials || showLoadingPlaceholder ? (
          <View style={[StyleSheet.absoluteFill, styles.centerContainer]}>
            {showFallbackInitials ? (
              <Text
                style={[
                  styles.initials,
                  { fontSize: size * 0.38, color: colorEntry.text },
                ]}
              >
                {initials}
              </Text>
            ) : null}
            {showLoadingPlaceholder ? (
              <View style={[StyleSheet.absoluteFill, styles.centerContainer, styles.loadingBg]}>
                <ActivityIndicator size="small" color={colorEntry.text} />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 2. Expo Image: Rendered on top of the fallback initials */}
        {showImage ? (
          <Image
            source={{ uri: resolvedUri }}
            style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
            contentFit="cover"
            placeholder={BLUR_HASH}
            cachePolicy="memory-disk"
            recyclingKey={resolvedUri}
            transition={avatarLoadCache.get(resolvedUri) === "loaded" ? 0 : 150}
            onLoadStart={() => {
              if (state.status !== "loading" && state.status !== "loaded") {
                setState((prev) => (prev.uri === resolvedUri ? { ...prev, status: "loading" } : prev));
              }
            }}
            onLoad={() => {
              avatarLoadCache.set(resolvedUri, "loaded");
              setState((prev) => (prev.uri === resolvedUri ? { ...prev, status: "loaded" } : prev));
            }}
            onError={handleError}
          />
        ) : null}

        {/* 3. Explicit loading overlay (e.g. when uploading new avatar) */}
        {loading && isLoaded ? (
          <View style={[StyleSheet.absoluteFill, styles.centerContainer, styles.uploadingOverlay]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      {verified ? (
        <View style={[styles.badgeWrap, { left: size - 12, top: size - 14 }]}>
          <VerifiedBadge size={14} />
        </View>
      ) : null}

      {online ? (
        <View
          style={[
            styles.onlineDot,
            {
              width: Math.max(8, Math.round(size * 0.18)),
              height: Math.max(8, Math.round(size * 0.18)),
              borderRadius: size,
              left: 1,
              bottom: 1,
              borderColor: theme.colors.background,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export const Avatar = memo(AvatarBase, (prev, next) => (
  prev.name === next.name &&
  prev.uri === next.uri &&
  prev.size === next.size &&
  prev.verified === next.verified &&
  prev.online === next.online &&
  prev.loading === next.loading
));

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
  },
  inner: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
  loadingBg: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  uploadingOverlay: {
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  badgeWrap: {
    position: "absolute",
  },
  onlineDot: {
    position: "absolute",
    borderWidth: 2,
    backgroundColor: "#22C55E",
  },
});
