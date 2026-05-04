import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  MessageSquare,
  Share2,
  Stethoscope,
  Users
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Avatar } from "@/components/common/Avatar";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { hapticTap } from "@/utils/haptics";
import { formatRelativeTime } from "@/utils/date";
import type { Post } from "@/types/models";
import type { RootStackParamList } from "@/navigation/types";

type RouteParams = RouteProp<RootStackParamList, "CaseDetail">;

function InfoSection({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={secStyles.wrap}>
      <Text style={secStyles.label}>{label}</Text>
      <Text style={[secStyles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#9333EA",
    textTransform: "uppercase",
    marginBottom: 6
  },
  value: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24
  }
});

export function CaseDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();

  const { post } = route.params;
  const user = useAuthStore((s) => s.user);
  const joinCaseDiscussion = useChatStore((s) => s.joinCaseDiscussion);

  const [joining, setJoining] = useState(false);
  const [votedOption, setVotedOption] = useState<number | null>(null);

  // Demo vote counts — in a real app these come from the backend
  const [voteCounts, setVoteCounts] = useState([14, 8, 22, 5]);
  const DIAGNOSIS_OPTIONS = [
    "Bacterial Pneumonia",
    "Viral Infection (COVID-19)",
    "Atypical Pneumonia",
    "Pulmonary Embolism"
  ];
  const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

  const handleVote = (index: number) => {
    if (votedOption !== null) return;
    hapticTap();
    setVotedOption(index);
    setVoteCounts((prev) => prev.map((v, i) => i === index ? v + 1 : v));
  };

  const isAnonymous = post.isAnonymous && post.type === "case";
  const authorName = isAnonymous ? "Anonymous Case" : post.userId.name;
  const mediaUri = post.mediaUrl || post.reportImages?.[0];

  const handleDiscuss = async () => {
    hapticTap();
    setJoining(true);
    try {
      const conv = await joinCaseDiscussion(post._id);
      navigation.navigate("CaseDiscussionThread", {
        conversationId: conv._id,
        title: conv.title || "Case Discussion",
        caseAuthor: authorName,
        caseSnippet: post.content
      });
    } catch (e) {
      // handled by store toast
    } finally {
      setJoining(false);
    }
  };

  const handleShare = async () => {
    hapticTap();
    await Share.share({
      title: "Doctor's App Case",
      message: `${authorName} posted a clinical case:\n\n${post.content}`
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View
        style={[styles.topBar, { paddingTop: insets.top + 10, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.topBarTitle}>
          <View style={styles.topBadge}>
            <Stethoscope size={11} color="#7C3AED" />
            <Text style={styles.topBadgeText}>CLINICAL CASE</Text>
          </View>
        </View>
        <Pressable onPress={handleShare} hitSlop={12}>
          <Share2 size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
      >
        {/* Author */}
        <Animated.View entering={FadeInDown.duration(280).springify()} style={styles.authorCard}>
          <Avatar
            name={authorName}
            uri={isAnonymous ? "" : post.userId.profileImage}
            verified={post.userId.isVerified}
            size={46}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.authorName, { color: theme.colors.textPrimary }]}>{authorName}</Text>
            {!isAnonymous && (
              <Text style={[styles.authorMeta, { color: theme.colors.textSecondary }]}>
                {post.userId.role} · {formatRelativeTime(post.createdAt)}
              </Text>
            )}
            {isAnonymous && (
              <Text style={[styles.authorMeta, { color: theme.colors.textSecondary }]}>
                {formatRelativeTime(post.createdAt)}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Case Description */}
        {post.content ? (
          <Animated.View entering={FadeInDown.delay(60).duration(280).springify()} style={styles.descCard}>
            <Text style={[styles.descText, { color: theme.colors.textPrimary }]}>{post.content}</Text>
          </Animated.View>
        ) : null}

        {/* Media */}
        {mediaUri ? (
          <Animated.View entering={FadeInDown.delay(100).duration(300).springify()} style={styles.mediaWrap}>
            <Image source={{ uri: mediaUri }} style={styles.mediaImage} contentFit="cover" transition={350} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.3)"]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </Animated.View>
        ) : null}

        {/* Clinical Details */}
        <Animated.View entering={FadeInDown.delay(140).duration(280).springify()}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Stethoscope size={13} color="#7C3AED" />
            </View>
            <Text style={styles.sectionTitle}>Clinical Details</Text>
          </View>

          {post.symptoms ? (
            <InfoSection label="Symptoms" value={post.symptoms} />
          ) : (
            <View style={[secStyles.wrap, { opacity: 0.5 }]}>
              <Text style={secStyles.label}>SYMPTOMS</Text>
              <Text style={[secStyles.value, { color: "#94A3B8" }]}>No symptoms recorded</Text>
            </View>
          )}

          {post.observations ? (
            <InfoSection label="Clinical Observations" value={post.observations} />
          ) : (
            <View style={[secStyles.wrap, { opacity: 0.5 }]}>
              <Text style={secStyles.label}>OBSERVATIONS</Text>
              <Text style={[secStyles.value, { color: "#94A3B8" }]}>No observations recorded</Text>
            </View>
          )}
        </Animated.View>

        {/* Vote Diagnosis Poll */}
        <Animated.View entering={FadeInDown.delay(170).duration(280).springify()} style={[styles.pollCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <CheckCircle size={13} color="#2563EB" />
            </View>
            <Text style={styles.sectionTitle}>Vote Diagnosis</Text>
            {votedOption !== null ? (
              <View style={[styles.pollVotedBadge, { backgroundColor: "#EFF6FF" }]}>
                <Text style={[styles.pollVotedText, { color: "#2563EB" }]}>{totalVotes} votes</Text>
              </View>
            ) : (
              <Text style={[styles.pollHint, { color: theme.colors.textTertiary }]}>Tap to vote</Text>
            )}
          </View>
          {DIAGNOSIS_OPTIONS.map((option, i) => {
            const isVoted = votedOption === i;
            const pct = totalVotes > 0 ? Math.round((voteCounts[i] / totalVotes) * 100) : 0;
            return (
              <Pressable
                key={i}
                onPress={() => handleVote(i)}
                disabled={votedOption !== null}
                style={({ pressed }) => [
                  styles.pollOption,
                  { borderColor: isVoted ? "#2563EB" : theme.colors.border, backgroundColor: isVoted ? "#EFF6FF" : (pressed ? theme.colors.background : theme.colors.surface) }
                ]}
              >
                <View style={styles.pollOptionTop}>
                  <View style={[styles.pollDot, { borderColor: isVoted ? "#2563EB" : theme.colors.border, backgroundColor: isVoted ? "#2563EB" : "transparent" }]} />
                  <Text style={[styles.pollOptionText, { color: isVoted ? "#2563EB" : theme.colors.textPrimary }]} numberOfLines={1}>{option}</Text>
                  {votedOption !== null ? (
                    <Text style={[styles.pollPct, { color: isVoted ? "#2563EB" : theme.colors.textTertiary }]}>{pct}%</Text>
                  ) : null}
                </View>
                {votedOption !== null ? (
                  <View style={[styles.pollBarBg, { backgroundColor: theme.colors.border }]}>
                    <View style={[styles.pollBarFill, { width: `${pct}%`, backgroundColor: isVoted ? "#2563EB" : theme.colors.textTertiary }]} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Report Images */}
        {post.reportImages && post.reportImages.length > 1 ? (
          <Animated.View entering={FadeInDown.delay(180).duration(280).springify()}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Eye size={13} color="#7C3AED" />
              </View>
              <Text style={styles.sectionTitle}>Report Images</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {post.reportImages.map((uri, i) => (
                <View key={i} style={styles.reportImgWrap}>
                  <Image source={{ uri }} style={styles.reportImg} contentFit="cover" />
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* ── Bottom CTA ────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.colors.surface, borderTopColor: theme.colors.borderLight }]}>
        <Pressable
          style={[styles.discussCta, { opacity: joining ? 0.7 : 1 }]}
          onPress={() => void handleDiscuss()}
          disabled={joining}
        >
          <LinearGradient
            colors={["#7C3AED", "#6D28D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {joining ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Users size={18} color="#FFFFFF" />
                <Text style={styles.ctaText}>Join Case Discussion</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1
  },
  backBtn: { padding: 4 },
  topBarTitle: { flex: 1, alignItems: "center" },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  topBadgeText: { fontFamily: "Manrope_700Bold", fontSize: 10, letterSpacing: 1, color: "#7C3AED" },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  authorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1
  },
  authorName: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 15 },
  authorMeta: { fontFamily: "Manrope_500Medium", fontSize: 12.5, marginTop: 2 },
  descCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1
  },
  descText: { fontFamily: "Manrope_500Medium", fontSize: 15, lineHeight: 26 },
  mediaWrap: {
    borderRadius: 14,
    overflow: "hidden",
    height: 220,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  mediaImage: { width: "100%", height: "100%" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 4
  },
  sectionIconWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: "#EDE9FE",
    alignItems: "center", justifyContent: "center"
  },
  sectionTitle: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, color: "#0F172A" },
  reportImgWrap: { marginRight: 8, borderRadius: 10, overflow: "hidden" },
  reportImg: { width: 160, height: 120 },
  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1
  },
  discussCta: { borderRadius: 14, overflow: "hidden" },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15
  },
  ctaText: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, color: "#FFFFFF" },
  // Poll
  pollCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16
  },
  pollVotedBadge: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  pollVotedText: { fontFamily: "Manrope_700Bold", fontSize: 11 },
  pollHint: { fontFamily: "Manrope_500Medium", fontSize: 12, marginLeft: "auto" },
  pollOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  pollOptionTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  pollDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    flexShrink: 0
  },
  pollOptionText: { fontFamily: "Manrope_600SemiBold", fontSize: 13, flex: 1 },
  pollPct: { fontFamily: "Manrope_700Bold", fontSize: 12, flexShrink: 0 },
  pollBarBg: { height: 4, borderRadius: 2, marginTop: 8, overflow: "hidden" },
  pollBarFill: { height: "100%", borderRadius: 2 }
});
