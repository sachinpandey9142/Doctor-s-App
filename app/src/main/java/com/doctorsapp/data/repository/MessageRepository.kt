package com.doctorsapp.data.repository

import com.doctorsapp.data.model.Message
import com.doctorsapp.data.model.ChatRoom
import com.doctorsapp.data.network.ApiService
import com.doctorsapp.data.network.MarkChatAsReadRequest
import com.doctorsapp.data.network.toReadableMessage
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for messaging/chat Firebase operations
 */
@Singleton
class MessageRepository @Inject constructor(
    private val apiService: ApiService
) {

    /**
     * Send a message
     */
    suspend fun sendMessage(message: Message): String {
        return try {
            apiService.sendMessage(message).id
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to send message"))
        }
    }

    /**
     * Get messages between two users
     */
    suspend fun getMessages(userId1: String, userId2: String, limit: Long = 50): List<Message> {
        return try {
            apiService.getMessages(userId1, userId2, limit)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Get chat rooms for a user
     */
    suspend fun getChatRooms(userId: String): List<ChatRoom> {
        return try {
            apiService.getChatRooms(userId)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Mark message as read
     */
    suspend fun markAsRead(messageId: String) {
        try {
            apiService.markMessageAsRead(messageId)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to mark message as read"))
        }
    }

    /**
     * Mark all messages as read in a chat room
     */
    suspend fun markChatRoomAsRead(userId1: String, userId2: String, currentUserId: String) {
        try {
            apiService.markChatRoomAsRead(
                MarkChatAsReadRequest(
                    userId1 = userId1,
                    userId2 = userId2,
                    currentUserId = currentUserId
                )
            )
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to mark chat as read"))
        }
    }

    /**
     * Delete a message
     */
    suspend fun deleteMessage(messageId: String) {
        try {
            apiService.deleteMessage(messageId)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to delete message"))
        }
    }
}
