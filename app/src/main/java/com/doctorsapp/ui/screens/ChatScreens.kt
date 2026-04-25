package com.doctorsapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.toSize
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.doctorsapp.data.model.Message
import com.doctorsapp.viewmodel.ChatViewModel

/**
 * Chat List Screen
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun ChatListScreen(
    currentUserId: String,
    onChatSelect: (String) -> Unit,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val chatRooms by viewModel.chatRooms.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(currentUserId) {
        viewModel.loadChatRooms(currentUserId)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = {
                Text(
                    "Messages",
                    fontWeight = FontWeight.Bold
                )
            },
            actions = {
                IconButton(onClick = { /* New message */ }) {
                    Icon(Icons.Filled.Edit, contentDescription = "New Message")
                }
            }
        )

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 56.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 56.dp)
            ) {
                items(chatRooms) { chatRoom ->
                    ChatRoomItem(
                        chatRoom = chatRoom,
                        onClick = {
                            val otherUserId = chatRoom.participants.first { it != currentUserId }
                            onChatSelect(otherUserId)
                        }
                    )
                }

                if (chatRooms.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "No conversations yet",
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Chat Room Item
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun ChatRoomItem(
    chatRoom: com.doctorsapp.data.model.ChatRoom,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = "", // User profile image would come from repo
            contentDescription = null,
            modifier = Modifier
                .size(50.dp)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 12.dp)
        ) {
            Text(
                "User Name", // Would be from data
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.labelMedium
            )
            Text(
                chatRoom.lastMessage,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1
            )
        }

        Column(
            horizontalAlignment = Alignment.End
        ) {
            Text(
                "2h", // Would be formatted from timestamp
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (chatRoom.unreadCount.isNotEmpty()) {
                Badge {
                    Text("${chatRoom.unreadCount.values.sum()}")
                }
            }
        }
    }
}

/**
 * Chat Detail Screen
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun ChatDetailScreen(
    otherUserId: String,
    currentUserId: String,
    otherUserName: String = "User",
    onBackClick: () -> Unit = {},
    viewModel: ChatViewModel = hiltViewModel()
) {
    val messages by viewModel.messages.collectAsState()
    var messageText by remember { mutableStateOf("") }

    LaunchedEffect(otherUserId) {
        viewModel.loadMessages(currentUserId, otherUserId)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top AppBar
        TopAppBar(
            title = { Text(otherUserName) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = { /* Call */ }) {
                    Icon(Icons.Filled.Call, contentDescription = "Call")
                }
            }
        )

        // Messages List
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(8.dp),
            reverseLayout = true
        ) {
            items(messages) { message ->
                MessageBubble(
                    message = message,
                    isFromCurrentUser = message.senderId == currentUserId
                )
            }
        }

        Divider()

        // Message Input
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = messageText,
                onValueChange = { messageText = it },
                placeholder = { Text("Type a message...") },
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 8.dp),
                shape = RoundedCornerShape(20.dp),
                maxLines = 3,
                singleLine = false
            )

            IconButton(
                onClick = {
                    if (messageText.isNotEmpty()) {
                        val message = Message(
                            senderId = currentUserId,
                            receiverId = otherUserId,
                            text = messageText
                        )
                        viewModel.sendMessage(message)
                        messageText = ""
                    }
                }
            ) {
                Icon(
                    Icons.Filled.Send,
                    contentDescription = "Send",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

/**
 * Message Bubble Component
 */
@Composable
fun MessageBubble(
    message: Message,
    isFromCurrentUser: Boolean
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalAlignment = if (isFromCurrentUser) Alignment.End else Alignment.Start
    ) {
        Card(
            modifier = Modifier
                .padding(horizontal = 8.dp, vertical = 4.dp)
                .widthIn(max = 250.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isFromCurrentUser) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.surfaceVariant
                }
            )
        ) {
            Text(
                message.text,
                modifier = Modifier.padding(12.dp),
                color = if (isFromCurrentUser) {
                    MaterialTheme.colorScheme.onPrimary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
