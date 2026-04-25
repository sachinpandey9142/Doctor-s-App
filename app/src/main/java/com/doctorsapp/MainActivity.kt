package com.doctorsapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.doctorsapp.navigation.DoctorAppNavigation
import com.doctorsapp.navigation.Routes
import com.doctorsapp.ui.theme.DoctorsAppTheme
import com.doctorsapp.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import androidx.hilt.navigation.compose.hiltViewModel

/**
 * Main Activity - Entry point of the application
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DoctorsAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainContent()
                }
            }
        }
    }
}

/**
 * Main content composable with bottom navigation
 */
@Composable
fun MainContent(
    viewModel: AuthViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val currentUser by viewModel.currentUser.collectAsState()
    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStackEntry?.destination?.route

    // Check if we should show bottom navigation
    val shouldShowBottomNav = currentRoute !in listOf(
        Routes.LOGIN,
        Routes.SIGNUP
    ) && currentUser != null

    Box(modifier = Modifier.fillMaxSize()) {
        DoctorAppNavigation(
            navController = navController,
            isUserLoggedIn = currentUser != null,
            currentUserId = currentUser?.id ?: ""
        )

        // Bottom Navigation
        if (shouldShowBottomNav) {
            BottomNavigationBar(
                currentRoute = currentRoute,
                currentUserId = currentUser?.id ?: "",
                onNavigate = { route ->
                    navController.navigate(route) {
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                modifier = Modifier.align(androidx.compose.ui.Alignment.BottomCenter)
            )
        }
    }
}

/**
 * Bottom Navigation Bar
 */
@Composable
fun BottomNavigationBar(
    currentRoute: String?,
    currentUserId: String,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(modifier = modifier) {
        NavigationBarItem(
            icon = {
                Icon(
                    imageVector = Icons.Filled.Home,
                    contentDescription = "Home"
                )
            },
            label = { Text("Home") },
            selected = currentRoute == Routes.HOME,
            onClick = { onNavigate(Routes.HOME) }
        )

        NavigationBarItem(
            icon = {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = "Search"
                )
            },
            label = { Text("Search") },
            selected = currentRoute == Routes.SEARCH,
            onClick = { onNavigate(Routes.SEARCH) }
        )

        NavigationBarItem(
            icon = {
                Icon(
                    imageVector = Icons.Filled.AddCircle,
                    contentDescription = "Post"
                )
            },
            label = { Text("Post") },
            selected = currentRoute == Routes.CREATE_POST,
            onClick = { onNavigate(Routes.CREATE_POST) }
        )

        NavigationBarItem(
            icon = {
                Icon(
                    imageVector = Icons.Filled.Message,
                    contentDescription = "Chat"
                )
            },
            label = { Text("Chat") },
            selected = currentRoute == Routes.CHAT_LIST,
            onClick = { onNavigate(Routes.CHAT_LIST) }
        )

        NavigationBarItem(
            icon = {
                Icon(
                    imageVector = Icons.Filled.Person,
                    contentDescription = "Profile"
                )
            },
            label = { Text("Profile") },
            selected = currentRoute == Routes.PROFILE || (currentRoute?.startsWith("profile/") ?: false),
            onClick = {
                if (currentUserId.isNotBlank()) {
                    onNavigate(Routes.profile(currentUserId))
                }
            }
        )
    }
}
