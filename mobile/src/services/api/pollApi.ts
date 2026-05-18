import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";
import type { DiagnosisPoll } from "@/types/models";

export const getPollRequest = async (postId: string): Promise<DiagnosisPoll> => {
  const response = await apiClient.get<ApiResponse<DiagnosisPoll>>(`/posts/${postId}/poll`);
  return response.data.data;
};

export const castVoteRequest = async (postId: string, optionId: string): Promise<DiagnosisPoll> => {
  const response = await apiClient.post<ApiResponse<DiagnosisPoll>>(`/posts/${postId}/poll/vote`, {
    optionId,
  });
  return response.data.data;
};
