import { apiClient } from "./client";
import type { ApiResponse, PaginationMeta } from "@/types/api";
import type { Comment, Post } from "@/types/models";

interface FeedResponse {
  data: Post[];
  pagination?: PaginationMeta;
}

interface CreatePostPayload {
  content: string;
  mediaUrl?: string;
  type?: "text" | "image" | "video" | "case";
  symptoms?: string;
  observations?: string;
  reportImages?: string[];
  isAnonymous?: boolean;
}

export const createPostRequest = async (
  payload: CreatePostPayload,
): Promise<Post> => {
  const response = await apiClient.post<ApiResponse<Post>>("/posts", payload);
  return response.data.data;
};

export const getFeedPosts = async (
  page = 1,
  limit = 10,
): Promise<FeedResponse> => {
  const response = await apiClient.get<ApiResponse<Post[]>>("/posts", {
    params: { page, limit },
  });

  return {
    data: response.data.data,
    pagination: response.data.pagination,
  };
};

export const getCasePosts = async (
  page = 1,
  limit = 10,
): Promise<FeedResponse> => {
  const response = await apiClient.get<ApiResponse<Post[]>>("/posts/cases", {
    params: { page, limit },
  });

  return {
    data: response.data.data,
    pagination: response.data.pagination,
  };
};

export const likePostRequest = async (postId: string) => {
  const response = await apiClient.post<
    ApiResponse<{ postId: string; liked: boolean; likesCount: number }>
  >(`/posts/${postId}/like`);
  return response.data.data;
};

export const commentPostRequest = async (
  postId: string,
  text: string,
): Promise<Comment> => {
  const response = await apiClient.post<ApiResponse<Comment>>(
    `/posts/${postId}/comment`,
    { text },
  );
  return response.data.data;
};

export const commentPostReplyRequest = async (
  postId: string,
  text: string,
  parentCommentId: string,
): Promise<Comment> => {
  const response = await apiClient.post<ApiResponse<Comment>>(
    `/posts/${postId}/comment`,
    {
      text,
      parentCommentId,
    },
  );
  return response.data.data;
};

export const getPostCommentsRequest = async (
  postId: string,
): Promise<Comment[]> => {
  const response = await apiClient.get<ApiResponse<Comment[]>>(
    `/posts/${postId}/comments`,
  );
  return response.data.data;
};

export const likeCommentRequest = async (
  postId: string,
  commentId: string,
): Promise<{ commentId: string; liked: boolean; likesCount: number }> => {
  const response = await apiClient.post<
    ApiResponse<{ commentId: string; liked: boolean; likesCount: number }>
  >(`/posts/${postId}/comments/${commentId}/like`);
  return response.data.data;
};

export const reactCommentRequest = async (
  postId: string,
  commentId: string,
  reaction: string,
): Promise<{
  commentId: string;
  reaction: string | null;
  reactionCounts: Record<string, number>;
  totalReactions: number;
}> => {
  const response = await apiClient.post<
    ApiResponse<{
      commentId: string;
      reaction: string | null;
      reactionCounts: Record<string, number>;
      totalReactions: number;
    }>
  >(`/posts/${postId}/comments/${commentId}/react`, {
    reaction,
  });

  return response.data.data;
};

export const deletePostRequest = async (postId: string): Promise<void> => {
  await apiClient.delete(`/posts/${postId}`);
};
