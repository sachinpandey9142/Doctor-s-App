import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "styled-components/native";

import { VerifiedBadge } from "@/components/common/VerifiedBadge";

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
  verified?: boolean;
}

// 8 vibrant but not garish pastel backgrounds — deterministic by initial
const PALETTE = [
  { bg: "#DBEAFE", text: "#1D4ED8" }, // blue
  { bg: "#D1FAE5", text: "#065F46" }, // emerald
  { bg: "#EDE9FE", text: "#5B21B6" }, // violet
  { bg: "#FEE2E2", text: "#991B1B" }, // rose
  { bg: "#FEF3C7", text: "#92400E" }, // amber
  { bg: "#CFFAFE", text: "#164E63" }, // cyan
  { bg: "#FCE7F3", text: "#831843" }, // pink
  { bg: "#F1F5F9", text: "#334155" }  // slate
];

// A tiny blur hash placeholder so images feel instant on load
const BLUR_HASH = "LGFFaXYk^6#M@-5c,1J5@[or[Q6.";

export function Avatar({ name, uri, size = 44, verified = false }: AvatarProps) {
  const theme = useTheme();

  const initials = useMemo(() => {
    const words = (name || "M").split(" ").filter(Boolean);
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
  }, [name]);

  const colorEntry = PALETTE[initials.charCodeAt(0) % PALETTE.length];

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
              borderColor: theme.colors.primary
            }
          ]}
        />
      ) : null}

      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          placeholder={BLUR_HASH}
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colorEntry.bg
            }
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.34, color: colorEntry.text }]}>
            {initials}
          </Text>
        </View>
      )}

      {verified ? (
        <View style={[styles.badgeWrap, { left: size - 12, top: size - 14 }]}>
          <VerifiedBadge size={14} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  ring: {
    position: "absolute",
    borderWidth: 2
  },
  image: {
    backgroundColor: "#E2E8F0"
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  initials: {
    fontFamily: "SpaceGrotesk_700Bold"
  },
  badgeWrap: {
    position: "absolute"
  }
});
