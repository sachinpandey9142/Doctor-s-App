package com.doctorsapp.data.model

/**
 * User model representing a medical professional or student
 */
data class User(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "", // MBBS Student, Doctor, Nurse, Medical Staff
    val college: String = "",
    val year: String = "", // For students
    val bio: String = "",
    val qualification: String = "",
    val profileImageUrl: String = "",
    val followers: List<String> = emptyList(),
    val following: List<String> = emptyList(),
    val isVerified: Boolean = false,
    val lastSeen: Long = 0,
    val createdAt: Long = 0
)

/**
 * Post model for home feed
 */
data class Post(
    val id: String = "",
    val userId: String = "",
    val userName: String = "",
    val userProfileImage: String = "",
    val imageUrl: String = "",
    val caption: String = "",
    val likes: List<String> = emptyList(),
    val commentsCount: Int = 0,
    val sharesCount: Int = 0,
    val timestamp: Long = 0
)

/**
 * Comment model for posts
 */
data class Comment(
    val id: String = "",
    val postId: String = "",
    val userId: String = "",
    val userName: String = "",
    val userProfileImage: String = "",
    val text: String = "",
    val likes: List<String> = emptyList(),
    val timestamp: Long = 0
)

/**
 * Message model for chat system
 */
data class Message(
    val id: String = "",
    val senderId: String = "",
    val receiverId: String = "",
    val text: String = "",
    val imageUrl: String = "",
    val isRead: Boolean = false,
    val timestamp: Long = 0
)

/**
 * Chat room for conversations
 */
data class ChatRoom(
    val id: String = "",
    val participants: List<String> = emptyList(),
    val lastMessage: String = "",
    val lastMessageTime: Long = 0,
    val unreadCount: Map<String, Int> = emptyMap()
)

/**
 * Notification model
 */
data class Notification(
    val id: String = "",
    val userId: String = "",
    val type: String = "", // like, comment, follow
    val triggerUserId: String = "",
    val triggerUserName: String = "",
    val postId: String = "",
    val message: String = "",
    val isRead: Boolean = false,
    val timestamp: Long = 0
)

/**
 * Enum for user roles
 */
enum class UserRole(val displayName: String) {
    MBBS_STUDENT("MBBS Student"),
    DOCTOR("Doctor"),
    NURSE("Nurse"),
    MEDICAL_STAFF("Medical Staff")
}

/**
 * Enum for notification types
 */
enum class NotificationType {
    LIKE,
    COMMENT,
    NEW_FOLLOWER
}
