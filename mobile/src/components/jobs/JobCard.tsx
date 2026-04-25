import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Briefcase, MapPin, Users } from "lucide-react-native";
import { useTheme } from "styled-components/native";

import { GlassCard } from "@/components/common/GlassCard";
import { AnimatedButton } from "@/components/common/AnimatedButton";
import type { Job } from "@/types/models";

interface JobCardProps {
  job: Job;
  onApply: (jobId: string) => void;
}

function JobCardBase({ job, onApply }: JobCardProps) {
  const theme = useTheme();
  const applicantCount = job.applicants?.length ?? 0;

  return (
    <GlassCard style={styles.container} padded={false}>
      {/* ── Header: title + salary badge ───────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Hospital icon chip */}
          <View style={[styles.hospitalIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Briefcase size={18} color={theme.colors.primary} />
          </View>

          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {job.title}
            </Text>
            <Text style={[styles.hospital, { color: theme.colors.primary }]} numberOfLines={1}>
              {job.hospital}
            </Text>
          </View>
        </View>

        {/* Salary badge */}
        {job.salary ? (
          <View style={[styles.salaryBadge, { backgroundColor: theme.colors.successLight }]}>
            <Text style={[styles.salaryText, { color: theme.colors.success }]}>
              {job.salary}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Meta row: location + applicants ────────────────────────── */}
      <View style={[styles.metaRow, { borderTopColor: theme.colors.borderLight }]}>
        <View style={styles.metaItem}>
          <MapPin size={13} color={theme.colors.textTertiary} />
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {job.location}
          </Text>
        </View>

        <View style={[styles.metaDivider, { backgroundColor: theme.colors.borderLight }]} />

        <View style={styles.metaItem}>
          <Users size={13} color={theme.colors.textTertiary} />
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            {applicantCount} {applicantCount === 1 ? "applicant" : "applicants"}
          </Text>
        </View>
      </View>

      {/* ── Description ────────────────────────────────────────────── */}
      <View style={styles.descriptionWrap}>
        <Text numberOfLines={3} style={[styles.description, { color: theme.colors.textSecondary }]}>
          {job.description}
        </Text>
      </View>

      {/* ── Apply button ────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <AnimatedButton
          title={applicantCount > 0 && job.applicants?.includes("self") ? "Applied ✓" : "Apply Now"}
          onPress={() => onApply(job._id)}
          style={styles.applyButton}
        />
      </View>
    </GlassCard>
  );
}

export const JobCard = memo(JobCardBase);

const styles = StyleSheet.create({
  container: {
    marginBottom: 14
  },
  // ── Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    padding: 16,
    paddingBottom: 12
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1
  },
  hospitalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  headerText: {
    flex: 1
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    lineHeight: 22
  },
  hospital: {
    marginTop: 3,
    fontFamily: "Manrope_700Bold",
    fontSize: 13
  },
  salaryBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0
  },
  salaryText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 0.2
  },
  // ── Meta row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1
  },
  metaDivider: {
    width: 1,
    height: 14,
    marginHorizontal: 10
  },
  metaText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12
  },
  // ── Description
  descriptionWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4
  },
  description: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 21
  },
  // ── Footer
  footer: {
    padding: 16,
    paddingTop: 12
  },
  applyButton: {
    // Full width inside the card footer
  }
});
