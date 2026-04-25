package com.doctorsapp.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doctorsapp.data.model.Message
import com.doctorsapp.data.model.ChatRoom
import com.doctorsapp.data.repository.MessageRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for messaging/chat
 */
@HiltViewModel
class ChatViewModel @Inject constructor(
    private val messageRepository: MessageRepository
) : ViewModel() {

    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages.asStateFlow()

    private val _chatRooms = MutableStateFlow<List<ChatRoom>>(emptyList())
    val chatRooms: StateFlow<List<ChatRoom>> = _chatRooms.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    /**
     * Load chat rooms for user
     */
    fun loadChatRooms(userId: String) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                val rooms = messageRepository.getChatRooms(userId)
                _chatRooms.value = rooms
                _error.value = null
            } catch (e: Exception) {
                _error.value = e.message ?: "Error loading chats"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Load messages between two users
     */
    fun loadMessages(userId1: String, userId2: String) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                val msgs = messageRepository.getMessages(userId1, userId2)
                _messages.value = msgs
                
                // Mark messages as read
                messageRepository.markChatRoomAsRead(userId1, userId2, userId1)
                _error.value = null
            } catch (e: Exception) {
                _error.value = e.message ?: "Error loading messages"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Send a message
     */
    fun sendMessage(message: Message) {
        viewModelScope.launch {
            try {
                messageRepository.sendMessage(message)
                _messages.value = _messages.value + message
            } catch (e: Exception) {
                _error.value = e.message ?: "Error sending message"
            }
        }
    }

    /**
     * Clear error
     */
    fun clearError() {
        _error.value = null
    }
}
