import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";
import type { MemoryCollection, MemoryItem } from "@/types/models";

interface CreateMemoryCollectionPayload {
  title: string;
  coverImage?: string;
  visibility?: "followers" | "public" | "private";
}

interface UpdateMemoryCollectionPayload {
  title?: string;
  coverImage?: string;
  visibility?: "followers" | "public" | "private";
}

interface CreateMemoryItemPayload {
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  storyId?: string | null;
}

interface UpdateMemoryItemPayload {
  caption?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  sortOrder?: number;
}

const unwrapData = <T>(response: { data: ApiResponse<T> | T }): T => {
  const payload = response.data as ApiResponse<T>;
  return (
    payload && typeof payload === "object" && "data" in payload
      ? payload.data
      : response.data
  ) as T;
};

export const getMemoryCollectionsRequest = async (
  userId: string,
): Promise<MemoryCollection[]> => {
  const response = await apiClient.get<ApiResponse<MemoryCollection[]>>(
    `/memories/user/${userId}`,
  );
  const collections = unwrapData(response);
  return Array.isArray(collections) ? collections : [];
};

export const createMemoryCollectionRequest = async (
  payload: CreateMemoryCollectionPayload,
): Promise<MemoryCollection> => {
  const response = await apiClient.post<ApiResponse<MemoryCollection>>(
    "/memories",
    payload,
  );
  return unwrapData(response);
};

export const updateMemoryCollectionRequest = async (
  collectionId: string,
  payload: UpdateMemoryCollectionPayload,
): Promise<MemoryCollection> => {
  const response = await apiClient.patch<ApiResponse<MemoryCollection>>(
    `/memories/${collectionId}`,
    payload,
  );
  return unwrapData(response);
};

export const deleteMemoryCollectionRequest = async (
  collectionId: string,
): Promise<void> => {
  await apiClient.delete(`/memories/${collectionId}`);
};

export const deleteMemoryItemRequest = async (
  itemId: string,
): Promise<void> => {
  await apiClient.delete(`/memories/items/${itemId}`);
};

export const getMemoryCollectionItemsRequest = async (
  collectionId: string,
): Promise<MemoryItem[]> => {
  const response = await apiClient.get<ApiResponse<MemoryItem[]>>(
    `/memories/${collectionId}/items`,
  );
  const items = unwrapData(response);
  return Array.isArray(items) ? items : [];
};

export const createMemoryItemRequest = async (
  collectionId: string,
  payload: CreateMemoryItemPayload,
): Promise<MemoryItem> => {
  const response = await apiClient.post<ApiResponse<MemoryItem>>(
    `/memories/${collectionId}/items`,
    payload,
  );
  return unwrapData(response);
};

export const saveStoryToMemoryRequest = async (
  collectionId: string,
  storyId: string,
): Promise<MemoryItem> => {
  const response = await apiClient.post<ApiResponse<MemoryItem>>(
    `/memories/${collectionId}/save-story`,
    { storyId },
  );
  return unwrapData(response);
};

export const updateMemoryItemRequest = async (
  itemId: string,
  payload: UpdateMemoryItemPayload,
): Promise<MemoryItem> => {
  const response = await apiClient.patch<ApiResponse<MemoryItem>>(
    `/memories/items/${itemId}`,
    payload,
  );
  return unwrapData(response);
};

export const reorderMemoryItemsRequest = async (
  collectionId: string,
  itemIds: string[],
): Promise<MemoryItem[]> => {
  const response = await apiClient.patch<ApiResponse<MemoryItem[]>>(
    `/memories/${collectionId}/items/reorder`,
    { itemIds },
  );
  const items = unwrapData(response);
  return Array.isArray(items) ? items : [];
};
