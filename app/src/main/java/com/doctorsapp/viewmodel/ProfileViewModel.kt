package com.doctorsapp.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doctorsapp.data.model.User
import com.doctorsapp.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for profile and user-related operations
 */
@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _selectedUser = MutableStateFlow<User?>(null)
    val selectedUser: StateFlow<User?> = _selectedUser.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        refreshCurrentUser()
    }

    /**
     * Load current user profile
     */
    fun refreshCurrentUser() {
        viewModelScope.launch {
            try {
                val user = userRepository.getCurrentUser()
                _currentUser.value = user
            } catch (e: Exception) {
                _error.value = e.message ?: "Error loading profile"
            }
        }
    }

    /**
     * Load specific user profile
     */
    fun loadUserProfile(userId: String) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                val user = userRepository.getUserById(userId)
                _selectedUser.value = user
                _error.value = null
            } catch (e: Exception) {
                _error.value = e.message ?: "Error loading user"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Update user profile
     */
    fun updateProfile(updates: Map<String, Any>) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                val userId = _currentUser.value?.id ?: return@launch
                userRepository.updateUserProfile(userId, updates)
                refreshCurrentUser()
                _error.value = null
            } catch (e: Exception) {
                _error.value = e.message ?: "Error updating profile"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Follow a user
     */
    fun followUser(targetUserId: String) {
        viewModelScope.launch {
            try {
                val userId = _currentUser.value?.id ?: return@launch
                userRepository.followUser(userId, targetUserId)
                
                // Update local state
                _currentUser.value = _currentUser.value?.copy(
                    following = _currentUser.value!!.following + targetUserId
                )
                _selectedUser.value = _selectedUser.value?.copy(
                    followers = _selectedUser.value!!.followers + userId
                )
            } catch (e: Exception) {
                _error.value = e.message ?: "Error following user"
            }
        }
    }

    /**
     * Unfollow a user
     */
    fun unfollowUser(targetUserId: String) {
        viewModelScope.launch {
            try {
                val userId = _currentUser.value?.id ?: return@launch
                userRepository.unfollowUser(userId, targetUserId)
                
                // Update local state
                _currentUser.value = _currentUser.value?.copy(
                    following = _currentUser.value!!.following - targetUserId
                )
                _selectedUser.value = _selectedUser.value?.copy(
                    followers = _selectedUser.value!!.followers - userId
                )
            } catch (e: Exception) {
                _error.value = e.message ?: "Error unfollowing user"
            }
        }
    }
}
