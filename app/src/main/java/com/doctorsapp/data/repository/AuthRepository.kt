package com.doctorsapp.data.repository

import com.doctorsapp.data.network.ApiService
import com.doctorsapp.data.network.AuthRequest
import com.doctorsapp.data.network.ResetPasswordRequest
import com.doctorsapp.data.network.SessionManager
import com.doctorsapp.data.network.toReadableMessage
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for authentication operations
 */
@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) {

    /**
     * Register a new user with email and password
     */
    suspend fun registerUser(email: String, password: String): String {
        return try {
            val result = apiService.register(AuthRequest(email, password))
            sessionManager.saveSession(result.token, result.userId)
            result.userId
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("User registration failed"))
        }
    }

    /**
     * Login user
     */
    suspend fun loginUser(email: String, password: String): String {
        return try {
            val result = apiService.login(AuthRequest(email, password))
            sessionManager.saveSession(result.token, result.userId)
            result.userId
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Login failed"))
        }
    }

    /**
     * Logout user
     */
    fun logoutUser() {
        sessionManager.clearSession()
    }

    /**
     * Get current user ID
     */
    fun getCurrentUserId(): String? {
        return sessionManager.getUserId()
    }

    /**
     * Check if user is authenticated
     */
    fun isUserAuthenticated(): Boolean {
        return sessionManager.isLoggedIn()
    }

    /**
     * Reset password
     */
    suspend fun resetPassword(email: String) {
        try {
            apiService.resetPassword(ResetPasswordRequest(email))
        } catch (e: Exception) {
            throw Exception(e.toReadableMessage("Reset failed"))
        }
    }
}
