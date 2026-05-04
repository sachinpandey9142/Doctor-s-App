import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";
import type { Story, StoryGroup } from "@/types/models";

interface CreateStoryPayload {
  mediaUrl: string;
  type: "image" | "video";
  caption?: string;
  visibility?: "followers" | "public";
}

export const getStoryFeedRequest = async (limit = 40): Promise<StoryGroup[]> => {
  const response = await apiClient.get<ApiResponse<StoryGroup[]>>("/stories/feed", {
    params: { limit }
  });

  return response.data.data;
};

export const createStoryRequest = async (payload: CreateStoryPayload): Promise<Story> => {
  const response = await apiClient.post<ApiResponse<Story>>("/stories", payload);
  return response.data.data;
};

export const viewStoryRequest = async (storyId: string): Promise<Story> => {
  const response = await apiClient.post<ApiResponse<Story>>(`/stories/${storyId}/view`);
  return response.data.data;
};