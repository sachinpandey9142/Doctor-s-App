import { apiClient } from "./client";
import type { ApiResponse, PaginationMeta } from "@/types/api";
import type { Job } from "@/types/models";

interface JobsResponse {
  data: Job[];
  pagination?: PaginationMeta;
}

interface CreateJobPayload {
  title: string;
  hospital: string;
  location: string;
  salary?: string;
  description: string;
}

export const createJobRequest = async (payload: CreateJobPayload): Promise<Job> => {
  const response = await apiClient.post<ApiResponse<Job>>("/jobs", payload);
  return response.data.data;
};

export const getJobsRequest = async (page = 1, limit = 20): Promise<JobsResponse> => {
  const response = await apiClient.get<ApiResponse<Job[]>>("/jobs", {
    params: { page, limit }
  });

  return {
    data: response.data.data,
    pagination: response.data.pagination
  };
};

export const applyToJobRequest = async (jobId: string) => {
  const response = await apiClient.post<ApiResponse<{ message: string; jobId: string; applicantsCount: number }>>(
    `/jobs/${jobId}/apply`
  );

  return response.data.data;
};
