package com.doctorsapp.data.repository

import com.doctorsapp.data.model.User
import com.doctorsapp.data.network.ApiService
import com.doctorsapp.data.network.SessionManager
import com.doctorsapp.data.network.toReadableMessage
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for user-related Firebase operations
 */
@Singleton
class UserRepository @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) {

    /**
     * Create a new user in Firestore
     */
    suspend fun createUser(user: User) {
        try {
            apiService.createUser(user)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to create user profile"))
        }
    }

    /**
     * Get current user
     */
    suspend fun getCurrentUser(): User? {
        return try {
            if (!sessionManager.isLoggedIn()) {
                null
            } else {
                apiService.getMyUser()
            }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Get user by ID
     */
    suspend fun getUserById(userId: String): User? {
        return try {
            apiService.getUserById(userId)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Update user profile
     */
    suspend fun updateUserProfile(userId: String, updates: Map<String, Any>) {
        try {
            apiService.updateUserProfile(userId, updates)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to update profile"))
        }
    }

    /**
     * Search users by name or college
     */
    suspend fun searchUsers(query: String): List<User> {
        return try {
            apiService.searchUsers(query)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Get suggested users (not following)
     */
    suspend fun getSuggestedUsers(limit: Long = 10): List<User> {
        return try {
            apiService.getSuggestedUsers(limit)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Follow a user
     */
    suspend fun followUser(userId: String, targetUserId: String) {
        try {
            val sessionUserId = sessionManager.getUserId()
            if (!sessionUserId.isNullOrBlank() && sessionUserId != userId) {
                throw Exception("Session user mismatch")
            }
            apiService.followUser(targetUserId)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to follow user"))
        }
    }

    /**
     * Unfollow a user
     */
    suspend fun unfollowUser(userId: String, targetUserId: String) {
        try {
            val sessionUserId = sessionManager.getUserId()
            if (!sessionUserId.isNullOrBlank() && sessionUserId != userId) {
                throw Exception("Session user mismatch")
            }
            apiService.unfollowUser(targetUserId)
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Unable to unfollow user"))
        }
    }

    /**
     * Get user's followers
     */
    suspend fun getFollowers(userId: String): List<User> {
        return try {
            apiService.getFollowers(userId)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Update last seen timestamp
     */
    suspend fun updateLastSeen(userId: String) {
        try {
            apiService.updateLastSeen(userId)
        } catch (e: Exception) {
            // Silently fail
        }
    }
}
