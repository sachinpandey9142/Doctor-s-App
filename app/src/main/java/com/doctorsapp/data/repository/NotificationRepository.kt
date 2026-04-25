package com.doctorsapp.data.repository

import com.doctorsapp.data.model.Notification
import com.doctorsapp.data.network.ApiService
import com.doctorsapp.data.network.toReadableMessage
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for notification Firebase operations
 */
@Singleton
class NotificationRepository @Inject constructor(
    private val apiService: ApiService
) {

    /**
     * Create a notification
     */
    suspend fun createNotification(notification: Notification) {
        try {
            apiService.createNotification(notification)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to create notification"))
        }
    }

    /**
     * Get user's notifications
     */
    suspend fun getNotifications(userId: String, limit: Long = 50): List<Notification> {
        return try {
            apiService.getNotifications(userId, limit)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Mark notification as read
     */
    suspend fun markNotificationAsRead(notificationId: String) {
        try {
            apiService.markNotificationAsRead(notificationId)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to mark notification as read"))
        }
    }

    /**
     * Get unread notifications count
     */
    suspend fun getUnreadCount(userId: String): Int {
        return try {
            apiService.getUnreadCount(userId).count
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Delete a notification
     */
    suspend fun deleteNotification(notificationId: String) {
        try {
            apiService.deleteNotification(notificationId)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to delete notification"))
        }
    }
}
