import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Plus } from "lucide-react-native";
import { useTheme } from "styled-components/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedButton } from "@/components/common/AnimatedButton";
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
    if (filter === "All") {
      return jobs;
    }

    if (filter === "Remote") {
      return jobs.filter((job) => job.location.toLowerCase().includes("remote"));
    }

    if (filter === "High Pay") {
      return jobs.filter((job) => /\d/.test(job.salary) && Number(job.salary.replace(/\D/g, "")) >= 90000);
    }

    return jobs.filter((job) => job.hospital.length > 0);
  }, [filter, jobs]);

  const handleApply = async (jobId: string) => {
    await applyToJob(jobId);
    hapticSuccess();
  };

  const handleCreateJob = async () => {
    if (!title.trim() || !hospital.trim() || !location.trim() || !description.trim()) {
      return;
    }

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
    ({ item }: { item: Job }) => <JobCard job={item} onApply={handleApply} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with safe area top inset */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Medical Job Board</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Find trusted opportunities</Text>
        </View>

        <Pressable style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={() => setShowModal(true)}>
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.filtersWrap}>
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
                  borderColor: active ? theme.colors.primary : theme.colors.border
                }
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: active ? "#FFFFFF" : theme.colors.textSecondary
                  }
                ]}
              >
                {filterItem}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        // ─── Performance props ─────────────────────────────────────
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        removeClippedSubviews={Platform.OS === "android"}
      />

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Create Job Posting</Text>

            <TextInput value={title} onChangeText={setTitle} placeholder="Job title" style={[styles.modalInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} />
            <TextInput value={hospital} onChangeText={setHospital} placeholder="Hospital" style={[styles.modalInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} />
            <TextInput value={location} onChangeText={setLocation} placeholder="Location" style={[styles.modalInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} />
            <TextInput value={salary} onChangeText={setSalary} placeholder="Salary" style={[styles.modalInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              multiline
              style={[styles.modalInput, styles.modalInputLarge, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
            />

            <AnimatedButton title="Publish Job" onPress={handleCreateJob} />
            <AnimatedButton title="Cancel" variant="ghost" style={styles.modalCancel} onPress={() => setShowModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 25
  },
  subtitle: {
    marginTop: 4,
    fontFamily: "Manrope_500Medium",
    fontSize: 13
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  filtersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  filterText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.35)"
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    borderWidth: 1
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 19,
    marginBottom: 10
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    marginBottom: 10,
    paddingHorizontal: 12,
    fontFamily: "Manrope_500Medium"
  },
  modalInputLarge: {
    minHeight: 92,
    textAlignVertical: "top",
    paddingTop: 12
  },
  modalCancel: {
    marginTop: 10
  }
});
