import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";
import type { User } from "@/types/models";

export const getAdminUsersRequest = async (): Promise<User[]> => {
  const response = await apiClient.get<ApiResponse<User[]>>("/admin/users");
  return response.data.data;
};

export const verifyAdminUserRequest = async (id: string): Promise<User> => {
  const response = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}/verify`);
  return response.data.data;
};

export const blockAdminUserRequest = async (id: string): Promise<User> => {
  const response = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}/block`);
  return response.data.data;
};

export const unblockAdminUserRequest = async (id: string): Promise<User> => {
  const response = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}/unblock`);
  return response.data.data;
};

export const deleteAdminPostRequest = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/admin/posts/${id}`);
};

export interface OrganizationStat {
  _id: string; // hospital name
  count: number;
}

export const getOrganizationsRequest = async (): Promise<OrganizationStat[]> => {
  const response = await apiClient.get<ApiResponse<OrganizationStat[]>>("/admin/organizations");
  return response.data.data;
};
