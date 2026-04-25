import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Briefcase, Plus } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AnimatedButton } from "@/components/common/AnimatedButton";
import { EmptyState } from "@/components/common/EmptyState";
import { JobCard } from "@/components/jobs/JobCard";
import { useJobsStore } from "@/store/jobsStore";
import { hapticSuccess } from "@/utils/haptics";
import type { Job } from "@/types/models";

const filters = ["All", "Hospital", "Remote", "High Pay"] as const;
type FilterType = (typeof filters)[number];

export function JobsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { jobs, fetchJobs, applyToJob, createJob } = useJobsStore((state) => state);

  const [filter, setFilter] = useState<FilterType>("All");
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState("");
  const [hospital, setHospital] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = useMemo(() => {
    if (filter === "All") return jobs;
    if (filter === "Remote")
      return jobs.filter((job) => job.location.toLowerCase().includes("remote"));
    if (filter === "High Pay")
      return jobs.filter(
        (job) => /\d/.test(job.salary) && Number(job.salary.replace(/\D/g, "")) >= 90000
      );
    return jobs.filter((job) => job.hospital.length > 0);
  }, [filter, jobs]);

  const handleApply = async (jobId: string) => {
    await applyToJob(jobId);
    hapticSuccess();
  };

  const handleCreateJob = async () => {
    if (!title.trim() || !hospital.trim() || !location.trim() || !description.trim()) return;
    await createJob({ title, hospital, location, salary, description });
    setShowModal(false);
    setTitle("");
    setHospital("");
    setLocation("");
    setSalary("");
    setDescription("");
    hapticSuccess();
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Job; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 40).duration(280).springify()}>
        <JobCard job={item} onApply={handleApply} />
      </Animated.View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 14, borderBottomColor: theme.colors.borderLight }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Job Board</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {filteredJobs.length} {filteredJobs.length === 1 ? "opening" : "openings"}
            </Text>
          </View>

          <Pressable
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowModal(true)}
          >
            <Plus size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Filter chips — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersWrap}
          style={styles.filtersScroll}
        >
          {filters.map((filterItem) => {
            const active = filterItem === filter;
            return (
              <Pressable
                key={filterItem}
                onPress={() => setFilter(filterItem)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                    // Slight shadow on active chip
                    ...(active ? theme.shadow.card : {})
                  }
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? "#FFFFFF" : theme.colors.textSecondary }
                  ]}
                >
                  {filterItem}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Briefcase size={30} color={theme.colors.primary} />}
            title="No openings yet"
            body={
              filter !== "All"
                ? `No jobs match the "${filter}" filter. Try a different category.`
                : "Be the first to post a medical opportunity for your institution."
            }
            ctaLabel={filter !== "All" ? "Show All Jobs" : "Post a Job"}
            onCta={filter !== "All" ? () => setFilter("All") : () => setShowModal(true)}
          />
        }
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        removeClippedSubviews={Platform.OS === "android"}
      />

      {/* ── Create job modal ─────────────────────────────────────────── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Post a Job</Text>

            {(
              [
                { value: title, setter: setTitle, placeholder: "Job title" },
                { value: hospital, setter: setHospital, placeholder: "Hospital / Institution" },
                { value: location, setter: setLocation, placeholder: "Location or Remote" },
                { value: salary, setter: setSalary, placeholder: "Salary range (optional)" }
              ] as { value: string; setter: (v: string) => void; placeholder: string }[]
            ).map(({ value, setter, placeholder }) => (
              <TextInput
                key={placeholder}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.textTertiary}
                style={[
                  styles.modalInput,
                  { color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder }
                ]}
              />
            ))}

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Job description"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              style={[
                styles.modalInput,
                styles.modalInputLarge,
                { color: theme.colors.textPrimary, borderColor: theme.colors.cardBorder }
              ]}
            />

            <AnimatedButton title="Publish Job" onPress={handleCreateJob} />
            <AnimatedButton
              title="Cancel"
              variant="ghost"
              style={styles.modalCancel}
              onPress={() => setShowModal(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 0,
    borderBottomWidth: 1
  },
  headerTop: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 27 },
  subtitle: { marginTop: 3, fontFamily: "Manrope_500Medium", fontSize: 13 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4
  },
  filtersScroll: { paddingBottom: 10 },
  filtersWrap: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row"
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  filterText: { fontFamily: "Manrope_700Bold", fontSize: 12 },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 120
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)"
  },
  modalCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    borderWidth: 1,
    gap: 0
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    marginBottom: 14
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    marginBottom: 10,
    paddingHorizontal: 14,
    fontFamily: "Manrope_500Medium",
    fontSize: 15
  },
  modalInputLarge: {
    minHeight: 96,
    textAlignVertical: "top",
    paddingTop: 14
  },
  modalCancel: { marginTop: 10 }
});
