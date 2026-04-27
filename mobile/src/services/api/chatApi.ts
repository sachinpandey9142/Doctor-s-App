import { apiClient } from "./client";
import type { ApiResponse, PaginationMeta } from "@/types/api";
import type { Conversation, Message } from "@/types/models";

interface MessagesResponse {
  data: Message[];
  pagination?: PaginationMeta;
}

export const createConversationRequest = async (participantId: string): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>("/conversations", {
    participantId
  });

  return response.data.data;
};

export const joinCaseChatRequest = async (postId: string): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>(`/case/${postId}`);
  return response.data.data;
};

export const getConversationsRequest = async (): Promise<Conversation[]> => {
  const response = await apiClient.get<ApiResponse<Conversation[]>>("/conversations");
  return response.data.data;
};

export const getMessagesRequest = async (
  conversationId: string,
  page = 1,
  limit = 40
): Promise<MessagesResponse> => {
  const response = await apiClient.get<ApiResponse<Message[]>>(`/messages/${conversationId}`, {
    params: { page, limit }
  });

  return {
    data: response.data.data,
    pagination: response.data.pagination
  };
};

export const sendMessageRequest = async (payload: {
  conversationId: string;
  text?: string;
  mediaUrl?: string;
}): Promise<Message> => {
  const response = await apiClient.post<ApiResponse<Message>>("/messages", payload);
  return response.data.data;
};
