package com.doctorsapp.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doctorsapp.data.model.User
import com.doctorsapp.data.model.UserRole
import com.doctorsapp.data.repository.AuthRepository
import com.doctorsapp.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for authentication
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    init {
        checkCurrentUser()
    }

    /**
     * Register new user
     */
    fun registerUser(
        email: String,
        password: String,
        name: String,
        role: String,
        college: String,
        year: String = ""
    ) {
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                val userId = authRepository.registerUser(email, password)
                
                val user = User(
                    id = userId,
                    name = name,
                    email = email,
                    role = role,
                    college = college,
                    year = year
                )
                userRepository.createUser(user)
                _currentUser.value = user
                _authState.value = AuthState.Success
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Registration failed")
            }
        }
    }

    /**
     * Login user
     */
    fun loginUser(email: String, password: String) {
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                authRepository.loginUser(email, password)
                val user = userRepository.getCurrentUser()
                _currentUser.value = user
                _authState.value = AuthState.Success
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Login failed")
            }
        }
    }

    /**
     * Check if user is currently logged in
     */
    private fun checkCurrentUser() {
        viewModelScope.launch {
            try {
                if (authRepository.isUserAuthenticated()) {
                    val user = userRepository.getCurrentUser()
                    _currentUser.value = user
                    _authState.value = AuthState.Success
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Error checking user")
            }
        }
    }

    /**
     * Logout user
     */
    fun logoutUser() {
        authRepository.logoutUser()
        _currentUser.value = null
        _authState.value = AuthState.Idle
    }

    /**
     * Reset password
     */
    fun resetPassword(email: String) {
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                authRepository.resetPassword(email)
                _authState.value = AuthState.Success
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Reset failed")
            }
        }
    }
}

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    object Success : AuthState()
    data class Error(val message: String) : AuthState()
}
