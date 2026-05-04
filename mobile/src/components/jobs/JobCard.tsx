import React, { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Briefcase, MapPin, Users, DollarSign, Heart } from "lucide-react-native";
import { useTheme } from "styled-components/native";

import { AnimatedButton } from "@/components/common/AnimatedButton";
import { hapticTap } from "@/utils/haptics";
import type { Job } from "@/types/models";

interface JobCardProps {
  job: Job;
  onApply: (jobId: string) => void;
  isApplied?: boolean;
}

function JobCardBase({ job, onApply, isApplied = false }: JobCardProps) {
  const theme = useTheme();
  const [saved, setSaved] = useState(false);
  const applicantCount = job.applicants?.length ?? 0;

  const toggleSave = () => {
    hapticTap();
    setSaved((s) => !s);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
          <Briefcase size={20} color={theme.colors.primary} strokeWidth={1.8} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={[styles.hospital, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {job.hospital}
          </Text>
        </View>
        {job.salary ? (
          <View style={[styles.salaryBadge, { backgroundColor: "#CCFBF1" }]}>
            <DollarSign size={10} color="#0D9488" strokeWidth={2.5} />
            <Text style={[styles.salaryText, { color: "#0D9488" }]}>{job.salary}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Description ──────────────────────────────────── */}
      <Text numberOfLines={3} style={[styles.description, { color: theme.colors.textSecondary }]}>
        {job.description}
      </Text>

      {/* ── Meta row ─────────────────────────────────────── */}
      <View style={[styles.metaRow, { borderTopColor: theme.colors.borderLight }]}>
        <View style={styles.metaItem}>
          <MapPin size={12} color={theme.colors.textTertiary} strokeWidth={1.8} />
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {job.location}
          </Text>
        </View>
        <View style={[styles.metaDot, { backgroundColor: theme.colors.borderLight }]} />
        <View style={styles.metaItem}>
          <Users size={12} color={theme.colors.textTertiary} strokeWidth={1.8} />
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            {applicantCount} {applicantCount === 1 ? "applicant" : "applicants"}
          </Text>
        </View>
      </View>

      {/* ── Actions ──────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {isApplied ? (
            <View style={[styles.appliedBtn, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border, flex: 1 }]}>
              <Text style={[styles.appliedText, { color: theme.colors.textSecondary }]}>✓ Applied</Text>
            </View>
          ) : (
            <AnimatedButton
              title="Apply Now"
              onPress={() => onApply(job._id)}
              style={styles.applyBtn}
            />
          )}

          {/* Save / Bookmark */}
          <Pressable
            onPress={toggleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: saved ? "#FEF2F2" : theme.colors.background,
                borderColor: saved ? "#FECACA" : theme.colors.border,
                opacity: pressed ? 0.8 : 1
              }
            ]}
          >
            <Heart
              size={18}
              color={saved ? "#EF4444" : theme.colors.textTertiary}
              fill={saved ? "#EF4444" : "transparent"}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const JobCard = memo(JobCardBase);

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    paddingBottom: 10
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    lineHeight: 22
  },
  hospital: {
    marginTop: 3,
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  },
  salaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0
  },
  salaryText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 16,
    paddingBottom: 10
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  metaDot: { width: 4, height: 4, borderRadius: 2 },
  metaText: { fontFamily: "Manrope_500Medium", fontSize: 12 },
  footer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  applyBtn: { flex: 1 },
  appliedBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  appliedText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    letterSpacing: 0.1
  },
  saveBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  }
});
