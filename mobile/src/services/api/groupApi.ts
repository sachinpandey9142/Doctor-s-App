import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";
import type { Conversation } from "@/types/models";

export const createGroupRequest = async (payload: {
  groupName: string;
  groupImage?: string;
  memberIds: string[];
}): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>(
    "/groups/create",
    payload,
  );
  return response.data.data;
};

export const getGroupsRequest = async (): Promise<Conversation[]> => {
  const response = await apiClient.get<ApiResponse<Conversation[]>>("/groups");
  return response.data.data;
};

export const getGroupRequest = async (
  groupId: string,
): Promise<Conversation> => {
  const response = await apiClient.get<ApiResponse<Conversation>>(
    `/groups/${groupId}`,
  );
  return response.data.data;
};

export const renameGroupRequest = async (
  groupId: string,
  payload: { groupName: string; groupImage?: string },
): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>(
    `/groups/${groupId}/rename`,
    payload,
  );
  return response.data.data;
};

export const addGroupMembersRequest = async (
  groupId: string,
  memberIds: string[],
): Promise<Conversation> => {
  const response = await apiClient.post<ApiResponse<Conversation>>(
    `/groups/${groupId}/add-members`,
    { memberIds },
  );
  return response.data.data;
};

export const removeGroupMemberRequest = async (
  groupId: string,
  targetUserId: string,
): Promise<Conversation | null> => {
  const response = await apiClient.post<ApiResponse<Conversation | null>>(
    `/groups/${groupId}/remove-member`,
    { targetUserId },
  );
  return response.data.data;
};

export const leaveGroupRequest = async (
  groupId: string,
): Promise<{ left: boolean; deleted: boolean }> => {
  const response = await apiClient.post<
    ApiResponse<{ left: boolean; deleted: boolean }>
  >(`/groups/${groupId}/leave`);
  return response.data.data;
};

export const clearGroupChatRequest = async (
  groupId: string,
): Promise<{ clearedAt: string }> => {
  const response = await apiClient.delete<ApiResponse<{ clearedAt: string }>>(
    `/groups/${groupId}/clear-chat`,
  );
  return response.data.data;
};
