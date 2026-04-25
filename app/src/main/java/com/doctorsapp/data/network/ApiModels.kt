package com.doctorsapp.data.network

data class AuthRequest(
    val email: String,
    val password: String
)

data class AuthResponse(
    val token: String,
    val userId: String
)

data class CurrentUserResponse(
    val userId: String
)

data class ResetPasswordRequest(
    val email: String
)

data class MessageResponse(
    val message: String = ""
)

data class UserActionRequest(
    val userId: String
)

data class MarkChatAsReadRequest(
    val userId1: String,
    val userId2: String,
    val currentUserId: String
)

data class UnreadCountResponse(
    val count: Int = 0
)

data class UploadImageResponse(
    val url: String
)
