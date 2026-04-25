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
 * ViewModel for search and discovery
 */
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _searchResults = MutableStateFlow<List<User>>(emptyList())
    val searchResults: StateFlow<List<User>> = _searchResults.asStateFlow()

    private val _suggestedUsers = MutableStateFlow<List<User>>(emptyList())
    val suggestedUsers: StateFlow<List<User>> = _suggestedUsers.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadSuggestedUsers()
    }

    /**
     * Search users by query
     */
    fun searchUsers(query: String) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                if (query.isBlank()) {
                    _searchResults.value = emptyList()
                } else {
                    val results = userRepository.searchUsers(query)
                    _searchResults.value = results
                }
                _error.value = null
            } catch (e: Exception) {
                _error.value = e.message ?: "Error searching users"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Load suggested users
     */
    fun loadSuggestedUsers() {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                val suggested = userRepository.getSuggestedUsers()
                _suggestedUsers.value = suggested
                _error.value = null
            } catch (e: Exception) {
                _error.value = e.message ?: "Error loading suggestions"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Clear search
     */
    fun clearSearch() {
        _searchResults.value = emptyList()
    }
}
