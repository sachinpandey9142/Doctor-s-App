package com.doctorsapp.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doctorsapp.data.model.Post
import com.doctorsapp.data.repository.PostRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for home feed
 */
@HiltViewModel
class FeedViewModel @Inject constructor(
    private val postRepository: PostRepository
) : ViewModel() {

    private val _posts = MutableStateFlow<List<Post>>(emptyList())
    val posts: StateFlow<List<Post>> = _posts.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadPosts()
    }

    /**
     * Load posts for feed
     */
    fun loadPosts() {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                val posts = postRepository.getPosts()
                _posts.value = posts
                _error.value = null
            } catch (e: Exception) {
                _error.value = e.message ?: "Error loading posts"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Like a post
     */
    fun likePost(postId: String, userId: String) {
        viewModelScope.launch {
            try {
                postRepository.likePost(postId, userId)
                // Update local state
                _posts.value = _posts.value.map { post ->
                    if (post.id == postId) {
                        post.copy(
                            likes = if (userId in post.likes) post.likes else post.likes + userId
                        )
                    } else {
                        post
                    }
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Error liking post"
            }
        }
    }

    /**
     * Unlike a post
     */
    fun unlikePost(postId: String, userId: String) {
        viewModelScope.launch {
            try {
                postRepository.unlikePost(postId, userId)
                // Update local state
                _posts.value = _posts.value.map { post ->
                    if (post.id == postId) {
                        post.copy(
                            likes = if (userId in post.likes) post.likes - userId else post.likes
                        )
                    } else {
                        post
                    }
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Error unliking post"
            }
        }
    }

    /**
     * Refresh feed (pull to refresh)
     */
    fun refreshFeed() {
        loadPosts()
    }
}
