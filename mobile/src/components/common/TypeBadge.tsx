import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FileText, Image, Stethoscope, Video } from "lucide-react-native";
import { useTheme } from "styled-components/native";

type PostType = "text" | "image" | "video" | "case";

interface TypeBadgeProps {
  type: PostType;
}

function TypeBadgeBase({ type }: TypeBadgeProps) {
  const theme = useTheme();

  const config: Record<
    PostType,
    { label: string; icon: React.ReactNode; bg: string; text: string }
  > = {
    text: {
      label: "Article",
      icon: <FileText size={11} color={theme.colors.badgeText} />,
      bg: theme.colors.badgeTextLight,
      text: theme.colors.badgeText
    },
    image: {
      label: "Image",
      icon: <Image size={11} color={theme.colors.badgeImage} />,
      bg: theme.colors.badgeImageLight,
      text: theme.colors.badgeImage
    },
    video: {
      label: "Video",
      icon: <Video size={11} color={theme.colors.badgeVideo} />,
      bg: theme.colors.badgeVideoLight,
      text: theme.colors.badgeVideo
    },
    case: {
      label: "Case",
      icon: <Stethoscope size={11} color={theme.colors.badgeCase} />,
      bg: theme.colors.badgeCaseLight,
      text: theme.colors.badgeCase
    }
  };

  const { label, icon, bg, text } = config[type] ?? config.text;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon}
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

export const TypeBadge = memo(TypeBadgeBase);

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10.5,
    letterSpacing: 0.2
  }
});
