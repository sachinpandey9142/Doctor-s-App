import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";
import type { Post, User } from "@/types/models";
import type { PaginationMeta } from "@/types/api";

interface FollowStateResponse {
  viewer: User;
  target: User;
  following: boolean;
}

interface RemoveFollowerResponse {
  viewer: User;
  target: User;
  removedFollowerId: string;
}

export interface RelationListResponse {
  data: User[];
  pagination?: PaginationMeta;
  success: boolean;
  message?: string;
}

export const getUserProfile = async (userId: string): Promise<User> => {
  const response = await apiClient.get<ApiResponse<User>>(`/users/${userId}`);
  return response.data.data;
};

export const updateUserProfile = async (
  payload: Partial<User>,
): Promise<User> => {
  const response = await apiClient.put<ApiResponse<User>>(
    "/users/update",
    payload,
  );
  return response.data.data;
};

export const getUserPosts = async (userId: string): Promise<Post[]> => {
  const response = await apiClient.get<ApiResponse<Post[]>>(
    `/users/${userId}/posts`,
  );
  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const searchUsersRequest = async (
  query: string,
  limit = 12,
): Promise<User[]> => {
  const response = await apiClient.get<ApiResponse<User[]>>("/users/search", {
    params: { q: query, limit },
  });
  return response.data.data;
};

export const getSuggestedUsersRequest = async (limit = 10): Promise<User[]> => {
  const response = await apiClient.get<ApiResponse<User[]>>(
    "/users/suggested",
    {
      params: { limit },
    },
  );
  return response.data.data;
};

export const followUserRequest = async (
  targetUserId: string,
): Promise<FollowStateResponse> => {
  const response = await apiClient.post<ApiResponse<FollowStateResponse>>(
    `/users/${targetUserId}/follow`,
  );
  return response.data.data;
};

export const unfollowUserRequest = async (
  targetUserId: string,
): Promise<FollowStateResponse> => {
  const response = await apiClient.post<ApiResponse<FollowStateResponse>>(
    `/users/${targetUserId}/unfollow`,
  );
  return response.data.data;
};

export const getFollowersRequest = async (userId: string): Promise<User[]> => {
  const response = await apiClient.get<ApiResponse<User[]>>(
    `/users/${userId}/followers`,
  );
  return response.data.data;
};

export const getFollowingRequest = async (
  userId: string,
): Promise<RelationListResponse> => {
  const response = await apiClient.get<ApiResponse<User[]>>(
    `/users/${userId}/following`,
  );
  return response.data;
};

export const getFollowersPageRequest = async (
  userId: string,
  params?: { query?: string; page?: number; limit?: number },
): Promise<RelationListResponse> => {
  const response = await apiClient.get<ApiResponse<User[]>>(
    `/users/${userId}/followers`,
    {
      params,
    },
  );
  return response.data;
};

export const getFollowingPageRequest = async (
  userId: string,
  params?: { query?: string; page?: number; limit?: number },
): Promise<RelationListResponse> => {
  const response = await apiClient.get<ApiResponse<User[]>>(
    `/users/${userId}/following`,
    {
      params,
    },
  );
  return response.data;
};

export const removeFollowerRequest = async (
  targetUserId: string,
  followerId: string,
): Promise<RemoveFollowerResponse> => {
  const response = await apiClient.delete<ApiResponse<RemoveFollowerResponse>>(
    `/users/${targetUserId}/followers/${followerId}`,
  );

  return response.data.data;
};

export const blockUserRequest = async (userId: string): Promise<User> => {
  const response = await apiClient.put<ApiResponse<User>>(
    `/admin/users/${userId}/block`,
  );
  return response.data.data;
};
