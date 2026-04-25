import { apiClient } from "./client";
import type { ApiResponse, PaginationMeta } from "@/types/api";
import type { NotificationItem } from "@/types/models";

interface NotificationsResponse {
  data: NotificationItem[];
  pagination?: PaginationMeta;
  unreadCount: number;
}

export const getNotificationsRequest = async (page = 1, limit = 25): Promise<NotificationsResponse> => {
  const response = await apiClient.get<
    ApiResponse<NotificationItem[]> & {
      meta?: {
        unreadCount?: number;
      };
    }
  >("/notifications", {
    params: { page, limit }
  });

  return {
    data: response.data.data,
    pagination: response.data.pagination,
    unreadCount: Number(response.data.meta?.unreadCount || 0)
  };
};

export const markNotificationAsReadRequest = async (notificationId: string): Promise<NotificationItem> => {
  const response = await apiClient.patch<ApiResponse<NotificationItem>>(
    `/notifications/${notificationId}/read`
  );

  return response.data.data;
};
