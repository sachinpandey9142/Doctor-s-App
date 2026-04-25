import { create } from "zustand";

import { getNotificationsRequest, markNotificationAsReadRequest } from "@/services/api/notificationApi";
import { useToastStore, extractErrorMessage } from "@/store/toastStore";
import type { NotificationItem } from "@/types/models";

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });

    try {
      const response = await getNotificationsRequest(1, 40);
      set({
        notifications: response.data,
        unreadCount: response.unreadCount,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
      useToastStore.getState().showToast(extractErrorMessage(error, "Failed to load notifications"), "error");
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await markNotificationAsReadRequest(notificationId);

      set((state) => {
        const notifications = state.notifications.map((item) =>
          item._id === notificationId
            ? {
                ...item,
                isRead: true
              }
            : item
        );

        return {
          notifications,
          unreadCount: notifications.filter((item) => !item.isRead).length
        };
      });
    } catch (error) {
      // Non-critical — don't interrupt the user's navigation, just log silently
      // The notification will still appear as unread on next fetch
      useToastStore.getState().showToast(extractErrorMessage(error, "Could not mark notification as read"), "info");
    }
  }
}));
