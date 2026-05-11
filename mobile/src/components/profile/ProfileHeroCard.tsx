import React, { memo, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Camera, Settings2, Link2 } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { Avatar } from "@/components/common/Avatar";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import type { User } from "@/types/models";
import { ReputationCard } from "@/components/profile/ReputationCard";

interface ProfileHeroCardProps {
  user: User;
  isCurrentUser: boolean;
  coverImageUri?: string;
  reputationScore: number;
  bioExpanded: boolean;
  uploadingAvatar: boolean;
  uploadingCover: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onEditAvatar: () => void;
  onEditCover: () => void;
  onToggleBio: () => void;
}

function titleCaseRole(role: string) {
  return role
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildHeroIdentityLine(user: User) {
  const spec = user.specialization.trim();
  const hosp = user.hospital.trim();
  if (spec && hosp) return `${spec} · ${hosp}`;
  if (spec) return spec;
  if (hosp) return hosp;
  if (user.experience > 0) return `${user.experience} years of experience`;
  return titleCaseRole(user.role);
}

function buildHeroBio(user: User) {
  const bio = user.bio?.trim();
  return bio || "Building better healthcare, together.";
}

function buildLinkLine(user: User) {
  if (user.hospital?.trim()) {
    return user.hospital.trim().toLowerCase().replace(/\s+/g, "") + ".com";
  }
  return "doctorsapp.com";
}

/** ECG line drawn purely with View strips — no SVG dependency */
function EcgDecoration() {
  return (
    <View style={ecgStyles.root} pointerEvents="none">
      <View style={[ecgStyles.seg, { width: 18, top: 0 }]} />
      <View style={[ecgStyles.seg, { width: 8, top: -4, left: 18 }]} />
      <View style={[ecgStyles.seg, { width: 8, top: 0, left: 26 }]} />
      <View style={[ecgStyles.seg, { width: 6, top: -20, left: 34, height: 21 }]} />
      <View style={[ecgStyles.seg, { width: 6, top: 0, left: 40, height: 21, transform: [{ scaleY: -1 }] }]} />
      <View style={[ecgStyles.seg, { width: 8, top: -6, left: 46 }]} />
      <View style={[ecgStyles.seg, { width: 8, top: 0, left: 54 }]} />
      <View style={[ecgStyles.seg, { width: 28, top: 0, left: 62 }]} />
    </View>
  );
}

const ecgStyles = StyleSheet.create({
  root: {
    position: "absolute",
    right: 20,
    bottom: 18,
    width: 90,
    height: 30,
    opacity: 0.22,
  },
  seg: {
    position: "absolute",
    height: 1.5,
    backgroundColor: "#FFFFFF",
    top: 0,
    left: 0,
    borderRadius: 1,
  },
});

export const ProfileHeroCard = memo(function ProfileHeroCard({
  user,
  isCurrentUser,
  coverImageUri,
  reputationScore,
  bioExpanded,
  uploadingAvatar,
  uploadingCover,
  onBack,
  onOpenSettings,
  onEditAvatar,
  onEditCover,
  onToggleBio,
}: ProfileHeroCardProps) {
  const theme = useTheme();

  const heroIdentityLine = useMemo(() => buildHeroIdentityLine(user), [user]);
  const heroBio = useMemo(() => buildHeroBio(user), [user]);
  const linkLine = useMemo(() => buildLinkLine(user), [user]);
  const showBioToggle = Boolean(user.bio?.trim());

  // ── Avatar entrance animation ─────────────────────────────────────────────
  const avatarScale = useSharedValue(0.82);
  const avatarOpacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      avatarScale.value = withSpring(1, {
        damping: 16,
        stiffness: 180,
        mass: 0.8,
      });
      avatarOpacity.value = withTiming(1, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      });
    }, 80);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Avatar press feedback ─────────────────────────────────────────────────
  const avatarPressScale = useSharedValue(1);

  const avatarStyle = useAnimatedStyle(() => ({
    opacity: avatarOpacity.value,
    transform: [
      { scale: avatarScale.value * avatarPressScale.value },
    ],
  }));

  const handleAvatarPressIn = () => {
    avatarPressScale.value = withSpring(0.93, { damping: 14, stiffness: 300 });
  };
  const handleAvatarPressOut = () => {
    avatarPressScale.value = withSpring(1, { damping: 14, stiffness: 280 });
  };

  // ── Info block entrance ───────────────────────────────────────────────────
  const infoOpacity = useSharedValue(0);
  const infoTranslateY = useSharedValue(12);

  useEffect(() => {
    const timer = setTimeout(() => {
      infoOpacity.value = withTiming(1, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      });
      infoTranslateY.value = withTiming(0, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      });
    }, 160);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const infoStyle = useAnimatedStyle(() => ({
    opacity: infoOpacity.value,
    transform: [{ translateY: infoTranslateY.value }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.surface }]}>
      {/* ── BANNER ─────────────────────────────────────────────────────────── */}
      <View style={styles.coverShell}>
        {coverImageUri ? (
          <Image
            source={{ uri: coverImageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <LinearGradient
            colors={["#1B4FCC", "#1E6EB5", "#0EA5C2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        <EcgDecoration />

        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.12)"]}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Top controls */}
        <View style={styles.coverControls}>
          {!isCurrentUser ? (
            <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={10}>
              <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}

          {isCurrentUser && (
            <View style={styles.currentControls}>
              <Pressable
                onPress={onOpenSettings}
                style={styles.iconBtn}
                hitSlop={10}
              >
                <Settings2 size={17} color="#FFFFFF" strokeWidth={2.2} />
              </Pressable>

              <Pressable
                onPress={onEditCover}
                disabled={uploadingCover}
                style={({ pressed }) => [
                  styles.coverEditBtn,
                  pressed && !uploadingCover ? styles.coverEditPressed : null,
                ]}
              >
                {uploadingCover ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Camera size={12} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.coverEditText}>Edit</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* ── PROFILE COMPOSITION ROW ─────────────────────────────────────────── */}
      <View style={styles.compositionRow}>

        {/* Animated Avatar */}
        <Animated.View style={[styles.avatarStack, avatarStyle]}>
          <Pressable
            onPress={isCurrentUser ? onEditAvatar : undefined}
            onPressIn={handleAvatarPressIn}
            onPressOut={handleAvatarPressOut}
            disabled={uploadingAvatar && isCurrentUser}
          >
            <View
              style={[styles.avatarRing, { borderColor: theme.colors.surface }]}
            >
              <Avatar
                name={user.name}
                uri={user.profileImage}
                size={92}
                verified={false}
              />
            </View>

            {isCurrentUser && (
              <View
                style={[
                  styles.avatarEditBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera size={12} color="#FFFFFF" strokeWidth={2.5} />
                )}
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Animated info column */}
        <Animated.View style={[styles.infoColumn, infoStyle]}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.userName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {user.name}
            </Text>
            {user.isVerified && (
              <View style={styles.badgeWrap}>
                <VerifiedBadge size={15} />
              </View>
            )}
          </View>

          <Text
            style={[styles.roleText, { color: theme.colors.primary }]}
            numberOfLines={1}
          >
            {titleCaseRole(user.role)}
          </Text>

          <Text
            style={[styles.identityLine, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {heroIdentityLine}
          </Text>

          <Text
            style={[styles.bioText, { color: theme.colors.textSecondary }]}
            numberOfLines={bioExpanded ? undefined : 2}
          >
            {heroBio}
          </Text>

          {showBioToggle && (
            <Pressable onPress={onToggleBio} hitSlop={8}>
              <Text style={[styles.bioToggle, { color: theme.colors.primary }]}>
                {bioExpanded ? "View less" : "View more"}
              </Text>
            </Pressable>
          )}

          <View style={styles.linkRow}>
            <Link2 size={10} color={theme.colors.primary} strokeWidth={2.2} />
            <Text
              style={[styles.linkText, { color: theme.colors.primary }]}
              numberOfLines={1}
            >
              {linkLine}
            </Text>
          </View>
        </Animated.View>

        {/* Reputation widget */}
        <Animated.View style={[styles.reputationSlot, infoStyle]}>
          <ReputationCard score={reputationScore} />
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    marginHorizontal: 0,
    marginTop: 0,
  },

  /* ── BANNER ─────────────────────────────────────────────────────────────── */
  coverShell: {
    height: 110,
    overflow: "hidden",
    backgroundColor: "#1B4FCC",
  },
  coverControls: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  coverEditBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  coverEditPressed: { opacity: 0.72 },
  coverEditText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 0.2,
  },

  /* ── COMPOSITION ROW ────────────────────────────────────────────────────── */
  compositionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
    marginTop: -28,
  },

  /* Avatar */
  avatarStack: {
    position: "relative",
  },
  avatarRing: {
    borderWidth: 3,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarEditBtn: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },

  /* Info column */
  infoColumn: {
    flex: 1,
    marginTop: 32,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "nowrap",
  },
  badgeWrap: { marginTop: 1 },
  userName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  roleText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 1,
  },
  identityLine: {
    fontFamily: "Manrope_500Medium",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  bioText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
  },
  bioToggle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10.5,
    marginTop: 1,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  linkText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10.5,
    letterSpacing: 0.1,
  },

  /* Reputation slot */
  reputationSlot: {
    marginTop: 32,
    flexShrink: 0,
  },
});
