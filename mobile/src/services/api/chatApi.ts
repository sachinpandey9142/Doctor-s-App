import { apiClient } from "./client";
import type { ApiResponse, PaginationMeta } from "@/types/api";
import type { Conversation, Message } from "@/types/models";

interface MessagesResponse {
  data: Message[];
  pagination?: PaginationMeta;
}

export const createConversationRequest = async (
  participantId: string,
): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>(
    "/conversations",
    {
      participantId,
    },
  );

  return response.data.data;
};

export const createGroupConversationRequest = async (payload: {
  name: string;
  memberIds: string[];
  image?: string;
}): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>(
    "/groups/create",
    payload,
  );
  return response.data.data;
};

export const getConversationRequest = async (
  conversationId: string,
): Promise<Conversation> => {
  const response = await apiClient.get<ApiResponse<Conversation>>(
    `/conversations/${conversationId}`,
  );
  return response.data.data;
};

export const joinCaseChatRequest = async (
  postId: string,
): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>(
    `/case/${postId}`,
  );
  return response.data.data;
};

export const getConversationsRequest = async (): Promise<Conversation[]> => {
  const response =
    await apiClient.get<ApiResponse<Conversation[]>>("/conversations");
  return response.data.data;
};

export const getMessagesRequest = async (
  conversationId: string,
  page = 1,
  limit = 40,
): Promise<MessagesResponse> => {
  const response = await apiClient.get<ApiResponse<Message[]>>(
    `/messages/${conversationId}`,
    {
      params: { page, limit },
    },
  );

  return {
    data: response.data.data,
    pagination: response.data.pagination,
  };
};

export const sendMessageRequest = async (payload: {
  conversationId: string;
  text?: string;
  mediaUrl?: string;
}): Promise<Message> => {
  const response = await apiClient.post<ApiResponse<Message>>(
    "/messages",
    payload,
  );
  return response.data.data;
};

export const renameGroupConversationRequest = async (
  groupId: string,
  payload: { name?: string; image?: string },
) => {
  const response = await apiClient.put<ApiResponse<Conversation>>(
    `/groups/${groupId}`,
    payload,
  );
  return response.data.data;
};

export const addGroupMembersRequest = async (
  groupId: string,
  memberIds: string[],
) => {
  const response = await apiClient.post<ApiResponse<Conversation>>(
    `/groups/${groupId}/members`,
    { memberIds },
  );
  return response.data.data;
};

export const removeGroupMemberRequest = async (
  groupId: string,
  memberId: string,
) => {
  const response = await apiClient.delete<
    ApiResponse<{ removedMemberId: string; conversation?: Conversation }>
  >(`/groups/${groupId}/members/${memberId}`);
  return response.data.data;
};

export const leaveGroupConversationRequest = async (groupId: string) => {
  const response = await apiClient.post<
    ApiResponse<{ left: boolean; deleted?: boolean }>
  >(`/groups/${groupId}/leave`);
  return response.data.data;
};

export const clearGroupChatRequest = async (groupId: string) => {
  const response = await apiClient.delete<ApiResponse<{ cleared: boolean }>>(
    `/groups/${groupId}/clear-chat`,
  );
  return response.data.data;
};
