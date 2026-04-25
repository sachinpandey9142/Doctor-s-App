package com.doctorsapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.doctorsapp.data.model.User
import com.doctorsapp.ui.components.LoadingScreen
import com.doctorsapp.ui.components.PrimaryButton
import com.doctorsapp.ui.components.StatItem
import com.doctorsapp.viewmodel.ProfileViewModel

/**
 * Profile Screen
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun ProfileScreen(
    userId: String,
    isCurrentUser: Boolean = false,
    onNavigateBack: () -> Unit = {},
    onEditClick: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val user by if (isCurrentUser) {
        viewModel.currentUser
    } else {
        viewModel.selectedUser
    }.collectAsState()

    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(userId, isCurrentUser) {
        if (isCurrentUser) {
            viewModel.refreshCurrentUser()
        } else {
            viewModel.loadUserProfile(userId)
        }
    }

    if (isLoading) {
        LoadingScreen()
    } else if (user != null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Top AppBar
            TopAppBar(
                title = { Text(user!!.name) },
                navigationIcon = {
                    if (!isCurrentUser) {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
                actions = {
                    if (isCurrentUser) {
                        IconButton(onClick = onEditClick) {
                            Icon(Icons.Filled.Edit, contentDescription = "Edit Profile")
                        }
                    }
                }
            )

            // Profile content
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 56.dp),
                state = rememberLazyListState()
            ) {
                item {
                    // Profile Header
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Profile Image
                        AsyncImage(
                            model = user!!.profileImageUrl,
                            contentDescription = null,
                            modifier = Modifier
                                .size(120.dp)
                                .clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Name and Role
                        Text(
                            user!!.name,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            user!!.role,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary
                        )

                        // Verification Badge
                        if (user!!.isVerified) {
                            Row(
                                modifier = Modifier.padding(top = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    "Verified Medical Professional",
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(start = 4.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Bio
                        if (user!!.bio.isNotEmpty()) {
                            Text(
                                user!!.bio,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(horizontal = 8.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                        }

                        // Statistics
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            StatItem(label = "Followers", value = user!!.followers.size.toString())
                            StatItem(label = "Following", value = user!!.following.size.toString())
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Follow/Following Button
                        if (!isCurrentUser) {
                            PrimaryButton(
                                text = "Follow",
                                onClick = {
                                    viewModel.followUser(user!!.id)
                                }
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                        Divider()
                    }
                }

                // Posts section would go here
                item {
                    Text(
                        "Posts",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(16.dp)
                    )
                }

                items(5) { index ->
                    // Post item would be here
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .padding(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Post $index")
                        }
                    }
                }
            }
        }
    } else {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = error ?: "Profile is not available yet.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    if (isCurrentUser) {
                        viewModel.refreshCurrentUser()
                    } else {
                        viewModel.loadUserProfile(userId)
                    }
                }
            ) {
                Text("Retry")
            }

            if (!isCurrentUser) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(onClick = onNavigateBack) {
                    Text("Go Back")
                }
            }
        }
    }
}

/**
 * Edit Profile Screen
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun EditProfileScreen(
    onSave: () -> Unit,
    onCancel: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var qualification by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        TopAppBar(
            title = { Text("Edit Profile") }
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Name field
        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Name") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        )

        // Bio field
        OutlinedTextField(
            value = bio,
            onValueChange = { bio = it },
            label = { Text("Bio") },
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
                .padding(bottom = 16.dp),
            maxLines = 5
        )

        // Qualification field
        OutlinedTextField(
            value = qualification,
            onValueChange = { qualification = it },
            label = { Text("Qualification") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp)
        )

        Spacer(modifier = Modifier.weight(1f))

        // Save Button
        Button(
            onClick = onSave,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text("Save Changes", fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Cancel Button
        OutlinedButton(
            onClick = onCancel,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text("Cancel")
        }
    }
}
