package com.doctorsapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.doctorsapp.ui.components.LoadingScreen
import com.doctorsapp.ui.components.UserCard
import com.doctorsapp.viewmodel.SearchViewModel

/**
 * Search Screen
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun SearchScreen(
    onUserClick: (String) -> Unit,
    viewModel: SearchViewModel = hiltViewModel()
) {
    val searchResults by viewModel.searchResults.collectAsState()
    val suggestedUsers by viewModel.suggestedUsers.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = {
                Text(
                    "Search & Discover",
                    fontWeight = FontWeight.Bold
                )
            }
        )

        // Search Bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { query ->
                searchQuery = query
                if (query.isNotEmpty()) {
                    viewModel.searchUsers(query)
                } else {
                    viewModel.clearSearch()
                }
            },
            placeholder = { Text("Search users by name...") },
            leadingIcon = {
                Icon(Icons.Filled.Search, contentDescription = null)
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = MaterialTheme.shapes.medium,
            singleLine = true
        )

        if (isLoading) {
            LoadingScreen()
        } else if (searchQuery.isNotEmpty()) {
            // Search Results
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 56.dp)
            ) {
                items(searchResults) { user ->
                    UserCard(
                        user = user,
                        onFollowClick = {
                            viewModel.loadSuggestedUsers()
                        },
                        onClick = {
                            onUserClick(user.id)
                        }
                    )
                }

                if (searchResults.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "No users found",
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        } else {
            // Suggested Users
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 56.dp)
            ) {
                item {
                    Text(
                        "Suggested For You",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(16.dp)
                    )
                }

                items(suggestedUsers) { user ->
                    UserCard(
                        user = user,
                        onFollowClick = {
                            viewModel.loadSuggestedUsers()
                        },
                        onClick = {
                            onUserClick(user.id)
                        }
                    )
                }

                if (suggestedUsers.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "No suggestions available",
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}
