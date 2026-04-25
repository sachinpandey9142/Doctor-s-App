import { create } from "zustand";

import { applyToJobRequest, createJobRequest, getJobsRequest } from "@/services/api/jobApi";
import { useAuthStore } from "@/store/authStore";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
import type { Job } from "@/types/models";

interface JobsState {
  jobs: Job[];
  loading: boolean;
  fetchJobs: () => Promise<void>;
  createJob: (payload: {
    title: string;
    hospital: string;
    location: string;
    salary?: string;
    description: string;
  }) => Promise<void>;
  applyToJob: (jobId: string) => Promise<void>;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  loading: false,

  fetchJobs: async () => {
    set({ loading: true });

    try {
      const response = await getJobsRequest(1, 30);
      set({ jobs: response.data, loading: false });
    } catch (error) {
      set({ loading: false });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to load jobs"), "error");
    }
  },

  createJob: async (payload) => {
    // Let error bubble — screen handles inline feedback
    const created = await createJobRequest(payload);
    set((state) => ({ jobs: [created, ...state.jobs] }));
    useToastStore.getState().showToast("Job posted successfully!", "success");
  },

  applyToJob: async (jobId) => {
    const authUserId = useAuthStore.getState().user?._id || "self";

    try {
      await applyToJobRequest(jobId);

      set((state) => ({
        jobs: state.jobs.map((job) =>
          job._id === jobId
            ? {
                ...job,
                applicants: job.applicants.includes(authUserId)
                  ? job.applicants
                  : [...job.applicants, authUserId]
              }
            : job
        )
      }));

      useToastStore.getState().showToast("Application submitted!", "success");
    } catch (error) {
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to submit application"), "error");
    }
  }
}));
